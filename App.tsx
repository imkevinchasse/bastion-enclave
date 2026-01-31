
import React, { useState, useEffect, useRef } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';
import { Vault } from './components/Vault';
import { AIAuditor } from './components/AIAuditor';
import { Notes } from './components/Notes';
import { Locker } from './components/Locker';
import { Contacts } from './components/Contacts';
import { Extensions } from './components/Extensions';
import { Sandbox } from './components/Sandbox';
import { NewsPage } from './components/NewsPage';
import { DocumentsPage } from './components/DocumentsPage';
import { GamePage } from './components/GamePage';
import { DocsPage } from './components/DocsPage'; 
import { DeveloperConsole } from './components/DeveloperConsole';
import { SecurityMonitor } from './components/SecurityMonitor'; 
import { Generator } from './components/Generator';
import { BreachPage } from './components/BreachPage';
import { MigrationModal } from './components/MigrationModal';
import { VaultConfig, AppTab, VaultState, PublicPage, VaultFlags, BreachStats } from './types';
import { ChaosLock, ChaosEngine } from './services/cryptoService';
import { BreachService } from './services/breachService';
import { Guardrail } from './services/guardrail';
import { Shield, LogOut, Terminal, Copy, Check, Layers, Cpu, Book, FileLock2, Users, Download, AlertTriangle, Blocks, Fingerprint, AlertOctagon, RefreshCw, FlaskConical } from 'lucide-react';
import { Button } from './components/Button';
import { BrandLogo } from './components/BrandLogo';

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

export default function App() {
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [sessionPassword, setSessionPassword] = useState<string>('');
  const [vaultString, setVaultString] = useState<string>('');
  
  // Backup Tracking
  const [lastBackupTime, setLastBackupTime] = useState<number>(0);
  const [hasCopiedSeed, setHasCopiedSeed] = useState(false);
  
  // Public Routing State
  const [publicPage, setPublicPage] = useState<PublicPage>('landing');

  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.VAULT);
  
  // Modals & Notifications
  const [showExitModal, setShowExitModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  // Sentinel State (Rollback Protection)
  const [rollbackAlert, setRollbackAlert] = useState<{current: number, known: number} | null>(null);

  // Background Scanning State
  const [breachReport, setBreachReport] = useState<{count: number, items: string[]} | null>(null);
  const isScanningRef = useRef(false);

  // Dev Mode Detection
  const isDeveloper = vaultState ? ((vaultState.flags || 0) & VaultFlags.DEVELOPER) === VaultFlags.DEVELOPER : false;

  // --- EFFECT: Browser Close Protection ---
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          const hasUnsavedChanges = vaultState && vaultState.lastModified > lastBackupTime;
          if (hasUnsavedChanges && !hasCopiedSeed) {
              e.preventDefault();
              e.returnValue = ''; 
          }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [vaultState, lastBackupTime, hasCopiedSeed]);

  // --- EFFECT: Automatic Breach Scan (Compliant) ---
  useEffect(() => {
      if (!vaultState) return;

      const runAutoScan = async () => {
          if (isScanningRef.current) return;

          // 1. Identify Stale Items (Last check > 7 days or never checked)
          const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
          const now = Date.now();
          
          const staleConfigs = vaultState.configs.filter(c => {
              if (!c.breachStats) return true; // Never checked
              return (now - c.breachStats.lastChecked) > SEVEN_DAYS;
          });

          if (staleConfigs.length === 0) return; // Nothing to do

          console.log(`[Bastion] Starting compliance audit for ${staleConfigs.length} stale items.`);
          isScanningRef.current = true;

          const compromisedItems: string[] = [];
          const compromisedNames: string[] = [];

          try {
              // Iterate sequentially to enforce rate limits
              for (const config of staleConfigs) {
                  if (!isScanningRef.current) break;

                  // 1. Generate Password (In-Memory)
                  const password = await ChaosEngine.transmute(vaultState.entropy, config);
                  
                  // 2. Check Breach (API)
                  const pwnCount = await BreachService.checkPassword(password);
                  
                  // 3. Construct Result
                  const stats: BreachStats = {
                      status: pwnCount > 0 ? 'compromised' : 'clean',
                      lastChecked: Date.now(),
                      seenCount: pwnCount
                  };

                  // 4. Update Local State (Persist Progress)
                  setVaultState(prev => {
                      if (!prev) return null;
                      const newConfigs = prev.configs.map(c => 
                          c.id === config.id ? { ...c, breachStats: stats } : c
                      );
                      const newState = { ...prev, configs: newConfigs };
                      handleUpdateVault(newState, true); 
                      return newState;
                  });

                  if (pwnCount > 0) {
                      compromisedItems.push(config.id);
                      compromisedNames.push(config.name);
                  }

                  // 5. Strict Rate Limiting (500ms)
                  await new Promise(r => setTimeout(r, 500));
              }

              if (compromisedItems.length > 0) {
                  setBreachReport({ count: compromisedItems.length, items: compromisedNames });
              }

          } catch (e: any) {
              console.warn("[Bastion] Scan paused:", e.message);
          } finally {
              isScanningRef.current = false;
          }
      };

      runAutoScan();

      return () => { isScanningRef.current = false; };
  }, [vaultState?.entropy]);

  const handleOpenVault = (
      state: VaultState, 
      encryptedBlob: string, 
      password: string, 
      isNew: boolean = false,
      isLegacy: boolean = false
  ) => {
    try {
        // Enforce Schema Correctness immediately upon load
        Guardrail.validateSchema(state);
    } catch (e: any) {
        alert("CRITICAL ERROR: Vault Integrity Check Failed.\n" + e.message);
        return;
    }

    // Migration: Migrate boolean 'compromised' to new 'breachStats' if missing
    state.configs = state.configs.map(c => {
        if (c.compromised && !c.breachStats) {
            return {
                ...c,
                breachStats: {
                    status: 'compromised',
                    lastChecked: Date.now(),
                    seenCount: 1 
                },
                compromised: undefined 
            };
        }
        return c;
    });

    // Ensure safe defaults
    if (!state.notes) state.notes = [];
    if (!state.locker) state.locker = [];
    if (!state.contacts) state.contacts = [];
    if (!state.version) state.version = 0;
    if (!state.lastModified) state.lastModified = Date.now();
    if (!state.flags) state.flags = 0;

    // Sentinel Check
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
    
    setLastBackupTime(isNew ? 0 : Date.now());
    setHasCopiedSeed(false);

    if (isLegacy) {
        handleUpdateVault(state, true);
        setShowMigrationModal(true);
    }
  };

  const handleUpdateVault = async (newState: VaultState, silent: boolean = false) => {
    // 1. Prepare next state (Optimistic)
    const nextVersion = (newState.version || 0) + 1;
    const proposedState = {
        ...newState,
        version: nextVersion,
        lastModified: Date.now()
    };

    // 2. Behavioral Fingerprint Guard
    if (vaultState) {
        try {
            Guardrail.validateTransition(vaultState, proposedState);
        } catch (e: any) {
            console.error(e);
            alert("Security Protocol Violation: " + e.message);
            return; // Reject update
        }
    }

    // 3. Commit
    const encrypted = await ChaosLock.pack(proposedState, sessionPassword);
    
    if (!silent) {
        setVaultState(proposedState);
        setVaultString(encrypted);
    }
    
    localStorage.setItem('BASTION_VAULT', encrypted);
    localStorage.setItem('BASTION_MAX_VERSION', nextVersion.toString());
    
    if (rollbackAlert && nextVersion >= rollbackAlert.known) {
        setRollbackAlert(null);
    }
  };

  const handleBackup = () => {
    const blob = new Blob([vaultString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BASTION_BACKUP_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setLastBackupTime(Date.now());
  };

  const handleCopySeed = () => {
      if (vaultState) {
          navigator.clipboard.writeText(vaultState.entropy);
          setHasCopiedSeed(true);
      }
  };

  const handleLogout = () => {
      const hasUnsavedChanges = vaultState && vaultState.lastModified > lastBackupTime;
      if (hasUnsavedChanges && !hasCopiedSeed) {
          setShowExitModal(true);
      } else {
          performLogout();
      }
  };

  const performLogout = () => {
      setVaultState(null);
      setSessionPassword('');
      setVaultString('');
      setLastBackupTime(0);
      setHasCopiedSeed(false);
      setShowExitModal(false);
      setShowMigrationModal(false);
      setBreachReport(null);
      isScanningRef.current = false;
  };

  // --- RENDER ROUTER ---

  const renderContent = () => {
    if (publicPage === 'landing' && !vaultState) return <LandingPage onNavigate={setPublicPage} />;
    if (publicPage === 'news' && !vaultState) return <NewsPage onNavigate={setPublicPage} />;
    if (publicPage === 'documents' && !vaultState) return <DocumentsPage onNavigate={setPublicPage} />;
    if (publicPage === 'game' && !vaultState) return <GamePage onNavigate={setPublicPage} />;
    if (publicPage === 'docs' && !vaultState) return <DocsPage onNavigate={setPublicPage} />;
    if (publicPage === 'breach' && !vaultState) return <BreachPage onNavigate={setPublicPage} />;
    if (!vaultState) return <AuthScreen onOpen={handleOpenVault} onNavigate={setPublicPage} />;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row">
          
          <SecurityMonitor />

          {/* Desktop Sidebar */}
          <aside className="hidden md:flex w-64 bg-slate-900 border-r border-white/5 flex-col p-4 shrink-0 z-30">
              <div className="flex items-center gap-3 px-2 mb-8 mt-2 cursor-pointer group" onClick={() => setPublicPage('landing')}>
                  <BrandLogo size={32} className="drop-shadow-lg group-hover:brightness-125 transition-all" />
                  <div>
                      <h1 className="font-bold text-white text-lg tracking-tight leading-none group-hover:text-indigo-200 transition-colors">Bastion Enclave</h1>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          SECURE_V2.6
                      </div>
                  </div>
              </div>

              <div className="space-y-1 flex-1">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-widest px-3 mb-2 mt-4">Vault Access</div>
                  <SidebarBtn active={currentTab === AppTab.VAULT} onClick={() => setCurrentTab(AppTab.VAULT)} icon={<Shield size={18}/>} label="Logins" />
                  <SidebarBtn active={currentTab === AppTab.CONTACTS} onClick={() => setCurrentTab(AppTab.CONTACTS)} icon={<Users size={18}/>} label="People" />
                  <SidebarBtn active={currentTab === AppTab.NOTES} onClick={() => setCurrentTab(AppTab.NOTES)} icon={<Book size={18}/>} label="Notes" />
                  <SidebarBtn active={currentTab === AppTab.LOCKER} onClick={() => setCurrentTab(AppTab.LOCKER)} icon={<FileLock2 size={18}/>} label="Locker" />
                  
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-widest px-3 mb-2 mt-6">Utilities</div>
                  <SidebarBtn active={currentTab === AppTab.GENERATOR} onClick={() => setCurrentTab(AppTab.GENERATOR)} icon={<RefreshCw size={18}/>} label="Generator" />
                  <SidebarBtn active={currentTab === AppTab.AUDITOR} onClick={() => setCurrentTab(AppTab.AUDITOR)} icon={<Cpu size={18}/>} label="Neural Auditor" />
                  <SidebarBtn active={currentTab === AppTab.EXTENSIONS} onClick={() => setCurrentTab(AppTab.EXTENSIONS)} icon={<Blocks size={18}/>} label="Extensions" />
                  <SidebarBtn active={currentTab === AppTab.SANDBOX} onClick={() => setCurrentTab(AppTab.SANDBOX)} icon={<FlaskConical size={18}/>} label="Sandbox" />
                  
                  {isDeveloper && (
                      <>
                          <div className="text-xs font-bold text-amber-600 uppercase tracking-widest px-3 mb-2 mt-6">Root Access</div>
                          <SidebarBtn active={currentTab === AppTab.DEVELOPER} onClick={() => setCurrentTab(AppTab.DEVELOPER)} icon={<Terminal size={18}/>} label="Console" activeClass="bg-amber-900/20 text-amber-400 border-amber-500/20" />
                      </>
                  )}
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
                  <button 
                      onClick={handleBackup}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                  >
                      <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" /> Backup Kit
                      {vaultState.lastModified > lastBackupTime && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-auto"></span>}
                  </button>
                  <button 
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  >
                      <LogOut size={18} /> Lock Vault
                  </button>
              </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
              
              {/* Mobile Header */}
              <header className="md:hidden bg-slate-900/90 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-4 sticky top-0 z-20">
                  <div className="flex items-center gap-3">
                      <BrandLogo size={24} />
                      <span className="font-bold text-white tracking-tight">Bastion Enclave</span>
                  </div>
                  <button onClick={handleLogout} className="text-slate-400 hover:text-white">
                      <LogOut size={20} />
                  </button>
              </header>

              {/* Desktop Header */}
              <header className="hidden md:flex bg-slate-900/50 backdrop-blur-md border-b border-white/5 h-16 items-center justify-between px-6 sticky top-0 z-20">
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                      <button 
                          onClick={handleCopySeed}
                          className={`flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full border transition-all cursor-pointer group ${hasCopiedSeed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/5'}`}
                          title="Click to copy full Master Seed"
                      >
                          <Fingerprint size={12} className={hasCopiedSeed ? "text-emerald-400" : "text-slate-400"} />
                          <span className={`font-mono transition-colors ${hasCopiedSeed ? "text-emerald-100" : "text-slate-400"}`}>
                              {vaultState.entropy.substring(0, 12)}...
                          </span>
                          {hasCopiedSeed ? (
                              <Check size={12} className="text-emerald-400" />
                          ) : (
                              <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                          )}
                      </button>

                      {rollbackAlert && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-red-900/30 text-red-400 rounded-full border border-red-500/30 animate-pulse font-bold">
                              <AlertOctagon size={12} /> ROLLBACK DETECTED (v{rollbackAlert.current} vs v{rollbackAlert.known})
                          </div>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                      {/* Status Indicators */}
                      {(vaultState.lastModified > lastBackupTime && !hasCopiedSeed) && (
                          <span className="text-xs text-amber-500 font-bold flex items-center gap-1 mr-4 animate-in fade-in">
                              <AlertTriangle size={12} /> Unsaved Changes
                          </span>
                      )}
                  </div>
              </header>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 relative">
                  {/* Background Decor */}
                  <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none -z-10"></div>
                  
                  <div className="max-w-6xl mx-auto">
                      {currentTab === AppTab.VAULT && (
                          <Vault 
                              configs={vaultState.configs} 
                              masterSeed={vaultState.entropy}
                              onAddConfig={(c) => handleUpdateVault({...vaultState, configs: [...vaultState.configs, c]})}
                              onDeleteConfig={(id) => handleUpdateVault({...vaultState, configs: vaultState.configs.filter(c => c.id !== id)})}
                              onUpdateConfig={(c) => handleUpdateVault({...vaultState, configs: vaultState.configs.map(old => old.id === c.id ? c : old)})}
                              onUpdateAllConfigs={(newConfigs) => handleUpdateVault({...vaultState, configs: newConfigs})}
                          />
                      )}
                      {currentTab === AppTab.CONTACTS && (
                          <Contacts 
                              contacts={vaultState.contacts}
                              onSave={(c) => {
                                  const exists = vaultState.contacts.find(x => x.id === c.id);
                                  const newContacts = exists 
                                      ? vaultState.contacts.map(x => x.id === c.id ? c : x)
                                      : [...vaultState.contacts, c];
                                  handleUpdateVault({...vaultState, contacts: newContacts});
                              }}
                              onDelete={(id) => handleUpdateVault({...vaultState, contacts: vaultState.contacts.filter(c => c.id !== id)})}
                          />
                      )}
                      {currentTab === AppTab.NOTES && (
                          <Notes 
                              notes={vaultState.notes}
                              onSave={(n) => {
                                  const exists = vaultState.notes.find(x => x.id === n.id);
                                  const newNotes = exists
                                      ? vaultState.notes.map(x => x.id === n.id ? n : x)
                                      : [...vaultState.notes, n];
                                  handleUpdateVault({...vaultState, notes: newNotes});
                              }}
                              onDelete={(id) => handleUpdateVault({...vaultState, notes: vaultState.notes.filter(n => n.id !== id)})}
                          />
                      )}
                      {currentTab === AppTab.LOCKER && (
                          <Locker 
                              entries={vaultState.locker}
                              onLock={(entry) => handleUpdateVault({...vaultState, locker: [...vaultState.locker, entry]})}
                              onDelete={(id) => handleUpdateVault({...vaultState, locker: vaultState.locker.filter(e => e.id !== id)})}
                          />
                      )}
                      
                      {currentTab === AppTab.GENERATOR && (
                          <div className="max-w-3xl mx-auto">
                               <Button variant="ghost" onClick={() => setCurrentTab(AppTab.VAULT)} className="mb-4"><Layers size={16}/> Return to Vault</Button>
                               <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 shadow-2xl">
                                  <div className="max-w-xl mx-auto">
                                      <Generator />
                                  </div>
                               </div>
                          </div>
                      )}

                      {currentTab === AppTab.AUDITOR && <AIAuditor />}
                      {currentTab === AppTab.EXTENSIONS && <Extensions />}
                      {currentTab === AppTab.SANDBOX && <Sandbox />}
                      {currentTab === AppTab.DEVELOPER && isDeveloper && (
                          <DeveloperConsole 
                              state={vaultState} 
                              onUpdate={handleUpdateVault} 
                              onForceExit={performLogout} 
                          />
                      )}
                  </div>
              </div>

              {/* Mobile Bottom Nav */}
              <div className="md:hidden bg-slate-900 border-t border-white/5 px-6 py-3 flex justify-between items-center z-30 pb-safe">
                  <MobileNavBtn active={currentTab === AppTab.VAULT} onClick={() => setCurrentTab(AppTab.VAULT)} icon={<Shield size={20}/>} label="Vault" />
                  <MobileNavBtn active={currentTab === AppTab.NOTES} onClick={() => setCurrentTab(AppTab.NOTES)} icon={<Book size={20}/>} label="Notes" />
                  <div className="relative -top-6">
                      <button onClick={handleBackup} className="bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-500/40 border-4 border-slate-950 active:scale-95 transition-transform">
                          <Download size={24} />
                      </button>
                  </div>
                  <MobileNavBtn active={currentTab === AppTab.LOCKER} onClick={() => setCurrentTab(AppTab.LOCKER)} icon={<FileLock2 size={20}/>} label="Locker" />
                  <MobileNavBtn active={currentTab === AppTab.AUDITOR} onClick={() => setCurrentTab(AppTab.AUDITOR)} icon={<Cpu size={20}/>} label="AI Audit" />
              </div>
          </main>

          {/* Notifications & Modals */}
          
          {showMigrationModal && (
              <MigrationModal 
                  onDismiss={() => setShowMigrationModal(false)}
                  onDownloadBackup={handleBackup}
              />
          )}

          {/* Breach Report Modal */}
          {breachReport && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-in zoom-in-95">
                      <div className="bg-red-900/20 p-6 border-b border-red-500/20 flex items-center gap-4">
                          <div className="p-3 bg-red-500/20 rounded-full text-red-500">
                              <AlertOctagon size={32} />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-white">Security Report</h3>
                              <p className="text-red-300 text-sm">Automatic scan results</p>
                          </div>
                      </div>
                      
                      <div className="p-6 space-y-6">
                          <div className="text-center">
                              <p className="text-slate-300 mb-2">
                                  Your background audit identified 
                                  <strong className="text-red-400 text-lg mx-1">{breachReport.count}</strong> 
                                  credentials appearing in known breaches.
                              </p>
                              <div className="text-xs text-slate-500 bg-black/20 p-2 rounded">
                                  Affected: {breachReport.items.slice(0, 3).join(", ")}
                                  {breachReport.items.length > 3 && ` +${breachReport.items.length - 3} more`}
                              </div>
                          </div>

                          <div className="p-4 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-200/80">
                              <strong className="block text-red-400 mb-1 uppercase tracking-wider">Action Required</strong>
                              We cannot determine the specific breach source. Reuse of these passwords significantly increases your risk. Rotate them immediately.
                          </div>

                          <div className="flex gap-3">
                              <Button onClick={() => setBreachReport(null)} className="w-full">
                                  Review Vault
                              </Button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* Exit Modal */}
          {showExitModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 text-amber-500">
                          <AlertTriangle size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Unsaved Changes</h3>
                      <p className="text-slate-400 text-sm mb-6">
                          You have changes that haven't been backed up to a file yet. 
                          If you lock the vault now, these changes exist only in your browser cache.
                      </p>
                      <div className="space-y-3">
                          <Button onClick={() => { handleBackup(); performLogout(); }} className="w-full">
                              Download Backup & Lock
                          </Button>
                          <Button variant="danger" onClick={performLogout} className="w-full">
                              Discard & Lock
                          </Button>
                          <Button variant="ghost" onClick={() => setShowExitModal(false)} className="w-full">
                              Cancel
                          </Button>
                      </div>
                  </div>
              </div>
          )}

      </div>
    );
  };

  return (
    <>
      {renderContent()}
    </>
  );
}

const SidebarBtn = ({active, onClick, icon, label, activeClass}: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-medium transition-all duration-200 group ${
            active 
                ? (activeClass || 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20') 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`}
    >
        <span className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
        {label}
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50"></span>}
    </button>
);
