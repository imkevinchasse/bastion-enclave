import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';
import { Vault } from './components/Vault';
import { AIAuditor } from './components/AIAuditor';
import { Notes } from './components/Notes';
import { Locker } from './components/Locker';
import { Contacts } from './components/Contacts';
import { Extensions } from './components/Extensions';
import { NewsPage } from './components/NewsPage';
import { DocumentsPage } from './components/DocumentsPage';
import { VaultConfig, AppTab, VaultState, Note, Resonance, Contact } from './types';
import { ChaosLock } from './services/cryptoService';
import { Shield, Key, Boxes, LogOut, Terminal, Copy, Check, Save, Layers, Cpu, DatabaseZap, Book, FileLock2, Users, Download, AlertTriangle, Blocks, Fingerprint, History, AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from './components/Button';
import { BrandLogo } from './components/BrandLogo';

export default function App() {
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [sessionPassword, setSessionPassword] = useState<string>('');
  const [vaultString, setVaultString] = useState<string>('');
  
  // Public Routing State
  const [publicPage, setPublicPage] = useState<'landing' | 'auth' | 'news' | 'documents'>('landing');

  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.VAULT);
  const [copiedString, setCopiedString] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Safe Exit State
  const [confirmExit, setConfirmExit] = useState(false);

  // Sentinel State (Rollback Protection)
  const [rollbackAlert, setRollbackAlert] = useState<{current: number, known: number} | null>(null);

  const handleOpenVault = (state: VaultState, encryptedBlob: string, password: string) => {
    // Legacy migration checks
    if (!state.notes) state.notes = [];
    if (!state.locker) state.locker = [];

    // DATA MIGRATION: Ensure Resonance shape
    state.locker = state.locker.map((entry: any) => ({
        ...entry,
        label: entry.label || entry.name || `Artifact_${entry.id?.substring(0,8) || 'Unknown'}`,
        timestamp: entry.timestamp || entry.createdAt || Date.now(),
        mime: entry.mime || entry.type || 'application/octet-stream'
    }));

    if (!state.contacts) state.contacts = [];
    if (!state.version) state.version = 0; // Legacy vaults start at 0
    if (!state.lastModified) state.lastModified = Date.now();
    
    // SENTINEL CHECK
    const storedMax = localStorage.getItem('BASTION_MAX_VERSION');
    const knownMax = storedMax ? parseInt(storedMax, 10) : 0;

    if (state.version < knownMax) {
        setRollbackAlert({ current: state.version, known: knownMax });
    } else {
        setRollbackAlert(null);
        if (state.version > knownMax) {
            localStorage.setItem('BASTION_MAX_VERSION', state.version.toString());
        }
    }

    setVaultState(state);
    setVaultString(encryptedBlob);
    setSessionPassword(password);
    localStorage.setItem('BASTION_VAULT', encryptedBlob);
  };

  const handleAcceptRollback = () => {
      if (!vaultState) return;
      localStorage.setItem('BASTION_MAX_VERSION', vaultState.version.toString());
      setRollbackAlert(null);
  };

  const handleUnmount = () => {
    if (confirmExit) {
        setVaultState(null);
        setSessionPassword('');
        setVaultString('');
        setConfirmExit(false);
        setRollbackAlert(null);
        setPublicPage('auth'); // Return to login screen
    } else {
        setConfirmExit(true);
        setTimeout(() => setConfirmExit(false), 3000);
    }
  };

  const saveVaultState = async (partialState: VaultState) => {
    if (!sessionPassword) return;

    const nextVersion = (partialState.version || 0) + 1;
    const newState = {
        ...partialState,
        version: nextVersion,
        lastModified: Date.now()
    };

    setVaultState(newState);
    setIsSyncing(true);
    try {
        const newBlob = await ChaosLock.pack(newState, sessionPassword);
        setVaultString(newBlob);
        localStorage.setItem('BASTION_VAULT', newBlob);
        localStorage.setItem('BASTION_MAX_VERSION', nextVersion.toString());
        
        window.postMessage({ 
            type: 'BASTION_SYNC', 
            payload: { blob: newBlob, pwd: sessionPassword } 
        }, '*');

    } catch (e) {
        console.error("Failed to pack vault", e);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleUpdateConfigs = (newConfigs: VaultConfig[]) => {
      if (!vaultState) return;
      saveVaultState({ ...vaultState, configs: newConfigs });
  };

  const handleAddConfig = (config: VaultConfig) => {
    if (!vaultState) return;
    handleUpdateConfigs([...vaultState.configs, config]);
  };

  const handleDeleteConfig = (id: string) => {
    if (!vaultState) return;
    handleUpdateConfigs(vaultState.configs.filter(c => c.id !== id));
  };

  const handleUpdateConfig = (updated: VaultConfig) => {
    if (!vaultState) return;
    handleUpdateConfigs(vaultState.configs.map(c => c.id === updated.id ? updated : c));
  };

  const handleSaveNote = (note: Note) => {
      if (!vaultState) return;
      const existing = vaultState.notes.find(n => n.id === note.id);
      let newNotes = [];
      if (existing) {
          newNotes = vaultState.notes.map(n => n.id === note.id ? note : n);
      } else {
          newNotes = [...vaultState.notes, note];
      }
      saveVaultState({ ...vaultState, notes: newNotes });
  };

  const handleDeleteNote = (id: string) => {
      if (!vaultState) return;
      saveVaultState({ ...vaultState, notes: vaultState.notes.filter(n => n.id !== id) });
  };

  const handleSaveContact = (contact: Contact) => {
      if (!vaultState) return;
      const existing = vaultState.contacts.find(c => c.id === contact.id);
      let newContacts = [];
      if (existing) {
          newContacts = vaultState.contacts.map(c => c.id === contact.id ? contact : c);
      } else {
          newContacts = [...vaultState.contacts, contact];
      }
      saveVaultState({ ...vaultState, contacts: newContacts });
  };

  const handleDeleteContact = (id: string) => {
      if (!vaultState) return;
      saveVaultState({ ...vaultState, contacts: vaultState.contacts.filter(c => c.id !== id) });
  };

  const handleLockEntry = (entry: Resonance) => {
      if (!vaultState) return;
      saveVaultState({ ...vaultState, locker: [...(vaultState.locker || []), entry] });
  };

  const handleDeleteLockerEntry = (id: string) => {
      if (!vaultState) return;
      saveVaultState({ ...vaultState, locker: (vaultState.locker || []).filter(e => e.id !== id) });
  };

  const downloadRescueKit = () => {
    if (!vaultState || !sessionPassword) return;
    
    const fullContent = `BASTION SECURE VAULT - EMERGENCY RESCUE KIT
==================================================
GENERATED: ${new Date().toLocaleString()}
VERSION_ID: ${vaultState.version}
INTEGRITY_CHECK: ${vaultState.lastModified}

IMPORTANT: PRINT THIS PAGE AND KEEP IT SAFE.
IF YOU LOSE THIS FILE, YOU LOSE YOUR DATA FOREVER.

--------------------------------------------------
1. MASTER PASSWORD
--------------------------------------------------
${sessionPassword}

(Note: If you delete this file, you must memorize this password.)

--------------------------------------------------
2. VAULT TOKEN (The "Data")
--------------------------------------------------
${vaultString}

--------------------------------------------------
HOW TO RESTORE:
1. Open the Bastion App.
2. Drag and drop this text file into the login box.
   (Or copy the Vault Token above and paste it).
3. Ensure the Master Password matches.
4. Click Decrypt.
==================================================`;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bastion-Rescue-Kit-v${vaultState.version}-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyVaultString = () => {
      navigator.clipboard.writeText(vaultString);
      setCopiedString(true);
      setTimeout(() => setCopiedString(false), 2000);
  };

  // ROUTER LOGIC
  if (!vaultState) {
    if (publicPage === 'news') {
        return <NewsPage onNavigate={setPublicPage} />;
    }
    if (publicPage === 'documents') {
        return <DocumentsPage onNavigate={setPublicPage} />;
    }
    if (publicPage === 'auth') {
        return <AuthScreen onOpen={handleOpenVault} onNavigate={setPublicPage} />;
    }
    // Default to Landing Page
    return <LandingPage onNavigate={setPublicPage} />;
  }

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30 pb-20 bg-hex relative overflow-hidden">
      {/* Security Overlay Layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950 pointer-events-none z-0"></div>
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent"></div>

      {/* ROLLBACK ALERT BANNER (BLOCKING) */}
      {rollbackAlert && (
          <div className="fixed inset-x-0 top-0 z-[100] bg-red-950/95 backdrop-blur-xl border-b-2 border-red-500 p-6 shadow-2xl animate-in slide-in-from-top duration-300">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                      <div className="p-4 bg-red-900 rounded-full border-2 border-red-500 animate-pulse text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                          <AlertOctagon size={32} />
                      </div>
                      <div>
                          <h3 className="font-black text-white text-xl tracking-tight uppercase">Security Integrity Alert</h3>
                          <div className="text-red-200 text-sm font-mono mt-1 space-y-1">
                              <p>System detected a state regression.</p>
                              <div className="flex gap-4">
                                  <span className="text-white bg-red-900/50 px-2 py-0.5 rounded">Current: v{rollbackAlert.current}</span>
                                  <span className="text-white bg-red-900/50 px-2 py-0.5 rounded">Sentinel: v{rollbackAlert.known}</span>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-4">
                      <Button variant="danger" onClick={handleAcceptRollback} className="whitespace-nowrap shadow-red-900/50">
                          <AlertTriangle size={18} /> Force Load (Fork State)
                      </Button>
                      <Button variant="secondary" onClick={handleUnmount} className="whitespace-nowrap">
                          <LogOut size={18} /> Abort
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* HUD Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-white/5 supports-[backdrop-filter]:bg-slate-950/40 transition-all duration-500 ${rollbackAlert ? 'blur-sm grayscale opacity-50 pointer-events-none' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <BrandLogo size={28} className="drop-shadow-lg" />
                    <div>
                        <div className="font-bold text-lg text-white leading-none tracking-tight">Bastion<span className="text-indigo-400"></span></div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Secure Enclave</div>
                    </div>
                </div>
                
                {/* Desktop Nav */}
                <div className="flex items-center gap-6">
                    <nav className="hidden md:flex bg-slate-900/50 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
                        <NavButton active={currentTab === AppTab.VAULT} onClick={() => setCurrentTab(AppTab.VAULT)} icon={<Fingerprint size={14} />}>Logins</NavButton>
                        <NavButton active={currentTab === AppTab.NOTES} onClick={() => setCurrentTab(AppTab.NOTES)} icon={<Book size={14} />}>Notebook</NavButton>
                        <NavButton active={currentTab === AppTab.CONTACTS} onClick={() => setCurrentTab(AppTab.CONTACTS)} icon={<Users size={14} />}>People</NavButton>
                        <NavButton active={currentTab === AppTab.LOCKER} onClick={() => setCurrentTab(AppTab.LOCKER)} icon={<FileLock2 size={14} />}>Locker</NavButton>
                        <NavButton active={currentTab === AppTab.AUDITOR} onClick={() => setCurrentTab(AppTab.AUDITOR)} icon={<Cpu size={14} />}>AI</NavButton>
                        <NavButton active={currentTab === AppTab.EXTENSIONS} onClick={() => setCurrentTab(AppTab.EXTENSIONS)} icon={<Blocks size={14} />}>Plugins</NavButton>
                    </nav>
                    <button 
                        onClick={handleUnmount} 
                        className={`hidden md:flex items-center gap-2 text-xs font-bold transition-all px-3 py-2 rounded-lg border ${confirmExit ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-red-400 border-transparent hover:bg-white/5'}`}
                    >
                        {confirmExit ? <AlertTriangle size={14} /> : <LogOut size={14} />} 
                        {confirmExit ? 'CONFIRM EXIT' : 'EXIT'}
                    </button>
                </div>
            </div>

            {/* Critical Data Display (The Token) */}
            <div className="mt-4 relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-xl opacity-20 blur transition duration-500 group-hover:opacity-40"></div>
                <div className="relative bg-slate-900 rounded-xl border border-white/10 flex items-stretch overflow-hidden shadow-2xl">
                    
                    {/* Status Indicator */}
                    <div className="hidden sm:flex w-12 bg-slate-800/50 items-center justify-center border-r border-white/5">
                        <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : rollbackAlert ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
                         <div className="flex justify-between items-center mb-1">
                             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${rollbackAlert ? 'bg-red-500' : 'bg-slate-600'}`}></span>
                                Live Vault Token
                             </div>
                             <div className="flex items-center gap-3 text-[9px] font-mono text-slate-500">
                                {isSyncing ? (
                                    <span className="text-amber-400 animate-pulse">ENCRYPTING...</span>
                                ) : (
                                    <>
                                        <span className={`flex items-center gap-1 ${rollbackAlert ? 'text-red-400 font-bold' : ''}`}><History size={10} /> v{vaultState.version}</span>
                                        <span>LAST_WRITE: {new Date(vaultState.lastModified).toLocaleTimeString()}</span>
                                    </>
                                )}
                             </div>
                         </div>
                         <div 
                            className="font-mono text-xs text-slate-400 truncate opacity-70 group-hover:opacity-100 transition-opacity select-all cursor-text" 
                            onClick={(e) => {
                                const range = document.createRange();
                                range.selectNodeContents(e.currentTarget);
                                const selection = window.getSelection();
                                selection?.removeAllRanges();
                                selection?.addRange(range);
                            }} 
                            title="Your encrypted vault state"
                        >
                             {vaultString}
                         </div>
                    </div>

                    {/* Actions */}
                    <div className="flex border-l border-white/5">
                        <button 
                            onClick={downloadRescueKit}
                            className="px-6 flex flex-col items-center justify-center bg-white/0 hover:bg-white/5 text-slate-400 hover:text-indigo-400 transition-colors border-r border-white/5 group/btn"
                        >
                            <Download size={18} />
                            <span className="text-[9px] font-bold mt-1 tracking-wider group-hover/btn:text-indigo-300">BACKUP KIT</span>
                        </button>
                        <button 
                            onClick={copyVaultString}
                            className={`px-5 flex flex-col items-center justify-center transition-all duration-300 ${copiedString ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/0 hover:bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                            {copiedString ? <Check size={18} /> : <Copy size={18} />}
                            <span className="text-[9px] font-bold mt-1 tracking-wider">{copiedString ? 'COPIED' : 'COPY'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </header>

      {/* Mobile Nav Bottom */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 p-2 grid grid-cols-6 gap-1 transition-all duration-500 ${rollbackAlert ? 'blur-sm grayscale opacity-50 pointer-events-none' : ''}`}>
         <MobileNavBtn active={currentTab === AppTab.VAULT} onClick={() => setCurrentTab(AppTab.VAULT)} icon={<Fingerprint size={18} />} label="Logins" />
         <MobileNavBtn active={currentTab === AppTab.NOTES} onClick={() => setCurrentTab(AppTab.NOTES)} icon={<Book size={18} />} label="Notebook" />
         <MobileNavBtn active={currentTab === AppTab.CONTACTS} onClick={() => setCurrentTab(AppTab.CONTACTS)} icon={<Users size={18} />} label="People" />
         <MobileNavBtn active={currentTab === AppTab.LOCKER} onClick={() => setCurrentTab(AppTab.LOCKER)} icon={<FileLock2 size={18} />} label="Files" />
         <MobileNavBtn active={currentTab === AppTab.AUDITOR} onClick={() => setCurrentTab(AppTab.AUDITOR)} icon={<Cpu size={18} />} label="AI" />
         <MobileNavBtn active={currentTab === AppTab.EXTENSIONS} onClick={() => setCurrentTab(AppTab.EXTENSIONS)} icon={<Blocks size={18} />} label="Plugins" />
      </div>

      <main className={`max-w-4xl mx-auto px-4 py-8 relative z-10 transition-all duration-500 ${rollbackAlert ? 'blur-md pointer-events-none opacity-50 select-none grayscale' : ''}`}>
        {currentTab === AppTab.VAULT && <Vault configs={vaultState.configs} masterSeed={vaultState.entropy} onAddConfig={handleAddConfig} onDeleteConfig={handleDeleteConfig} onUpdateConfig={handleUpdateConfig} />}
        {currentTab === AppTab.NOTES && <Notes notes={vaultState.notes} onSave={handleSaveNote} onDelete={handleDeleteNote} />}
        {currentTab === AppTab.CONTACTS && <Contacts contacts={vaultState.contacts || []} onSave={handleSaveContact} onDelete={handleDeleteContact} />}
        {currentTab === AppTab.LOCKER && <Locker entries={vaultState.locker || []} onLock={handleLockEntry} onDelete={handleDeleteLockerEntry} />}
        {currentTab === AppTab.AUDITOR && <AIAuditor />}
        {currentTab === AppTab.EXTENSIONS && <Extensions />}
      </main>
    </div>
  );
}

const NavButton = ({active, onClick, icon, children}: any) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${active ? 'bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)] border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}>
        {icon} {children}
    </button>
);

const MobileNavBtn = ({active, onClick, icon, label}: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all ${active ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}>
        {icon}
        <span className="text-[9px] font-medium">{label}</span>
    </button>
);