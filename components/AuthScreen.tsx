import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { TopNav } from './TopNav';
import { Lock, Unlock, FileKey2, RefreshCw, Copy, Check, Eye, EyeOff, ShieldAlert, KeyRound, FileDown, HelpCircle, Upload, Zap, PlugZap, Hexagon, HardDrive, Trash2 } from 'lucide-react';
import { ChaosLock, ChaosEngine } from '../services/cryptoService';
import { VaultState } from '../types';

interface AuthScreenProps {
  onOpen: (state: VaultState, blob: string, password: string) => void;
  onNavigate: (page: 'landing' | 'auth' | 'news' | 'documents') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onOpen, onNavigate }) => {
  const [tab, setTab] = useState<'open' | 'create'>('open');
  const [password, setPassword] = useState('');
  const [blob, setBlob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Extension & Local Storage State
  const [extensionData, setExtensionData] = useState<{blob: string, pwd: string} | null>(null);
  const [localVaultFound, setLocalVaultFound] = useState(false);

  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'BASTION_RESTORE' && event.data.payload) {
              setExtensionData(event.data.payload);
          }
      };
      window.addEventListener('message', handleMessage);
      
      // Check Local Storage for existing vault
      const storedBlob = localStorage.getItem('BASTION_VAULT');
      if (storedBlob) {
          setBlob(storedBlob);
          setLocalVaultFound(true);
      }

      return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExtensionRestore = async () => {
      if (!extensionData) return;
      setLoading(true);
      try {
          const state = await ChaosLock.unpack(extensionData.blob.trim(), extensionData.pwd);
          // Compatibility checks
          if (!state.notes) state.notes = [];
          if (!state.locker) state.locker = [];
          if (!state.contacts) state.contacts = [];
          onOpen(state, extensionData.blob.trim(), extensionData.pwd);
      } catch (e) {
          setError("Extension data invalid or corrupted.");
      } finally {
          setLoading(false);
      }
  };

  const clearLocalVault = () => {
      if (confirm("Are you sure? This will remove the locally cached vault. You will need your Backup Kit to log in again.")) {
          // Wipe entire state
          localStorage.removeItem('BASTION_VAULT');
          localStorage.removeItem('BASTION_MAX_VERSION'); // Sentinel Reset
          setBlob('');
          setLocalVaultFound(false);
      }
  };

  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    const len = 32;
    const array = new Uint32Array(len);
    window.crypto.getRandomValues(array);
    return Array.from(array).map(x => chars[x % chars.length]).join('');
  };

  useEffect(() => {
    if (tab === 'create') {
        setPassword(generateStrongPassword());
        setShowPassword(true);
    } else {
        setPassword('');
        setShowPassword(false);
    }
  }, [tab]);

  const handleRegeneratePassword = () => {
      setPassword(generateStrongPassword());
      setCopiedPassword(false);
  };

  const handleCopyPassword = () => {
      navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
  };

  const generateRescueKit = (pwd: string, token: string) => {
      return `BASTION SECURE VAULT - EMERGENCY RESCUE KIT\n==================================================\nCREATED: ${new Date().toLocaleString()}\n\nIMPORTANT: PRINT THIS PAGE AND KEEP IT SAFE.
IF YOU LOSE THIS FILE, YOU LOSE YOUR DATA FOREVER.\n\n--------------------------------------------------\n1. MASTER PASSWORD\n--------------------------------------------------\n${pwd}\n\n--------------------------------------------------\n2. VAULT TOKEN (The "Data")\n--------------------------------------------------\n${token}\n\n==================================================`;
  };

  const handleDownloadRescueKit = async () => {
      const entropy = ChaosEngine.generateEntropy();
      const initialState: VaultState = { 
          entropy, 
          configs: [], 
          notes: [], 
          contacts: [], 
          locker: [],
          version: 1,
          lastModified: Date.now()
      };
      const tempBlob = await ChaosLock.pack(initialState, password);
      const content = generateRescueKit(password, tempBlob);
      const blobObj = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blobObj);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bastion-Rescue-Kit-${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
    }
    setLoading(true);
    const entropy = ChaosEngine.generateEntropy();
    const initialState: VaultState = { 
        entropy, 
        configs: [], 
        notes: [], 
        contacts: [], 
        locker: [],
        version: 1,
        lastModified: Date.now()
    };
    try {
        const newBlob = await ChaosLock.pack(initialState, password);
        onOpen(initialState, newBlob, password);
    } catch (e) {
        setError("Initialization failed");
    } finally {
        setLoading(false);
    }
  };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blob) {
        setError("Please paste your Vault Token or drop your Rescue Kit.");
        return;
    }
    setLoading(true);
    setError('');
    try {
        const state = await ChaosLock.unpack(blob.trim(), password);
        if (!state.notes) state.notes = [];
        if (!state.locker) state.locker = [];
        if (!state.contacts) state.contacts = [];
        onOpen(state, blob.trim(), password);
    } catch (e) {
        await new Promise(r => setTimeout(r, 1000));
        setError("Decryption failed. Wrong password or invalid token.");
    } finally {
        setLoading(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
          try {
              const text = await file.text();
              if (text.includes("BASTION SECURE VAULT")) {
                   const tokenPart = text.split("2. VAULT TOKEN")[1];
                   if (tokenPart) setBlob(tokenPart.split("--------------------------------------------------")[1]?.trim());
                   const passPart = text.split("1. MASTER PASSWORD")[1];
                   if (passPart) {
                       setPassword(passPart.split("--------------------------------------------------")[1]?.trim());
                       setShowPassword(true);
                   }
              } else {
                  setBlob(text.trim());
              }
              // If we drop a file, we treat it as found
              setLocalVaultFound(true);
          } catch(err) {
              setError("Could not read file.");
          }
      }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950 font-sans text-slate-200">
        
        {/* Dynamic Space Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-grid opacity-20"></div>
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute top-[40%] right-[0%] w-[50%] h-[60%] bg-emerald-900/10 rounded-full blur-[100px]"></div>
            <div className="absolute inset-0 opacity-30" style={{background: 'radial-gradient(circle at center, transparent 0%, #020617 100%)'}}></div>
        </div>

        {/* Global Nav */}
        <TopNav active="auth" onNavigate={onNavigate} />

        {/* Content Wrapper */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-[1600px] mx-auto w-full p-4 pt-24">
            
            <div className="w-full max-w-md flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                
                {/* 3D Visual Decorator (CSS) */}
                <div className="relative w-full">
                    {/* Glowing Ring */}
                    <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 via-violet-500 to-emerald-500 rounded-2xl opacity-30 blur-xl animate-pulse"></div>
                    
                    {/* Glass Container */}
                    <div className="relative bg-slate-900/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                        
                        {/* Holographic Header */}
                        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-white/50 to-emerald-500 w-full"></div>
                        
                        {/* Tabs */}
                        <div className="flex border-b border-white/5 bg-black/20">
                            <button 
                                onClick={() => {setTab('open'); setError('');}}
                                className={`flex-1 py-5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative ${tab === 'open' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Unlock size={14} className={tab === 'open' ? 'text-emerald-400' : ''}/> Access
                                {tab === 'open' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_-2px_10px_rgba(16,185,129,0.5)]"></div>}
                            </button>
                            <button 
                                onClick={() => {setTab('create'); setError('');}}
                                className={`flex-1 py-5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative ${tab === 'create' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Hexagon size={14} className={tab === 'create' ? 'text-indigo-400' : ''}/> Initialize
                                {tab === 'create' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_-2px_10px_rgba(99,102,241,0.5)]"></div>}
                            </button>
                        </div>

                        <div className="p-8">
                             {/* Help Toggle */}
                             <button onClick={() => setShowHelp(!showHelp)} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors z-20">
                                <HelpCircle size={18} />
                            </button>

                            {/* Help Overlay */}
                            {showHelp && (
                                <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-xl p-8 flex flex-col justify-center animate-in fade-in zoom-in-95">
                                    <h3 className="font-bold text-white mb-6 text-lg">System Manual</h3>
                                    <ul className="space-y-4 text-sm text-slate-300">
                                        <li className="flex gap-3"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0"/><span>Bastion is a stateless vault. We do not store your data.</span></li>
                                        <li className="flex gap-3"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0"/><span>The <strong>Rescue Kit</strong> is your only backup. It contains your encrypted payload.</span></li>
                                        <li className="flex gap-3"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0"/><span>Drag the kit file into the terminal to login instantly.</span></li>
                                    </ul>
                                    <Button size="sm" variant="secondary" onClick={() => setShowHelp(false)} className="mt-8 w-full">Acknowledge</Button>
                                </div>
                            )}

                            {tab === 'open' ? (
                                <form onSubmit={handleOpen} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-6">
                                        {extensionData ? (
                                            <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 animate-pulse">
                                                 <PlugZap size={32} className="text-emerald-400 mx-auto mb-2" />
                                                 <h2 className="text-white font-bold">Extension Linked</h2>
                                                 <p className="text-emerald-400/80 text-xs mt-1">Biometric handshake ready</p>
                                            </div>
                                        ) : localVaultFound ? (
                                             <div className="p-4 bg-slate-800/50 rounded-2xl border border-indigo-500/30 flex flex-col items-center">
                                                 <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-2 ring-2 ring-indigo-500/20 ring-offset-2 ring-offset-slate-900">
                                                     <HardDrive size={24} />
                                                 </div>
                                                 <h2 className="text-white font-bold text-sm">Local Encrypted Vault Found</h2>
                                                 <p className="text-slate-400 text-xs mt-1">Enter password to decrypt</p>
                                             </div>
                                        ) : (
                                            <div className="relative w-20 h-20 mx-auto mb-4">
                                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                                                <div className="relative bg-slate-900 border border-emerald-500/50 w-full h-full rounded-full flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                                    <Lock size={32} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {extensionData ? (
                                        <div className="space-y-4">
                                            <Button type="button" onClick={handleExtensionRestore} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 shadow-[0_0_25px_-5px_rgba(16,185,129,0.5)]" isLoading={loading}>
                                                <Zap size={18} /> Authenticate
                                            </Button>
                                            <button type="button" onClick={() => setExtensionData(null)} className="w-full text-xs text-slate-500 hover:text-white">Switch User</button>
                                        </div>
                                    ) : (
                                        <>
                                            {!localVaultFound && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                                                        <span>Encrypted Payload</span>
                                                        <span className="text-emerald-500 text-[9px] flex items-center gap-1"><Upload size={10}/> DRAG FILE HERE</span>
                                                    </label>
                                                    <div 
                                                        className={`relative group transition-all duration-300 ${isDragging ? 'scale-[1.02] ring-2 ring-emerald-500' : ''}`}
                                                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                                        onDragLeave={() => setIsDragging(false)}
                                                        onDrop={handleFileDrop}
                                                    >
                                                        <textarea 
                                                            value={blob}
                                                            onChange={e => setBlob(e.target.value)}
                                                            className={`w-full h-28 bg-black/40 border rounded-xl p-4 text-[10px] font-mono text-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none resize-none placeholder-slate-700 leading-relaxed custom-scrollbar ${isDragging ? 'border-emerald-500 bg-emerald-900/10' : 'border-white/10 focus:border-emerald-500/50'}`}
                                                            placeholder="&gt; Awaiting Input Stream..."
                                                        />
                                                        {isDragging && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur rounded-xl border-2 border-dashed border-emerald-500 text-emerald-400 font-bold text-sm tracking-widest">
                                                                IMPORT_KEY_FILE
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Decryption Key</label>
                                                <div className="relative">
                                                    <Input 
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••••••" 
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
                                                        className="bg-black/40 border-white/10 focus:ring-emerald-500/50 font-mono tracking-[0.2em] text-sm pr-10 text-white"
                                                        icon={<KeyRound size={16} />}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {error && (
                                                <div className="flex items-center gap-3 text-red-400 text-xs font-bold bg-red-950/40 p-3 rounded-lg border border-red-500/30 animate-in fade-in slide-in-from-top-2">
                                                    <ShieldAlert size={16} className="shrink-0" />
                                                    {error}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                {localVaultFound && (
                                                    <button type="button" onClick={clearLocalVault} className="px-3 rounded-xl border border-white/10 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Remove local vault">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-4 font-bold tracking-widest shadow-[0_0_20px_-5px_rgba(5,150,105,0.4)]" isLoading={loading}>
                                                    {localVaultFound ? 'UNLOCK_SYSTEM' : 'DECRYPT_VAULT'}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </form>
                            ) : (
                                <form onSubmit={handleCreate} className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                                    <div className="text-center mb-6">
                                        <div className="relative w-20 h-20 mx-auto mb-4">
                                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-pulse"></div>
                                            <div className="relative bg-slate-900 border border-indigo-500/50 w-full h-full rounded-full flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                                <FileKey2 size={32} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/20 text-indigo-200/80 text-xs leading-relaxed backdrop-blur-sm font-mono">
                                        &gt; GENERATING 512-BIT ENTROPY POOL<br/>
                                        &gt; ESTABLISHING SECURE CONTEXT<br/>
                                        &gt; WARNING: NO RECOVERY OPTION
                                    </div>

                                    {/* Password Generator */}
                                    <div className="space-y-2">
                                        <label className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <span>Generated Master Key</span>
                                            <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">STRONG</span>
                                        </label>
                                        
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <KeyRound size={16} className="text-indigo-500" />
                                            </div>
                                            <input 
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3 pl-10 pr-32 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all outline-none font-mono tracking-wider text-xs shadow-inner"
                                            />
                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-white/5 backdrop-blur">
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                <div className="w-px h-4 bg-white/10" />
                                                <button 
                                                    type="button"
                                                    onClick={handleRegeneratePassword}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-md transition-colors"
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={handleCopyPassword}
                                                    className={`p-1.5 rounded-md transition-all ${copiedPassword ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    {copiedPassword ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <Button 
                                        type="button" 
                                        onClick={handleDownloadRescueKit}
                                        variant="secondary"
                                        className="w-full border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-indigo-300 py-3 text-xs"
                                    >
                                        <FileDown size={16} /> DOWNLOAD_RESCUE_KIT
                                    </Button>

                                    {error && (
                                        <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-950/30 p-3 rounded-lg border border-red-500/20">
                                            <ShieldAlert size={14} className="shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 font-bold tracking-widest shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)]" isLoading={loading}>
                                        INITIALIZE_SYSTEM
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};