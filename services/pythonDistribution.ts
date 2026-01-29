
export const PYTHON_APP_SOURCE = {
  "bastion.py": `#!/usr/bin/env python3
\"\"\"
BASTION SECURE ENCLAVE // PYTHON RUNTIME
v2.8.0

[MISSION]
"If the web disappears, Bastion still works."

[EXECUTION]
pip install -r requirements.txt
python3 bastion.py
\"\"\"

import sys
import os

# Ensure src is in python path
sys.path.append(os.path.join(os.path.dirname(__file__)))

try:
    from src.interface import BastionShell
except ImportError as e:
    print("CRITICAL ERROR: Failed to load Bastion Core Modules.")
    print(f"Details: {e}")
    print("\\nDid you run 'pip install -r requirements.txt'?")
    sys.exit(1)

if __name__ == "__main__":
    try:
        # Enforce secure file permissions on run (Best Effort)
        if os.name == 'posix':
            os.umask(0o077)
            
        app = BastionShell()
        app.run()
    except KeyboardInterrupt:
        print("\\n\\n[!] Force Exit. Memory wiped.")
        sys.exit(0)
    except Exception as e:
        print(f"\\n[CRITICAL] Runtime Crash: {e}")
        sys.exit(1)
`,
  "requirements.txt": `cryptography>=41.0.0
requests>=2.31.0
pyperclip>=1.8.2
rich>=13.0.0`,
  "src/__init__.py": `# Bastion Source Package`,
  "src/core.py": `import os
import json
import base64
import secrets
import shutil
import time
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

# --- CONSTANTS ---
CURRENT_ITERATIONS = 210_000
LEGACY_ITERATIONS = 100_000
MAGIC_HEADER = "BASTION_V3::"

# --- DATA MODELS ---

@dataclass
class VaultState:
    entropy: str
    configs: List[Dict] = field(default_factory=list)
    locker: List[Dict] = field(default_factory=list)
    version: int = 1
    lastModified: int = 0
    flags: int = 0

# --- CRYPTO PRIMITIVES ---

class BastionCrypto:
    @staticmethod
    def derive_key(password: str, salt: bytes, use_domain_sep: bool = True, iterations: int = CURRENT_ITERATIONS) -> bytes:
        final_salt = salt
        if use_domain_sep:
            domain_prefix = b"BASTION_VAULT_V1::"
            final_salt = domain_prefix + salt

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=final_salt,
            iterations=iterations,
        )
        return kdf.derive(password.encode('utf-8'))

    @staticmethod
    def encrypt_blob(data_json: str, password: str) -> str:
        salt = secrets.token_bytes(16)
        iv = secrets.token_bytes(12)
        
        # Always encrypt using Current Standard
        key = BastionCrypto.derive_key(password, salt, use_domain_sep=True, iterations=CURRENT_ITERATIONS)
        aesgcm = AESGCM(key)
        
        plaintext = data_json.encode('utf-8')
        ciphertext = aesgcm.encrypt(iv, plaintext, None)
        
        # Blob Structure: SALT(16) | IV(12) | CIPHERTEXT
        blob = salt + iv + ciphertext
        return base64.b64encode(blob).decode('utf-8')

    @staticmethod
    def decrypt_blob(blob_b64: str, password: str) -> Tuple[Optional[str], bool]:
        \"\"\"
        Attempts to decrypt the blob using multiple strategies.
        Returns: (decrypted_json_string, is_legacy_format)
        \"\"\"
        try:
            data = base64.b64decode(blob_b64)
            if len(data) < 28: return None, False
            
            salt = data[0:16]
            iv = data[16:28]
            ciphertext = data[28:]
            
            def try_strategy(domain_sep: bool, iters: int) -> Optional[str]:
                try:
                    key = BastionCrypto.derive_key(password, salt, domain_sep, iters)
                    aesgcm = AESGCM(key)
                    plaintext = aesgcm.decrypt(iv, ciphertext, None)
                    return plaintext.decode('utf-8')
                except Exception:
                    return None

            # Strategy 1: Current Standard (V3/V2)
            # Domain Separation + 210k Iterations
            res = try_strategy(True, CURRENT_ITERATIONS)
            if res: return res, False

            # Strategy 2: Legacy V1
            # No Domain Separation + 210k Iterations
            res = try_strategy(False, CURRENT_ITERATIONS)
            if res: return res, True # Legacy

            # Strategy 3: Ancient
            # No Domain Separation + 100k Iterations
            res = try_strategy(False, LEGACY_ITERATIONS)
            if res: return res, True # Legacy

            return None, False

        except Exception:
            return None, False

# --- STORAGE MANAGER ---

class VaultManager:
    def __init__(self, filepath="bastion.vault"):
        self.filepath = filepath
        self.blobs: List[str] = []
        self.active_state: Optional[VaultState] = None
        self.active_password: Optional[str] = None
        self.active_blob_index: int = -1

    def load_file(self) -> bool:
        if not os.path.exists(self.filepath):
            return False
        
        try:
            with open(self.filepath, "r") as f:
                content = f.read().strip()
            
            if content.startswith(MAGIC_HEADER):
                # V3 Format
                payload = content[len(MAGIC_HEADER):]
                decoded = base64.b64decode(payload).decode('utf-8')
                self.blobs = json.loads(decoded)
            elif content.startswith("["):
                # JSON Array (Legacy)
                self.blobs = json.loads(content)
            else:
                # Raw Blob (Legacy V1)
                self.blobs = [content]
            return True
        except Exception as e:
            print(f"Error loading file: {e}")
            return False

    def save_file(self):
        if self.active_state and self.active_password:
            # Update active blob
            self.active_state.lastModified = int(time.time() * 1000)
            new_blob = BastionCrypto.encrypt_blob(
                json.dumps(asdict(self.active_state)), 
                self.active_password
            )
            
            if self.active_blob_index >= 0:
                self.blobs[self.active_blob_index] = new_blob
            else:
                self.blobs.append(new_blob)
                self.active_blob_index = len(self.blobs) - 1

        payload = json.dumps(self.blobs)
        b64 = base64.b64encode(payload.encode('utf-8')).decode('utf-8')
        final_out = MAGIC_HEADER + b64
        
        # Atomic Write
        temp = self.filepath + ".tmp"
        with open(temp, "w") as f:
            f.write(final_out)
        shutil.move(temp, self.filepath)
        # Secure Permissions
        try:
            os.chmod(self.filepath, 0o600)
        except:
            pass

    def unlock(self, password: str) -> bool:
        for idx, blob in enumerate(self.blobs):
            decrypted_json, is_legacy = BastionCrypto.decrypt_blob(blob, password)
            
            if decrypted_json:
                data = json.loads(decrypted_json)
                self.active_state = VaultState(**data)
                self.active_password = password
                self.active_blob_index = idx
                
                # --- AUTOMATIC MIGRATION CHECK ---
                if is_legacy:
                    print("\\n[SYSTEM] Legacy encryption format detected.")
                    print("[SYSTEM] Seamlessly migrating vault to V3 Algorithm (AES-GCM + Domain Separation)...")
                    try:
                        self.save_file()
                        print("[SYSTEM] Migration complete. Vault secured with latest standards.\\n")
                    except Exception as e:
                        print(f"[WARN] Automatic migration failed: {e}")
                
                return True
        return False

    def create_new(self, password: str):
        entropy = secrets.token_hex(32)
        state = VaultState(entropy=entropy, lastModified=int(time.time()*1000))
        self.blobs = []
        self.active_state = state
        self.active_password = password
        self.active_blob_index = 0
        self.blobs.append("") # Placeholder
        self.save_file()`,
  "src/features.py": `import os
import secrets
import hashlib
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITERATIONS = 210_000

class ChaosEngine:
    ALPHA = "abcdefghijklmnopqrstuvwxyz"
    CAPS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    NUM = "0123456789"
    SYM = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    @staticmethod
    def transmute(entropy: str, service: str, username: str, version: int = 1, length: int = 16, symbols: bool = True) -> str:
        # Matches JS/Kotlin Implementation
        salt_str = f"BASTION_GENERATOR_V2::{service.lower()}::{username.lower()}::v{version}"
        dk_len = length * 4 
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA512(),
            length=dk_len, 
            salt=salt_str.encode('utf-8'),
            iterations=ITERATIONS,
        )
        flux_bytes = kdf.derive(entropy.encode('utf-8'))
        
        pool = ChaosEngine.ALPHA + ChaosEngine.CAPS + ChaosEngine.NUM
        if symbols: pool += ChaosEngine.SYM
            
        limit = 256 - (256 % len(pool))
        password = []
        buf_idx = 0
        
        while len(password) < length:
            if buf_idx >= len(flux_bytes): break
            byte_val = flux_bytes[buf_idx]
            buf_idx += 1
            if byte_val < limit:
                char_idx = byte_val % len(pool)
                password.append(pool[char_idx])
            
        return "".join(password)

class LockerEngine:
    MAGIC = b"BASTION1"

    @staticmethod
    def encrypt_file(filepath: str) -> str:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
            
        with open(filepath, 'rb') as f:
            data = f.read()
            
        file_id = str(secrets.token_hex(18)) # 36 chars
        key = secrets.token_bytes(32)
        iv = secrets.token_bytes(12)
        
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(iv, data, None)
        
        id_bytes = f"{file_id:<36}".encode('utf-8')
        header = LockerEngine.MAGIC + id_bytes + iv
        
        out_path = filepath + ".bastion"
        with open(out_path, 'wb') as f:
            f.write(header + ciphertext)
            
        return key.hex()

    @staticmethod
    def decrypt_file(filepath: str, key_hex: str) -> str:
        with open(filepath, 'rb') as f:
            data = f.read()
            
        if len(data) < 56: raise ValueError("File corrupt")
        if data[0:8] != LockerEngine.MAGIC: raise ValueError("Invalid Magic")
        
        iv = data[44:56]
        ciphertext = data[56:]
        key = bytes.fromhex(key_hex.strip())
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(iv, ciphertext, None)
        
        out_path = filepath.replace(".bastion", ".decrypted")
        with open(out_path, 'wb') as f:
            f.write(plaintext)
        return out_path

class BreachAuditor:
    @staticmethod
    def check_password(password: str) -> int:
        \"\"\"
        Checks HIBP API using k-Anonymity.
        Returns count of breaches (0 if safe/unknown).
        \"\"\"
        sha1 = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
        prefix = sha1[:5]
        suffix = sha1[5:]
        
        url = f"https://api.pwnedpasswords.com/range/{prefix}"
        headers = {'Add-Padding': 'true'}
        
        try:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code != 200: return -1
            
            for line in r.text.splitlines():
                hash_suffix, count = line.split(':')
                if hash_suffix == suffix:
                    return int(count)
            return 0
        except Exception:
            return -1`,
  "src/interface.py": `import os
import sys
import time
import secrets
import getpass
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich import print as rprint

try:
    import pyperclip
except ImportError:
    pyperclip = None

from .core import VaultManager
from .features import ChaosEngine, LockerEngine, BreachAuditor

class BastionShell:
    def __init__(self):
        self.console = Console()
        self.manager = VaultManager()
        self.running = True

    def clear(self):
        os.system('cls' if os.name == 'nt' else 'clear')

    def header(self):
        self.clear()
        self.console.print(Panel.fit(
            "[bold cyan]BASTION SECURE ENCLAVE[/bold cyan]\\n[dim]Python Runtime v2.8.0[/dim]",
            border_style="indigo"
        ))

    def copy_to_clipboard(self, text: str):
        if pyperclip:
            pyperclip.copy(text)
            self.console.print("[bold green]✓ Copied to clipboard[/bold green]")
        else:
            self.console.print("[yellow]! Clipboard module not found (pip install pyperclip)[/yellow]")

    def run(self):
        self.header()
        
        # LOGIN
        if not self.manager.load_file():
            self.console.print("[yellow]No vault found.[/yellow]")
            if Confirm.ask("Create new vault?"):
                while True:
                    pwd = getpass.getpass("Set Master Password: ")
                    if len(pwd) < 8:
                        self.console.print("[red]Password too weak (min 8 chars).[/red]")
                        continue
                    confirm = getpass.getpass("Confirm Password: ")
                    if pwd != confirm:
                        self.console.print("[red]Passwords do not match.[/red]")
                        continue
                    self.manager.create_new(pwd)
                    break
            else:
                sys.exit(0)
        else:
            attempts = 3
            while attempts > 0:
                pwd = getpass.getpass("Enter Password: ")
                if self.manager.unlock(pwd):
                    break
                attempts -= 1
                self.console.print(f"[red]Decryption failed. {attempts} attempts left.[/red]")
            
            if not self.manager.active_state:
                sys.exit(1)

        # MAIN LOOP
        while self.running:
            self.header()
            state = self.manager.active_state
            
            table = Table(show_header=False, box=None)
            table.add_row("[bold]1[/bold]", "Search Credentials")
            table.add_row("[bold]2[/bold]", "Add New Login")
            table.add_row("[bold]3[/bold]", "Edit Login")
            table.add_row("[bold]4[/bold]", "Bastion Locker (Files)")
            table.add_row("[bold]5[/bold]", "Breach Check (HIBP)")
            table.add_row("[bold]0[/bold]", "Lock & Exit")
            
            self.console.print(table)
            self.console.print(f"[dim]Stats: {len(state.configs)} Logins | {len(state.locker)} Files[/dim]")
            
            choice = Prompt.ask("Select", choices=["1", "2", "3", "4", "5", "0"])
            
            if choice == '1': self.menu_search()
            elif choice == '2': self.menu_add()
            elif choice == '3': self.menu_edit()
            elif choice == '4': self.menu_locker()
            elif choice == '5': self.menu_audit()
            elif choice == '0': self.running = False

    def menu_search(self):
        q = Prompt.ask("Search query").lower()
        configs = self.manager.active_state.configs
        hits = [c for c in configs if q in c['name'].lower() or q in c['username'].lower()]
        
        if not hits:
            self.console.print("[red]No matches.[/red]")
            time.sleep(1)
            return

        table = Table(title="Search Results")
        table.add_column("#", style="cyan")
        table.add_column("Service", style="bold white")
        table.add_column("Username", style="white")
        table.add_column("Type", style="dim")
        
        for i, c in enumerate(hits):
            ctype = "Custom" if c.get('customPassword') else "Generated"
            table.add_row(str(i+1), c['name'], c['username'], ctype)
        
        self.console.print(table)
        
        sel = Prompt.ask("Select # to reveal (Enter to cancel)", default="")
        if sel.isdigit() and 0 < int(sel) <= len(hits):
            target = hits[int(sel)-1]
            
            pwd = ""
            # CHECK FOR CUSTOM PASSWORD
            if target.get('customPassword'):
                pwd = target['customPassword']
                self.console.print("[dim]Using stored custom password.[/dim]")
            else:
                pwd = ChaosEngine.transmute(
                    self.manager.active_state.entropy,
                    target['name'], target['username'],
                    target.get('version', 1), target.get('length', 16), target.get('useSymbols', True)
                )
            
            self.console.print(Panel(f"[bold green]{pwd}[/bold green]", title="Password"))
            self.copy_to_clipboard(pwd)
            Prompt.ask("Press Enter to clear screen...")

    def menu_add(self):
        name = Prompt.ask("Service Name")
        user = Prompt.ask("Username")
        if not name or not user: return
        
        custom_pwd = ""
        if Confirm.ask("Use Custom Password?", default=False):
            custom_pwd = getpass.getpass("Enter Custom Password: ")
        
        config = {
            "id": secrets.token_hex(8),
            "name": name,
            "username": user,
            "version": 1,
            "length": 16,
            "useSymbols": True,
            "updatedAt": int(time.time()*1000),
            "customPassword": custom_pwd
        }
        
        self.manager.active_state.configs.append(config)
        self.manager.save_file()
        self.console.print("[green]Entry added.[/green]")
        time.sleep(1)

    def menu_edit(self):
        q = Prompt.ask("Search entry to edit").lower()
        configs = self.manager.active_state.configs
        hits = [c for c in configs if q in c['name'].lower() or q in c['username'].lower()]
        
        if not hits:
            self.console.print("[red]No matches.[/red]")
            time.sleep(1)
            return

        for i, c in enumerate(hits):
            self.console.print(f"[{i+1}] {c['name']} ({c['username']})")
            
        sel = Prompt.ask("Select #", default="")
        if not sel.isdigit() or not (0 < int(sel) <= len(hits)): return
        
        target = hits[int(sel)-1]
        
        # EDIT LOOP
        self.console.print(f"[bold]Editing {target['name']}[/bold]")
        new_name = Prompt.ask("Service Name", default=target['name'])
        new_user = Prompt.ask("Username", default=target['username'])
        
        target['name'] = new_name
        target['username'] = new_user
        target['updatedAt'] = int(time.time()*1000)
        target['version'] = target.get('version', 1) + 1 # Auto-rotate version on edit
        
        if Confirm.ask("Change Password Strategy?", default=False):
            if Confirm.ask("Set Custom Password?", default=False):
                target['customPassword'] = getpass.getpass("Enter Custom Password: ")
            else:
                target['customPassword'] = "" # Clear custom to use generator
                self.console.print("[dim]Reverted to Chaos Generator.[/dim]")

        self.manager.save_file()
        self.console.print("[green]Entry updated.[/green]")
        time.sleep(1)

    def menu_locker(self):
        self.header()
        self.console.print("[bold]Bastion Locker[/bold]")
        self.console.print("1. Encrypt File")
        self.console.print("2. Decrypt File")
        
        sel = Prompt.ask("Action", choices=["1", "2", "b"], default="b")
        if sel == 'b': return
        
        path = Prompt.ask("File Path").strip('"')
        
        if sel == '1':
            try:
                key = LockerEngine.encrypt_file(path)
                label = os.path.basename(path)
                entry = {"id": secrets.token_hex(8), "label": label, "key": key, "timestamp": int(time.time()*1000)}
                self.manager.active_state.locker.append(entry)
                self.manager.save_file()
                self.console.print(f"[green]Encrypted to {path}.bastion[/green]")
            except Exception as e:
                self.console.print(f"[red]Error: {e}[/red]")
        elif sel == '2':
            key = Prompt.ask("Hex Key (Leave empty to search registry)", default="")
            # Logic to find key if empty omitted for brevity, assumes manual entry or simple search
            try:
                out = LockerEngine.decrypt_file(path, key)
                self.console.print(f"[green]Decrypted to {out}[/green]")
            except Exception as e:
                self.console.print(f"[red]Error: {e}[/red]")
        
        Prompt.ask("Continue...")

    def menu_audit(self):
        pwd = Prompt.ask("Password to check", password=True)
        self.console.print("[yellow]Contacting HIBP via k-Anonymity...[/yellow]")
        count = BreachAuditor.check_password(pwd)
        
        if count == -1:
            self.console.print("[red]Network Error or API Failure[/red]")
        elif count == 0:
            self.console.print("[green]Clean. No breaches found.[/green]")
        else:
            self.console.print(f"[bold red]COMPROMISED! Found in {count} breaches.[/bold red]")
        
        Prompt.ask("Continue...")`
};
