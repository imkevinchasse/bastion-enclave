
package com.bastion.os

import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bastion.os.core.BastionCrypto
import com.bastion.os.model.*
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.UUID

// --- THEME CONSTANTS ---
val Slate950 = Color(0xFF020617)
val Slate900 = Color(0xFF0F172A)
val Slate800 = Color(0xFF1E293B)
val Slate700 = Color(0xFF334155)
val Slate400 = Color(0xFF94A3B8)
val Indigo500 = Color(0xFF6366F1)
val Emerald500 = Color(0xFF10B981)
val Red500 = Color(0xFFEF4444)
val Amber500 = Color(0xFFF59E0B)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BastionTheme {
                BastionApp()
            }
        }
    }
}

@Composable
fun BastionTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            background = Slate950,
            surface = Slate900,
            primary = Indigo500,
            onBackground = Color.White,
            onSurface = Color.White
        ),
        content = content
    )
}

// --- VIEW MODEL ---

class BastionViewModel : ViewModel() {
    private val gson = Gson()
    private val _state = MutableStateFlow<VaultState?>(null)
    val state = _state.asStateFlow()

    var pendingFileBytes: ByteArray? = null
    var pendingFileName: String = ""

    private var masterPassword = ""
    private var vaultFile: File? = null
    private var prefs: android.content.SharedPreferences? = null

    fun init(context: Context) {
        vaultFile = File(context.filesDir, "bastion_vault.enc")
        prefs = context.getSharedPreferences("bastion_secure_prefs", Context.MODE_PRIVATE)
    }

    fun hasLocalVault(): Boolean = vaultFile?.exists() == true
    
    fun hasQuickLogin(): Boolean = prefs?.contains("quick_pass") == true

    fun quickLogin(): Boolean {
        val savedPass = prefs?.getString("quick_pass", null)
        if (savedPass != null) {
            return unlockVault(savedPass)
        }
        return false
    }

    fun setQuickLogin(enabled: Boolean, password: String = masterPassword) {
        if (enabled) {
            prefs?.edit()?.putString("quick_pass", password)?.apply()
        } else {
            prefs?.edit()?.remove("quick_pass")?.apply()
        }
    }

    fun createVault(password: String) {
        try {
            val entropy = BastionCrypto.transmute(
                System.currentTimeMillis().toString(), "master", "entropy", 1, 32, true
            )
            val newState = VaultState(
                entropy = entropy,
                configs = emptyList(),
                notes = emptyList(),
                contacts = emptyList(),
                locker = emptyList(),
                version = 1,
                lastModified = System.currentTimeMillis()
            )
            saveState(newState, password)
            masterPassword = password
            _state.value = newState
        } catch (e: Exception) { e.printStackTrace() }
    }

    fun unlockVault(password: String, blobOverride: String? = null): Boolean {
        return try {
            val blob = blobOverride ?: vaultFile?.readText() ?: return false
            val json = BastionCrypto.unpackVault(blob, password)
            val vault = gson.fromJson(json, VaultState::class.java)
            masterPassword = password
            _state.value = vault
            if (blobOverride != null) saveState(vault, password)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    fun logout() {
        _state.value = null
        masterPassword = ""
    }

    // --- CRUD ---
    fun addConfig(config: VaultConfig) { updateState { it.copy(configs = it.configs + config) } }
    fun updateConfig(config: VaultConfig) { updateState { it.copy(configs = it.configs.map { c -> if (c.id == config.id) config else c }) } }
    fun deleteConfig(id: String) { updateState { it.copy(configs = it.configs.filter { it.id != id }) } }

    fun addNote(note: Note) { updateState { it.copy(notes = it.notes + note) } }
    fun updateNote(note: Note) { updateState { it.copy(notes = it.notes.map { n -> if (n.id == note.id) note else n }) } }
    fun deleteNote(id: String) { updateState { it.copy(notes = it.notes.filter { it.id != id }) } }

    fun addContact(contact: Contact) { updateState { it.copy(contacts = it.contacts + contact) } }
    fun updateContact(contact: Contact) { updateState { it.copy(contacts = it.contacts.map { c -> if (c.id == contact.id) contact else c }) } }
    fun deleteContact(id: String) { updateState { it.copy(contacts = it.contacts.filter { it.id != id }) } }

    fun addLockerEntry(entry: Resonance) { updateState { it.copy(locker = it.locker + entry) } }
    fun deleteLockerEntry(id: String) { updateState { it.copy(locker = it.locker.filter { it.id != id }) } }

    private fun updateState(transform: (VaultState) -> VaultState) {
        val current = _state.value ?: return
        val updated = transform(current).copy(lastModified = System.currentTimeMillis())
        saveState(updated, masterPassword)
        _state.value = updated
    }

    private fun saveState(vault: VaultState, password: String) {
        val json = gson.toJson(vault)
        val blob = BastionCrypto.packVault(json, password)
        vaultFile?.writeText(blob)
    }

    fun generatePassword(config: VaultConfig): String {
        val entropy = _state.value?.entropy ?: return ""
        return BastionCrypto.transmute(entropy, config.name, config.username, config.version, config.length, config.useSymbols)
    }
}

// --- UI COMPONENTS ---

@Composable
fun BastionApp() {
    val context = LocalContext.current
    val viewModel: BastionViewModel = viewModel()
    val vaultState by viewModel.state.collectAsState()
    
    LaunchedEffect(Unit) { 
        viewModel.init(context) 
    }

    if (vaultState == null) {
        AuthScreen(viewModel)
    } else {
        MainScreen(viewModel, vaultState!!)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(viewModel: BastionViewModel) {
    var password by remember { mutableStateOf("") }
    var blobInput by remember { mutableStateOf("") }
    var isImporting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var rememberMe by remember { mutableStateOf(viewModel.hasQuickLogin()) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Icon(Icons.Default.Security, null, tint = Indigo500, modifier = Modifier.size(64.dp))
            Text("BASTION", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color.White, fontFamily = FontFamily.Monospace)
            Text("OFFLINE ENCLAVE", fontSize = 12.sp, color = Slate400, letterSpacing = 2.sp)

            Spacer(modifier = Modifier.height(32.dp))

            if (isImporting) {
                OutlinedTextField(
                    value = blobInput,
                    onValueChange = { blobInput = it },
                    label = { Text("Paste Vault Blob") },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Color.White, containerColor = Slate900)
                )
            }

            if (viewModel.hasQuickLogin() && !isImporting) {
                Button(
                    onClick = { if (!viewModel.quickLogin()) error = "Quick Login Failed" },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Fingerprint, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("QUICK LOGIN")
                }
                Text("or enter password manually", color = Slate400, fontSize = 12.sp)
            }

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Master Password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Color.White, containerColor = Slate900)
            )

            if (!isImporting && !viewModel.hasLocalVault()) {
                 Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = rememberMe, onCheckedChange = { rememberMe = it }, colors = CheckboxDefaults.colors(checkedColor = Indigo500))
                    Text("Enable Quick Login (Save Password)", color = Slate400, fontSize = 12.sp)
                }
            } else if (!isImporting && viewModel.hasLocalVault()) {
                 Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = rememberMe, onCheckedChange = { rememberMe = it; viewModel.setQuickLogin(it, password) }, colors = CheckboxDefaults.colors(checkedColor = Indigo500))
                    Text("Remember Me", color = Slate400, fontSize = 12.sp)
                }
            }

            if (error.isNotEmpty()) Text(error, color = Red500, fontSize = 12.sp)

            Button(
                onClick = {
                    if (isImporting) {
                        if (viewModel.unlockVault(password, blobInput)) {
                            if (rememberMe) viewModel.setQuickLogin(true, password)
                            error = "" 
                        } else error = "Decryption Failed"
                    } else if (viewModel.hasLocalVault()) {
                        if (viewModel.unlockVault(password)) {
                            if (rememberMe) viewModel.setQuickLogin(true, password)
                            error = ""
                        } else error = "Incorrect Password"
                    } else {
                        viewModel.createVault(password)
                        if (rememberMe) viewModel.setQuickLogin(true, password)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Indigo500),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(if (isImporting) "IMPORT & DECRYPT" else if (viewModel.hasLocalVault()) "UNLOCK" else "CREATE NEW VAULT")
            }

            TextButton(onClick = { isImporting = !isImporting }) {
                Text(if (isImporting) "Back to Login" else "Import Backup", color = Slate400)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: BastionViewModel, state: VaultState) {
    var currentTab by remember { mutableStateOf(0) }
    
    Scaffold(
        containerColor = Slate950,
        bottomBar = {
            NavigationBar(containerColor = Slate900) {
                val items = listOf(
                    Triple("Logins", Icons.Default.VpnKey, 0),
                    Triple("People", Icons.Default.People, 1),
                    Triple("Notes", Icons.Default.Description, 2),
                    Triple("Locker", Icons.Default.Lock, 3),
                    Triple("Tools", Icons.Default.Build, 4)
                )
                items.forEach { (label, icon, idx) ->
                    NavigationBarItem(
                        selected = currentTab == idx,
                        onClick = { currentTab = idx },
                        icon = { Icon(icon, null) },
                        label = { Text(label, fontSize = 10.sp) },
                        colors = NavigationBarItemDefaults.colors(indicatorColor = Indigo500.copy(alpha = 0.2f), selectedIconColor = Indigo500, unselectedIconColor = Slate400)
                    )
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().background(Slate900).padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Security, null, tint = Indigo500, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("BASTION", color = Color.White, fontWeight = FontWeight.Bold)
                }
                IconButton(onClick = { viewModel.logout() }) {
                    Icon(Icons.Default.Logout, null, tint = Red500)
                }
            }
            
            Box(modifier = Modifier.weight(1f)) {
                when (currentTab) {
                    0 -> VaultList(viewModel, state)
                    1 -> ContactsList(viewModel, state)
                    2 -> NotesList(viewModel, state)
                    3 -> LockerScreen(viewModel, state)
                    4 -> SandboxScreen(viewModel)
                }
            }
        }
    }
}

// --- TAB 1: VAULT ---
@Composable
fun VaultList(viewModel: BastionViewModel, state: VaultState) {
    var showAddDialog by remember { mutableStateOf(false) }
    var selectedConfig by remember { mutableStateOf<VaultConfig?>(null) }
    var showRecover by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
            Button(
                onClick = { showRecover = true },
                colors = ButtonDefaults.buttonColors(containerColor = Slate800),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.CallSplit, null, tint = Emerald500)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Recover from Shards", color = Emerald500)
            }
        }

        Box(modifier = Modifier.weight(1f)) {
            if (state.configs.isEmpty()) {
                EmptyState(Icons.Outlined.VpnKey, "No Logins")
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.configs) { config ->
                        VaultItem(config) { selectedConfig = config }
                    }
                }
            }
            FloatingActionButton(
                onClick = { showAddDialog = true },
                modifier = Modifier.align(Alignment.BottomEnd).padding(24.dp),
                containerColor = Indigo500
            ) { Icon(Icons.Default.Add, null, tint = Color.White) }
        }
    }

    if (showAddDialog) AddConfigDialog({ showAddDialog = false }, { viewModel.addConfig(it) })
    if (showRecover) RecoveryDialog({ showRecover = false })
    
    selectedConfig?.let { config ->
        ConfigDetailDialog(config, viewModel, { selectedConfig = null }, { viewModel.deleteConfig(config.id); selectedConfig = null }, { viewModel.updateConfig(it); selectedConfig = null })
    }
}

// --- TAB 2: CONTACTS ---
@Composable
fun ContactsList(viewModel: BastionViewModel, state: VaultState) {
    var showAdd by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<Contact?>(null) }

    Box(modifier = Modifier.fillMaxSize()) {
        if (state.contacts.isEmpty()) {
            EmptyState(Icons.Outlined.People, "No Contacts")
        } else {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(state.contacts) { contact ->
                    ContactItem(contact) { selected = contact }
                }
            }
        }
        FloatingActionButton(
            onClick = { showAdd = true },
            modifier = Modifier.align(Alignment.BottomEnd).padding(24.dp),
            containerColor = Indigo500
        ) { Icon(Icons.Default.Add, null, tint = Color.White) }
    }

    if (showAdd) ContactEditor(null, { showAdd = false }, { viewModel.addContact(it) })
    selected?.let { contact ->
        ContactEditor(contact, { selected = null }, { viewModel.updateContact(it) }, { viewModel.deleteContact(contact.id) })
    }
}

// --- TAB 3: NOTES ---
@Composable
fun NotesList(viewModel: BastionViewModel, state: VaultState) {
    var currentNote by remember { mutableStateOf<Note?>(null) }
    var isEditing by remember { mutableStateOf(false) }

    if (isEditing) {
        NoteEditor(currentNote, {
            if (currentNote == null) viewModel.addNote(it) else viewModel.updateNote(it)
            isEditing = false
            currentNote = null
        }, { isEditing = false; currentNote = null }, { if(currentNote!=null) viewModel.deleteNote(currentNote!!.id); isEditing = false; currentNote = null })
    } else {
        Box(modifier = Modifier.fillMaxSize()) {
            if (state.notes.isEmpty()) {
                EmptyState(Icons.Outlined.Description, "No Notes")
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(state.notes) { note ->
                        NoteItem(note) { currentNote = note; isEditing = true }
                    }
                }
            }
            FloatingActionButton(onClick = { currentNote = null; isEditing = true }, modifier = Modifier.align(Alignment.BottomEnd).padding(24.dp), containerColor = Indigo500) { Icon(Icons.Default.Add, null, tint = Color.White) }
        }
    }
}

// --- TAB 4: LOCKER ---
@Composable
fun LockerScreen(viewModel: BastionViewModel, state: VaultState) {
    val context = LocalContext.current
    var isBusy by remember { mutableStateOf(false) }
    
    val saveFileLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("*/*")) { uri ->
        if (uri != null) {
            viewModel.viewModelScope.launch(Dispatchers.IO) {
                isBusy = true
                try {
                    context.contentResolver.openOutputStream(uri)?.use { it.write(viewModel.pendingFileBytes) }
                } catch(e: Exception) { e.printStackTrace() }
                isBusy = false
            }
        }
    }

    val openFileLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            viewModel.viewModelScope.launch(Dispatchers.IO) {
                isBusy = true
                try {
                    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@launch
                    val fileName = getFileName(context, uri) ?: "unknown"
                    val fileId = BastionCrypto.getFileId(bytes)
                    
                    if (fileId != null) {
                        val entry = state.locker.find { it.id == fileId }
                        if (entry != null) {
                            val plain = BastionCrypto.decryptFile(bytes, entry.key)
                            viewModel.pendingFileBytes = plain
                            viewModel.pendingFileName = entry.label
                            withContext(Dispatchers.Main) { saveFileLauncher.launch(entry.label) }
                        } else {
                            withContext(Dispatchers.Main) { Toast.makeText(context, "Key not found", Toast.LENGTH_LONG).show() }
                        }
                    } else {
                        val result = BastionCrypto.encryptFile(bytes)
                        val resonance = Resonance(
                            id = result.id,
                            label = fileName,
                            size = bytes.size.toLong(),
                            mime = context.contentResolver.getType(uri) ?: "application/octet-stream",
                            key = result.keyHex,
                            hash = "",
                            timestamp = System.currentTimeMillis()
                        )
                        viewModel.pendingFileBytes = result.artifact
                        viewModel.pendingFileName = "$fileName.bastion"
                        withContext(Dispatchers.Main) {
                            viewModel.addLockerEntry(resonance)
                            saveFileLauncher.launch("$fileName.bastion")
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    withContext(Dispatchers.Main) { Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show() }
                }
                isBusy = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Button(
            onClick = { openFileLauncher.launch(arrayOf("*/*")) },
            modifier = Modifier.fillMaxWidth().height(60.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Indigo500),
            shape = RoundedCornerShape(12.dp),
            enabled = !isBusy
        ) {
            if (isBusy) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
            else Text("ENCRYPT / DECRYPT FILE")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        Text("Registry (Keys)", color = Slate400, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.locker) { entry ->
                LockerItem(entry) { viewModel.deleteLockerEntry(entry.id) }
            }
        }
    }
}

// --- TAB 5: SANDBOX ---
@Composable
fun SandboxScreen(viewModel: BastionViewModel) {
    var mode by remember { mutableStateOf(0) }
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(modifier = Modifier.fillMaxWidth().background(Slate900, RoundedCornerShape(8.dp)).padding(4.dp)) {
            TabBtn("Generator", mode == 0) { mode = 0 }
            TabBtn("Cipher", mode == 1) { mode = 1 }
        }
        Spacer(modifier = Modifier.height(16.dp))
        if (mode == 0) GeneratorScreen() else CipherScreen()
    }
}

@Composable
fun CipherScreen() {
    var input by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var output by remember { mutableStateOf("") }
    val clipboard = LocalClipboardManager.current

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(value = input, onValueChange = { input = it }, label = { Text("Input Text") }, modifier = Modifier.fillMaxWidth(), colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Color.White))
        OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Secret Key") }, modifier = Modifier.fillMaxWidth(), colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Color.White))
        
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                try {
                    val res = BastionCrypto.encryptFile(input.toByteArray(Charsets.UTF_8))
                    val b64 = android.util.Base64.encodeToString(res.artifact, android.util.Base64.NO_WRAP)
                    output = "BASTION_MSG::${res.keyHex}::$b64"
                } catch(e:Exception){ output = "Error" }
            }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = Indigo500)) { Text("Encrypt") }
            
            Button(onClick = {
                try {
                    val parts = input.split("::")
                    if(parts.size == 3 && parts[0] == "BASTION_MSG") {
                        val key = parts[1]
                        val bytes = android.util.Base64.decode(parts[2], android.util.Base64.DEFAULT)
                        val plain = BastionCrypto.decryptFile(bytes, key)
                        output = String(plain, Charsets.UTF_8)
                    } else { output = "Invalid Format" }
                } catch(e:Exception){ output = "Decrypt Failed" }
            }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = Emerald500)) { Text("Decrypt") }
        }
        
        OutlinedTextField(value = output, onValueChange = {}, label = { Text("Output") }, modifier = Modifier.fillMaxWidth().height(150.dp), readOnly = true, colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Color.White))
        Button(onClick = { clipboard.setText(AnnotatedString(output)) }, modifier = Modifier.fillMaxWidth()) { Text("Copy Output") }
    }
}

// --- SUB-COMPONENTS ---

@Composable
fun RowScope.TabBtn(text: String, selected: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.weight(1f),
        colors = ButtonDefaults.buttonColors(containerColor = if (selected) Indigo500 else Color.Transparent),
        shape = RoundedCornerShape(6.dp)
    ) { Text(text, color = if (selected) Color.White else Slate400) }
}

@Composable
fun EmptyState(icon: ImageVector, msg: String) {
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, null, tint = Slate700, modifier = Modifier.size(64.dp))
        Text(msg, color = Slate400, fontSize = 16.sp)
    }
}

@Composable
fun VaultItem(config: VaultConfig, onClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().background(Slate900, RoundedCornerShape(12.dp)).border(1.dp, Slate800, RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(48.dp).background(Slate800, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
            Text(config.name.take(1).uppercase(), color = Indigo500, fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(config.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(config.username, color = Slate400, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
        }
    }
}

@Composable
fun ContactItem(contact: Contact, onClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().background(Slate900, RoundedCornerShape(12.dp)).border(1.dp, Slate800, RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(40.dp).clip(CircleShape).background(Slate800), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.Person, null, tint = Slate400)
        }
        Spacer(modifier = Modifier.width(16.dp))
        Text(contact.name, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun NoteItem(note: Note, onClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().background(Slate900, RoundedCornerShape(12.dp)).border(1.dp, Slate800, RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(16.dp)) {
        Icon(Icons.Default.Description, null, tint = Slate400)
        Spacer(modifier = Modifier.width(16.dp))
        Text(note.title.ifEmpty { "Untitled" }, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun LockerItem(entry: Resonance, onDelete: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().background(Slate900, RoundedCornerShape(8.dp)).border(1.dp, Slate800, RoundedCornerShape(8.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.Lock, null, tint = Amber500)
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(entry.label, color = Color.White, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(entry.id.take(8), color = Slate700, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
        }
        IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, null, tint = Red500) }
    }
}

// --- GENERATOR ---
@Composable fun GeneratorScreen() {
    var length by remember { mutableStateOf(16f) }
    var result by remember { mutableStateOf("") }
    val clipboard = LocalClipboardManager.current
    val generate = { 
        val chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        val sb = StringBuilder(); val rng = SecureRandom()
        for(i in 0 until length.toInt()) sb.append(chars[rng.nextInt(chars.length)])
        result = sb.toString()
    }
    LaunchedEffect(Unit) { generate() }
    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(result, color = Emerald500, fontSize = 24.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { clipboard.setText(AnnotatedString(result)) }.padding(20.dp))
        Slider(value = length, onValueChange = { length = it }, valueRange = 8f..64f, modifier = Modifier.padding(horizontal = 24.dp))
        Text("Length: ${length.toInt()}", color = Slate400)
        Button(onClick = { generate() }, colors = ButtonDefaults.buttonColors(containerColor = Indigo500)) { Text("Regenerate") }
    }
}

// --- DIALOGS ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable fun AddConfigDialog(onDismiss: () -> Unit, onAdd: (VaultConfig) -> Unit) {
    var name by remember { mutableStateOf("") }
    var user by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, containerColor = Slate900,
        title = { Text("New Login", color = Color.White) },
        text = { Column {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Service") }, colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Color.White))
            OutlinedTextField(value = user, onValueChange = { user = it }, label = { Text("Username") }, colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Color.White))
        }},
        confirmButton = { Button(onClick = { onAdd(VaultConfig(UUID.randomUUID().toString(), name, user, 1, 16, true, "login", System.currentTimeMillis())); onDismiss() }, colors = ButtonDefaults.buttonColors(containerColor = Indigo500)) { Text("Create") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable fun ConfigDetailDialog(config: VaultConfig, vm: BastionViewModel, onDismiss: () -> Unit, onDelete: () -> Unit, onUpdate: (VaultConfig) -> Unit) {
    var revealed by remember { mutableStateOf<String?>(null) }
    var showShare by remember { mutableStateOf(false) }
    val clip = LocalClipboardManager.current
    
    if (showShare && revealed != null) {
        ShareDialog(revealed!!, config.name) { showShare = false }
    } else {
        AlertDialog(onDismissRequest = onDismiss, containerColor = Slate900,
            title = { Text(config.name, color = Color.White) },
            text = { Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text(config.username, color = Slate400, fontFamily = FontFamily.Monospace)
                Box(modifier = Modifier.fillMaxWidth().background(Color.Black.copy(0.3f), RoundedCornerShape(8.dp)).border(1.dp, Slate700, RoundedCornerShape(8.dp)).padding(16.dp).clickable { if(revealed!=null) clip.setText(AnnotatedString(revealed!!)) }) {
                    Text(revealed ?: "•••• ••••", color = if(revealed!=null) Emerald500 else Slate700, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { revealed = if(revealed==null) vm.generatePassword(config) else null }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = Slate800)) { Text(if(revealed==null) "Reveal" else "Hide") }
                    Button(onClick = { onUpdate(config.copy(version = config.version + 1)); revealed = null }, colors = ButtonDefaults.buttonColors(containerColor = Amber500)) { Icon(Icons.Default.Refresh, null) }
                }
                if (revealed != null) {
                    Button(onClick = { showShare = true }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Slate800)) {
                        Icon(Icons.Default.Share, null, tint = Emerald500)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Create Shards", color = Emerald500)
                    }
                }
            }},
            confirmButton = { TextButton(onClick = onDelete) { Text("Delete", color = Red500) } },
            dismissButton = { TextButton(onClick = onDismiss) { Text("Close", color = Color.White) } }
        )
    }
}

@Composable fun ShareDialog(secret: String, name: String, onDismiss: () -> Unit) {
    var shares by remember { mutableStateOf(3f) }
    var threshold by remember { mutableStateOf(2f) }
    var shards by remember { mutableStateOf<List<String>>(emptyList()) }
    val clip = LocalClipboardManager.current

    AlertDialog(
        onDismissRequest = onDismiss, containerColor = Slate900,
        title = { Text("Share Password", color = Color.White) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (shards.isEmpty()) {
                    Text("Split '$name' into ${shares.toInt()} shards.", color = Slate400, fontSize = 12.sp)
                    Column {
                        Text("Total Shards: ${shares.toInt()}", color = Slate400, fontSize = 12.sp)
                        Slider(value = shares, onValueChange = { shares = it; if(threshold > it) threshold = it }, valueRange = 2f..10f, steps = 8)
                    }
                    Column {
                        Text("Required to Unlock: ${threshold.toInt()}", color = Emerald500, fontSize = 12.sp)
                        Slider(value = threshold, onValueChange = { threshold = it }, valueRange = 2f..shares, steps = (shares.toInt()-3).coerceAtLeast(0))
                    }
                    Button(
                        onClick = { shards = BastionCrypto.SecretSharer.split(secret, shares.toInt(), threshold.toInt()) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo500)
                    ) { Text("Generate Shards") }
                } else {
                    Text("Distribute these shards securely.", color = Slate400, fontSize = 12.sp)
                    LazyColumn(modifier = Modifier.height(200.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(shards) { shard ->
                            Box(modifier = Modifier.fillMaxWidth().background(Color.Black, RoundedCornerShape(8.dp)).padding(12.dp).clickable { clip.setText(AnnotatedString(shard)) }) {
                                Text(shard, color = Slate400, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done", color = Color.White) } }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun RecoveryDialog(onDismiss: () -> Unit) {
    var input by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf("") }
    val clip = LocalClipboardManager.current

    AlertDialog(
        onDismissRequest = onDismiss, containerColor = Slate900,
        title = { Text("Shard Recovery", color = Color.White) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (result == null) {
                    Text("Paste shards (one per line)", color = Slate400, fontSize = 12.sp)
                    OutlinedTextField(
                        value = input, onValueChange = { input = it },
                        modifier = Modifier.fillMaxWidth().height(150.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Color.White, containerColor = Slate800)
                    )
                    if (error.isNotEmpty()) Text(error, color = Red500, fontSize = 12.sp)
                    Button(
                        onClick = {
                            try {
                                val list = input.lines().map { it.trim() }.filter { it.isNotEmpty() }
                                result = BastionCrypto.SecretSharer.combine(list)
                                error = ""
                            } catch (e: Exception) { error = e.message ?: "Failed" }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo500)
                    ) { Text("Reconstruct Secret") }
                } else {
                    Box(modifier = Modifier.fillMaxWidth().background(Emerald500.copy(alpha = 0.2f), RoundedCornerShape(12.dp)).border(1.dp, Emerald500, RoundedCornerShape(12.dp)).padding(16.dp).clickable { clip.setText(AnnotatedString(result!!)) }) {
                        Text(result!!, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                    }
                    Text("Tap to Copy", color = Slate400, fontSize = 12.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close", color = Color.White) } }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun NoteEditor(note: Note?, onSave: (Note) -> Unit, onCancel: () -> Unit, onDelete: () -> Unit) {
    var title by remember { mutableStateOf(note?.title ?: "") }
    var content by remember { mutableStateOf(note?.content ?: "") }
    Column(modifier = Modifier.fillMaxSize().background(Slate950).padding(16.dp)) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = onCancel) { Icon(Icons.Default.ArrowBack, null, tint = Slate400) }
            Row {
                if (note != null) IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, null, tint = Red500) }
                IconButton(onClick = { onSave(Note(note?.id ?: UUID.randomUUID().toString(), title, content, System.currentTimeMillis())) }) { Icon(Icons.Default.Check, null, tint = Emerald500) }
            }
        }
        OutlinedTextField(value = title, onValueChange = { title = it }, placeholder = { Text("Title") }, modifier = Modifier.fillMaxWidth(), colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Color.White, containerColor = Color.Transparent, focusedBorderColor = Color.Transparent, unfocusedBorderColor = Color.Transparent), textStyle = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold))
        OutlinedTextField(value = content, onValueChange = { content = it }, placeholder = { Text("Content") }, modifier = Modifier.fillMaxSize(), colors = TextFieldDefaults.outlinedTextFieldColors(textColor = Slate400, containerColor = Color.Transparent, focusedBorderColor = Color.Transparent, unfocusedBorderColor = Color.Transparent))
    }
}

// --- UTILS ---
fun getFileName(context: Context, uri: Uri): String? {
    var result: String? = null
    if (uri.scheme == "content") {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if(idx >= 0) result = cursor.getString(idx)
            }
        }
    }
    if (result == null) {
        result = uri.path
        val cut = result?.lastIndexOf('/')
        if (cut != null && cut != -1) result = result?.substring(cut + 1)
    }
    return result
}
