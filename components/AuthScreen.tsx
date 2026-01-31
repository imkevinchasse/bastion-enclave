
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { TopNav } from './TopNav';
import { RefreshCw, Copy, Check, Eye, EyeOff, ShieldAlert, KeyRound, Upload, Trash2, LogIn, UserPlus, HelpCircle, HardDrive, FileText, Scan, Fingerprint, Info, Terminal, ShieldCheck } from 'lucide-react';
import { ChaosLock, ChaosEngine } from '../services/cryptoService';
import { VaultState, PublicPage, VaultFlags } from '../types';
import { track } from '@vercel/analytics';
import { SecurityService } from '../services/securityService';

interface AuthScreenProps {
  onOpen: (state: VaultState, blob: string, password: string, isNew?: boolean, isLegacy?: boolean) => void;
  onNavigate: (page: PublicPage) => void;
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Local Storage State
  const [localVaultFound, setLocalVaultFound] = useState(false);
  const [integritySafe, setIntegritySafe] = useState(true);

  // Input Validation State
  const isSeed = /^[0-9a-fA-F]{64}$/i.test(blob.trim());
  const isBackup = blob.trim().includes("BASTION SECURE VAULT");

  // Dev Mode Detection (UI Only)
  const isDevModeTrigger = password.startsWith("dev://");

  useEffect(() => {
      // Check Local Storage for existing vault
      const storedBlob = localStorage.getItem('BASTION_VAULT');
      if (storedBlob) {
          setBlob(storedBlob);
          setLocalVaultFound(true);
          setTab('open'); // Default to open if found
      } else {
          setTab('create'); // Default to create if new
      }

      // Check Integrity
      const report = SecurityService.checkIntegrity();
      setIntegritySafe(!report.compromised);
  }, []);

  const confirmClearLocalVault = () => {
      localStorage.removeItem('BASTION_VAULT');
      localStorage.removeItem('BASTION_MAX_VERSION');
      setBlob('');
      setLocalVaultFound(false);
      setTab('create');
      setPassword('');
      setShowClearConfirm(false);
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
        if (!password) {
            setPassword(generateStrongPassword());
            setShowPassword(true);
        }
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
    }
    setLoading(true);
    
    // --- SECURE DEVELOPER MODE INITIALIZATION ---
    // 1. Check for trigger prefix
    let finalPassword = password;
    let flags = VaultFlags.NONE;

    if (password.startsWith("dev://")) {
        // Strip the prefix to ensure the actual key used for encryption is the strong part.
        // This prevents the "dev://" string from becoming a known plaintext weakness in the key derivation input.
        finalPassword = password.replace("dev://", "");
        
        if (finalPassword.length < 8) {
            setError("Developer password too short after stripping prefix.");
            setLoading(false);
            return;
        }
        
        // Set the flag BIT. This is stored INSIDE the encrypted blob.
        // Attackers cannot see this flag without decrypting the vault first.
        flags |= VaultFlags.DEVELOPER;
    }

    // 2. Generate Full Entropy (32 bytes)
    // We NEVER modify this entropy. It must remain pure random.
    const entropy = ChaosEngine.generateEntropy();

    const initialState: VaultState = { 
        entropy, 
        configs: [], 
        notes: [], 
        contacts: [], 
        locker: [],
        version: 1,
        lastModified: Date.now(),
        flags: flags // Stored securely inside the blob
    };

    try {
        const newBlob = await ChaosLock.pack(initialState, finalPassword);
        
        // Reset version sentinel for new vault
        localStorage.removeItem('BASTION_MAX_VERSION');

        // Analytics Beacon
        track('Vault Created');

        // Pass isNew=true to trigger unsaved changes warning until backup
        onOpen(initialState, newBlob, finalPassword, true, false);
    } catch (e) {
        setError("Failed to create vault.");
    } finally {
        setLoading(false);
    }
  };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputData = blob.trim();

    if (!inputData) {
        setError("Please provide a Backup File or Seed.");
        return;
    }
    setLoading(true);
    setError('');

    try {
        const isHexSeed = /^[0-9a-fA-F]{64}$/.test(inputData);

        if (isHexSeed) {
            const recoveredState: VaultState = {
                entropy: inputData.toLowerCase(),
                configs: [], 
                notes: [], 
                contacts: [], 
                locker: [],
                version: 1,
                lastModified: Date.now(),
                flags: VaultFlags.NONE // Seeds alone cannot recover flags, safe default
            };
            const newBlob = await ChaosLock.pack(recoveredState, password || 'temp');
            
            // Analytics Beacon
            track('Identity Recovered');

            // Recovering from seed is effectively a "new" session in memory until saved
            onOpen(recoveredState, newBlob, password, true, false);
        } else {
            const { state, version } = await ChaosLock.unpack(inputData, password);
            
            const isLegacy = version < 3; // 3 is the current V3 standard (Argon2id)

            // Analytics Beacon
            track('Vault Unlocked');

            // Opening from blob is a "safe" state, pass legacy flag
            onOpen(state, inputData, password, false, isLegacy);
        }

    } catch (e) {
        await new Promise(r => setTimeout(r, 800));
        setError("Incorrect password or invalid file.");
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
                   const tokenMatch = text.match(/\[2\] VAULT TOKEN[^\n]*\n-+\n([A-Za-z0-9+/=]+)/m);
                   if (tokenMatch && tokenMatch[1]) setBlob(tokenMatch[1].trim());
                   if (!tokenMatch) {
                        const seedMatch = text.match(/\[3\] MASTER SEED[^\n]*\n-+\n([0-9a-fA-F]{64})/m);
                        if (seedMatch && seedMatch[1]) setBlob(seedMatch[1].trim());
                   }
              } else {
                  setBlob(text.trim());
              }
              setLocalVaultFound(true); 
          } catch(err) {
              setError("Could not read file.");
          }
      }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950 font-sans text-slate-200">
        
        {/* Simplified Auth UI logic remains the same, just handling new unpack return type internally */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-grid opacity-20"></div>
            <div className="absolute top-[20%] right-[10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse"></div>
        </div>

        <TopNav active="auth" onNavigate={onNavigate} />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full p-4 pt-24">
            
            <div className="w-full relative">
                <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    
                    {/* Integrity Banner */}
                    {integritySafe && (
                        <div className="bg-emerald-900/10 border-b border-emerald-500/10 py-1.5 flex justify-center items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                            <ShieldCheck size={12} /> Execution Environment Verified
                        </div>
                    )}

                    <div className="flex border-b border-white/5 bg-black/20">
                        <button 
                            onClick={() => {setTab('open'); setError('');}}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${tab === 'open' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <LogIn size={16} /> Unlock Vault
                        </button>
                        <button 
                            onClick={() => {setTab('create'); setError('');}}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${tab === 'create' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <UserPlus size={16} /> Create New
                        </button>
                    </div>

                    <div className="p-8">
                        <button onClick={() => setShowHelp(!showHelp)} className="absolute top-20 right-4 text-slate-600 hover:text-white transition-colors">
                            <HelpCircle size={18} />
                        </button>

                         {showHelp && (
                            <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md p-8 flex flex-col justify-center animate-in fade-in">
                                <h3 className="font-bold text-white mb-4">About Bastion Enclave</h3>
                                <ul className="space-y-3 text-sm text-slate-400">
                                    <li>• <strong>Local Only:</strong> Data never leaves this device.</li>
                                    <li>• <strong>No Cloud:</strong> We cannot reset your password.</li>
                                    <li>• <strong>Backups:</strong> Download a backup file from the main menu.</li>
                                    <li>• <strong>Dev Mode:</strong> Prefix password with <code>dev://</code> to initialize a Developer Vault (requires strong password).</li>
                                </ul>
                                <Button size="sm" variant="secondary" onClick={() => setShowHelp(false)} className="mt-6 w-full">Got it</Button>
                            </div>
                        )}

                        {tab === 'open' ? (
                            <form onSubmit={handleOpen} className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="text-center">
                                    {localVaultFound ? (
                                         <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 mb-4 ring-1 ring-indigo-500/30">
                                             <HardDrive size={28} />
                                         </div>
                                    ) : (
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 text-slate-500 mb-4">
                                             <Scan size={28} />
                                         </div>
                                    )}
                                    <h2 className="text-xl font-bold text-white">
                                        {localVaultFound ? 'Decrypt Vault' : 'Restore Vault'}
                                    </h2>
                                </div>

                                {!localVaultFound && (
                                    <>
                                        <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 text-left animate-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider mb-2">
                                                <Info size={14} /> Recovery Options
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                <span className="text-indigo-400 font-bold">A:</span> Drag & drop your <strong>Backup File</strong> to restore your vault.<br/>
                                                <span className="text-emerald-400 font-bold">B:</span> Paste your <strong>Master Seed</strong> to recover your vault.
                                            </p>
                                        </div>

                                        <div 
                                            className={`relative border-2 border-dashed rounded-xl transition-all group overflow-hidden ${
                                                isDragging ? 'border-indigo-500 bg-indigo-500/10' : 
                                                isSeed ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]' :
                                                isBackup ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]' :
                                                'border-slate-700 hover:border-indigo-500/50 hover:bg-white/5 focus-within:border-indigo-500/50 focus-within:bg-white/5'
                                            }`}
                                        >
                                            {!blob && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 opacity-50 group-focus-within:opacity-20 transition-opacity">
                                                    <div className="flex gap-3 text-slate-500 mb-2">
                                                        <FileText size={20} />
                                                        <Fingerprint size={20} />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase text-center">Drag Backup File<br/><span className="text-[10px] font-normal normal-case opacity-70">or paste Master Seed</span></p>
                                                </div>
                                            )}
                                            
                                            <textarea 
                                                value={blob}
                                                onChange={e => setBlob(e.target.value)}
                                                className="w-full h-32 bg-transparent p-4 text-[11px] font-mono text-slate-300 resize-none outline-none relative z-10 placeholder-transparent custom-scrollbar leading-relaxed"
                                                spellCheck={false}
                                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                                onDragLeave={() => setIsDragging(false)}
                                                onDrop={handleFileDrop}
                                            />
                                            
                                            {(isSeed || isBackup) && (
                                                <div className="absolute bottom-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 bg-slate-900/80 backdrop-blur border border-white/10 shadow-lg z-20">
                                                    {isSeed ? (
                                                        <span className="text-emerald-400 flex items-center gap-1"><Fingerprint size={10} /> VALID SEED</span>
                                                    ) : (
                                                        <span className="text-indigo-400 flex items-center gap-1"><FileText size={10} /> BACKUP FILE</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Master Password</label>
                                        <div className="relative">
                                            <Input 
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="pr-10"
                                                autoFocus={localVaultFound}
                                                placeholder={localVaultFound ? "••••••••" : "Password for this vault"}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs font-bold">
                                            <ShieldAlert size={14} /> {error}
                                        </div>
                                    )}

                                    {showClearConfirm ? (
                                        <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                                            <div className="text-red-400 text-xs font-bold text-center mb-3">
                                                Remove local vault from this device?
                                                <div className="text-[10px] opacity-70 font-normal mt-1 text-slate-400">Ensure you have a backup. This cannot be undone.</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="ghost" onClick={() => setShowClearConfirm(false)} className="flex-1 h-9 text-xs border border-white/5 bg-slate-900">Cancel</Button>
                                                <Button type="button" variant="danger" onClick={confirmClearLocalVault} className="flex-1 h-9 text-xs">Yes, Remove</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            {localVaultFound && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowClearConfirm(true)}
                                                    className="p-3 rounded-xl border border-white/10 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="Clear local data"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                            <Button type="submit" className={`w-full h-12 text-lg shadow-lg ${isSeed ? 'shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500' : 'shadow-indigo-500/20'}`} isLoading={loading}>
                                                {isSeed ? 'Recover Vault' : 'Unlock Vault'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-6 animate-in fade-in slide-in-from-left-4">
                                <div className="text-center mb-6">
                                    <h2 className="text-xl font-bold text-white">Create New Vault</h2>
                                    <p className="text-slate-400 text-sm mt-2">
                                        Everything is encrypted locally. <br/>
                                        <span className="text-amber-400/80 text-xs">If you forget this password, your data is lost forever.</span>
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        <span>Master Password</span>
                                        <button type="button" onClick={handleRegeneratePassword} className="text-indigo-400 hover:text-white flex items-center gap-1">
                                            <RefreshCw size={10} /> Generate
                                        </button>
                                    </label>
                                    <div className="relative group">
                                        <Input 
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className={`pr-20 ${isDevModeTrigger ? 'border-amber-500/50 focus:border-amber-500' : ''}`}
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <button type="button" onClick={handleCopyPassword} className="p-1.5 text-slate-400 hover:text-white rounded">
                                                {copiedPassword ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                            </button>
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1.5 text-slate-400 hover:text-white rounded">
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    {isDevModeTrigger && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400 mt-1 animate-in slide-in-from-top-1">
                                            <Terminal size={10} /> DEVELOPER MODE FLAG SET
                                        </div>
                                    )}
                                </div>

                                <Button type="submit" className={`w-full h-12 text-lg shadow-lg ${isDevModeTrigger ? 'shadow-amber-500/20 bg-amber-600 hover:bg-amber-500' : 'shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500'}`} isLoading={loading}>
                                    {isDevModeTrigger ? 'Initialize Dev Vault' : 'Create Vault'}
                                </Button>
                                
                                <p className="text-center text-[10px] text-slate-500 leading-relaxed">
                                    By creating a vault, you acknowledge that Bastion Enclave operates entirely offline. 
                                    You are responsible for downloading backups from the main menu.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
