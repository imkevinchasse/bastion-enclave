

import React, { useState } from 'react';
import { VaultConfig } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { Generator } from './Generator';
import { ChaosEngine, ChaosLock, SecretSharer } from '../services/cryptoService';
import { Trash2, Copy, Eye, EyeOff, Search, Plus, RotateCw, Wallet, Globe, ArrowLeft, ShieldCheck, KeyRound, Share2, Layers, Check, AlertTriangle, X } from 'lucide-react';

interface VaultProps {
  configs: VaultConfig[];
  masterSeed: string;
  onAddConfig: (config: VaultConfig) => void;
  onDeleteConfig: (id: string) => void;
  onUpdateConfig: (config: VaultConfig) => void;
}

export const Vault: React.FC<VaultProps> = ({ configs, masterSeed, onAddConfig, onDeleteConfig, onUpdateConfig }) => {
  const [view, setView] = useState<'list' | 'add' | 'generator' | 'recover'>('list');
  const [search, setSearch] = useState('');
  
  const [newConfig, setNewConfig] = useState<Partial<VaultConfig>>({ 
    name: '', 
    username: '', 
    length: 16, 
    useSymbols: true,
    version: 1 
  });

  const filtered = configs.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConfig.name || !newConfig.username) return;

    onAddConfig({
        id: ChaosLock.getUUID(),
        name: newConfig.name,
        username: newConfig.username,
        length: newConfig.length || 16,
        useSymbols: newConfig.useSymbols ?? true,
        version: 1,
        category: 'login',
        updatedAt: Date.now()
    });
    setNewConfig({ name: '', username: '', length: 16, useSymbols: true, version: 1 });
    setView('list');
  };

  if (view === 'generator') {
      return (
          <div className="space-y-6">
              <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => setView('list')} className="shrink-0">
                      <ArrowLeft size={18} /> Back to Logins
                  </Button>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-right-4">
                   <Generator />
              </div>
          </div>
      );
  }

  if (view === 'recover') {
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 mb-4">
                  <Button variant="ghost" onClick={() => setView('list')} className="shrink-0">
                      <ArrowLeft size={18} /> Back to Logins
                  </Button>
                  <h2 className="text-xl font-bold text-white">Shard Assembly</h2>
              </div>
              <ShardRecovery />
          </div>
      )
  }

  if (view === 'add') {
    return (
        <div className="glass-panel p-8 rounded-2xl animate-in fade-in slide-in-from-right-8 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">New Login</h2>
                    <p className="text-slate-400 text-sm">Configure deterministic parameters for this service.</p>
                </div>
                <Button variant="ghost" onClick={() => setView('list')}>Cancel</Button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-8 relative z-10">
                <div className="grid md:grid-cols-2 gap-6">
                    <Input 
                        label="Service Name" 
                        placeholder="e.g. GitHub" 
                        value={newConfig.name}
                        onChange={e => setNewConfig({...newConfig, name: e.target.value})}
                        icon={<Globe size={16} />}
                        required
                    />
                    <Input 
                        label="Identity / Username" 
                        placeholder="user@domain.com"
                        value={newConfig.username}
                        onChange={e => setNewConfig({...newConfig, username: e.target.value})}
                        icon={<Wallet size={16} />}
                        required
                    />
                </div>
                
                <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <KeyRound size={14} /> Password Configuration
                    </h3>
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                             <label className="block text-xs text-slate-400 mb-2">Length: {newConfig.length}</label>
                             <input 
                                type="range" 
                                min="8" max="64" 
                                value={newConfig.length} 
                                onChange={e => setNewConfig({...newConfig, length: parseInt(e.target.value)})}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer bg-slate-800/50 px-4 py-2 rounded-lg border border-white/5 hover:bg-slate-800 transition-colors h-10 self-end">
                            <input 
                                type="checkbox" 
                                checked={newConfig.useSymbols} 
                                onChange={e => setNewConfig({...newConfig, useSymbols: e.target.checked})}
                                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-slate-300">Use Symbols</span>
                        </label>
                    </div>
                </div>

                <div className="pt-2">
                    <Button type="submit" className="w-full py-3 text-lg">Encrypt & Add to Vault</Button>
                </div>
            </form>
        </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
             <div>
                 <h1 className="text-2xl font-bold text-white tracking-tight">Logins</h1>
                 <p className="text-slate-400 text-sm">Deterministic passwords</p>
             </div>
             <div className="flex gap-2 w-full md:w-auto">
                <Input 
                    icon={<Search size={16} />} 
                    placeholder="Search logins..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="md:w-64"
                />
                <Button onClick={() => setView('recover')} variant="secondary" className="shrink-0" title="Assemble Shards">
                    <Layers size={18} /> Recover
                </Button>
                <Button onClick={() => setView('generator')} variant="secondary" className="shrink-0" title="Random Password Generator">
                    <ShieldCheck size={18} /> Tool
                </Button>
                <Button onClick={() => setView('add')} className="shrink-0">
                    <Plus size={18} /> New
                </Button>
             </div>
        </div>

        {filtered.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-800/50 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-600">
                    <Wallet size={32} />
                </div>
                <div>
                    <h3 className="text-slate-300 font-medium">No Logins Found</h3>
                    <p className="text-slate-500 text-sm mt-1">Add your first service to generate a secure password.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setView('generator')} size="sm">Generator Tool</Button>
                    <Button onClick={() => setView('add')} size="sm">Create Login</Button>
                </div>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2">
                {filtered.map(config => (
                    <VaultConfigCard 
                        key={config.id} 
                        config={config} 
                        masterSeed={masterSeed}
                        onDelete={() => onDeleteConfig(config.id)}
                        onRotate={() => onUpdateConfig({...config, version: config.version + 1, updatedAt: Date.now()})}
                    />
                ))}
            </div>
        )}
    </div>
  );
};

const VaultConfigCard: React.FC<{ 
    config: VaultConfig; 
    masterSeed: string; 
    onDelete: () => void;
    onRotate: () => void;
}> = ({ config, masterSeed, onDelete, onRotate }) => {
    const [reveal, setReveal] = useState(false);
    const [password, setPassword] = useState('');
    const [showShare, setShowShare] = useState(false);

    const toggleReveal = async () => {
        if (!reveal) {
            const pwd = await ChaosEngine.transmute(masterSeed, config);
            setPassword(pwd);
        } else {
            setPassword('');
        }
        setReveal(!reveal);
    };

    const copy = () => {
        navigator.clipboard.writeText(password);
    };

    const handleShare = async () => {
        const pwd = await ChaosEngine.transmute(masterSeed, config);
        setPassword(pwd); // Load password for sharding
        setShowShare(true);
    };

    return (
        <div className="bg-slate-900/80 border border-white/5 p-5 rounded-xl hover:border-indigo-500/30 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] group transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-indigo-400 font-bold text-lg shadow-inner">
                        {config.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-200 leading-tight">{config.name}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{config.username}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                    <button onClick={handleShare} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors" title="Create Shards">
                        <Share2 size={14} />
                    </button>
                    <button onClick={onRotate} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-amber-400 transition-colors" title="Rotate Key">
                        <RotateCw size={14} />
                    </button>
                    <button onClick={onDelete} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="bg-black/40 rounded-lg border border-black/20 p-1 flex items-stretch h-12 shadow-inner mb-3">
                <div className={`flex-1 font-mono text-sm flex items-center px-3 tracking-wider overflow-hidden ${reveal ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {reveal ? password : '•••• •••• •••• ••••'}
                </div>
                <div className="flex items-center gap-1 pr-1">
                    <button 
                        onClick={toggleReveal}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {reveal && (
                        <button 
                            onClick={copy}
                            className="w-8 h-8 flex items-center justify-center rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        >
                            <Copy size={16} />
                        </button>
                    )}
                </div>
            </div>

             <div className="flex items-center gap-3 text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span> v{config.version}</span>
                <span>•</span>
                <span>{config.length} BITS</span>
            </div>

            {showShare && (
                <ShardCreatorModal 
                    secret={password} 
                    name={config.name}
                    onClose={() => setShowShare(false)} 
                />
            )}
        </div>
    );
};

const ShardCreatorModal = ({ secret, name, onClose }: { secret: string, name: string, onClose: () => void }) => {
    const [numShares, setNumShares] = useState(3);
    const [threshold, setThreshold] = useState(2);
    const [shards, setShards] = useState<string[]>([]);

    const generate = () => {
        try {
            const result = SecretSharer.split(secret, numShares, threshold);
            setShards(result);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg relative z-10 p-6 animate-in zoom-in-95 shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>
                
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Share2 size={20} className="text-emerald-400"/> Share Password
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                    Split the password for <strong>{name}</strong> into shards. Distribute these to trusted parties.
                </p>

                {shards.length === 0 ? (
                    <div className="space-y-6">
                        <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-white/5">
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">
                                    <span>Total Shards</span>
                                    <span className="text-white">{numShares}</span>
                                </div>
                                <input type="range" min="2" max="10" value={numShares} onChange={e => {setNumShares(parseInt(e.target.value)); if(threshold > parseInt(e.target.value)) setThreshold(parseInt(e.target.value));}} className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase">
                                    <span>Required to Unlock</span>
                                    <span className="text-emerald-400">{threshold}</span>
                                </div>
                                <input type="range" min="2" max={numShares} value={threshold} onChange={e => setThreshold(parseInt(e.target.value))} className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                            </div>
                        </div>
                        <Button onClick={generate} className="w-full">Generate Shards</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4 max-h-64 overflow-y-auto custom-scrollbar space-y-3">
                            {shards.map((s, i) => (
                                <div key={i} className="group relative">
                                    <div className="bg-black border border-slate-800 rounded-lg p-3 pr-10 font-mono text-xs text-slate-300 break-all">
                                        {s}
                                    </div>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(s)}
                                        className="absolute right-2 top-2 p-1.5 text-slate-500 hover:text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setShards([])} className="flex-1">Reset</Button>
                            <Button onClick={onClose} className="flex-1">Done</Button>
                        </div>
                        <p className="text-[10px] text-center text-amber-500/80 mt-2">
                            Warning: Shards are not stored. If you close this, they are lost forever.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ShardRecovery = () => {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleRecover = () => {
        try {
            setError('');
            const shards = input.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            if (shards.length < 2) throw new Error("Enter at least 2 shards");
            
            const recovered = SecretSharer.combine(shards);
            setResult(recovered);
        } catch (e: any) {
            setError(e.message || "Recovery Failed");
            setResult(null);
        }
    };

    return (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
                    <Layers size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white">Shard Assembly</h3>
                <p className="text-slate-400 text-sm mt-1">Reconstruct secret from distributed parts.</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Paste Shards (One per line)</label>
                    <textarea 
                        className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-200 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none placeholder-slate-700"
                        placeholder={`bst_s1_...\nbst_s1_...`}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                    />
                </div>

                <Button onClick={handleRecover} className="w-full py-3">Recover Secret</Button>

                {error && (
                    <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-6 bg-emerald-900/10 border border-emerald-500/30 rounded-xl text-center space-y-3">
                            <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Successfully Reconstructed</div>
                            <div className="text-2xl font-mono font-bold text-white break-all selection:bg-emerald-500/30">
                                {result}
                            </div>
                            <button 
                                onClick={() => navigator.clipboard.writeText(result)}
                                className="text-xs flex items-center justify-center gap-2 text-slate-400 hover:text-white mx-auto transition-colors"
                            >
                                <Copy size={12} /> Copy to Clipboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
