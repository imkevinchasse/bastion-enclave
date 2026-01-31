
import React, { useState } from 'react';
import { VaultConfig } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { Generator } from './Generator';
import { VaultBreachScanner } from './VaultBreachScanner';
import { ChaosEngine, ChaosLock, SecretSharer } from '../services/cryptoService';
import { expandSearchQuery, isModelReady } from '../services/llmService';
import { useDebounce } from '../hooks/useDebounce';
import { Trash2, Copy, Eye, EyeOff, Search, Plus, RotateCw, Wallet, Globe, ArrowLeft, ShieldCheck, KeyRound, Share2, Layers, Check, AlertTriangle, X, ShieldAlert, Edit2, AlertOctagon, Clock, Sparkles, Loader2, ArrowUp, ArrowDown, ListFilter, Calendar, BarChart2, Hash, Terminal } from 'lucide-react';

interface VaultProps {
  configs: VaultConfig[];
  masterSeed: string;
  onAddConfig: (config: VaultConfig) => void;
  onDeleteConfig: (id: string) => void;
  onUpdateConfig: (config: VaultConfig) => void;
  onUpdateAllConfigs?: (configs: VaultConfig[]) => void;
}

type SortMode = 'alpha' | 'created' | 'usage' | 'manual';

const ShardRecovery: React.FC = () => {
    const [shardsText, setShardsText] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRecover = async () => {
        try {
            setError('');
            setResult(null);
            setLoading(true);
            const shards = shardsText.trim().split('\n').filter(s => s.trim().length > 0);
            if (shards.length < 2) throw new Error("Need at least 2 shards to attempt recovery.");
            
            // V3: Async Operation over Prime Field
            const secret = await SecretSharer.combine(shards);
            setResult(secret);
        } catch (e: any) {
            setError(e.message || "Recovery failed. Ensure you have the required number of valid shards.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Enter Shards (One per line)</label>
                <div className="text-xs text-slate-400 mb-2">Paste the Shamir shards you generated previously. You typically need 3 out of 5 to recover the secret.</div>
                <textarea 
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none custom-scrollbar"
                    placeholder={`bst_p256_...\nbst_p256_...`}
                    value={shardsText}
                    onChange={e => setShardsText(e.target.value)}
                    spellCheck={false}
                />
            </div>
            <Button onClick={handleRecover} className="w-full" isLoading={loading}>
                {loading ? 'Reconstructing...' : 'Reconstruct Secret'}
            </Button>
            
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle size={14}/> {error}
                </div>
            )}
            
            {result && (
                <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl animate-in zoom-in-95">
                    <div className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-2">Recovered Secret</div>
                    <div className="flex items-center gap-2">
                        <div className="font-mono text-emerald-100 break-all bg-black/20 p-3 rounded flex-1 select-all border border-white/5">{result}</div>
                        <button onClick={() => navigator.clipboard.writeText(result)} className="p-2 hover:text-white text-emerald-500 transition-colors bg-emerald-500/10 rounded-lg border border-emerald-500/20"><Copy size={16}/></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const Vault: React.FC<VaultProps> = ({ configs, masterSeed, onAddConfig, onDeleteConfig, onUpdateConfig, onUpdateAllConfigs }) => {
  const [view, setView] = useState<'list' | 'editor' | 'generator' | 'recover' | 'scanner'>('list');
  const [search, setSearch] = useState('');
  
  const debouncedSearch = useDebounce(search, 300);
  
  const [sortMode, setSortMode] = useState<SortMode>('alpha');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const [smartTerms, setSmartTerms] = useState<string[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);
  
  const [editConfig, setEditConfig] = useState<Partial<VaultConfig>>({ 
    name: '', 
    username: '', 
    length: 16, 
    useSymbols: true,
    version: 1,
    customPassword: ''
  });
  const [isNewEntry, setIsNewEntry] = useState(true);

  const lastGlobalAudit = configs.reduce((latest, c) => {
      return c.breachStats && c.breachStats.lastChecked > latest ? c.breachStats.lastChecked : latest;
  }, 0);

  // --- BEHAVIORAL FINGERPRINT: CLI GRAMMAR ---
  // Implements strict asymmetry. 
  // !weak, !old, !compromised are "Commands"
  // >user: maps to fields
  const isCommand = debouncedSearch.startsWith('!');
  const isFieldQuery = debouncedSearch.startsWith('>');
  
  let processedConfigs = configs;

  if (isCommand) {
      const cmd = debouncedSearch.substring(1).toLowerCase();
      if (cmd.startsWith('weak')) {
          processedConfigs = configs.filter(c => c.length < 12 && !c.customPassword); // Generator < 12
      } else if (cmd.startsWith('compromised')) {
          processedConfigs = configs.filter(c => c.breachStats?.status === 'compromised');
      } else if (cmd.startsWith('old')) {
          const SIX_MONTHS = 1000 * 60 * 60 * 24 * 30 * 6;
          const now = Date.now();
          processedConfigs = configs.filter(c => (now - (c.updatedAt || 0)) > SIX_MONTHS);
      }
  } else if (isFieldQuery) {
      const parts = debouncedSearch.substring(1).split(':');
      if (parts.length === 2) {
          const field = parts[0].toLowerCase();
          const val = parts[1].toLowerCase();
          if (field === 'user' || field === 'u') {
              processedConfigs = configs.filter(c => c.username.toLowerCase().includes(val));
          } else if (field === 'service' || field === 's') {
              processedConfigs = configs.filter(c => c.name.toLowerCase().includes(val));
          } else if (field === 'v' || field === 'ver') {
              processedConfigs = configs.filter(c => c.version.toString() === val);
          }
      }
  } else {
      // Normal Search
      const activeTerms = [debouncedSearch, ...smartTerms].filter(Boolean);
      processedConfigs = configs.filter(c => {
          if (activeTerms.length === 0) return true;
          return activeTerms.some(term => 
              c.name.toLowerCase().includes(term.toLowerCase()) || 
              c.username.toLowerCase().includes(term.toLowerCase())
          );
      });
  }

  // --- SORTING ---
  processedConfigs.sort((a, b) => {
      const aCompromised = a.breachStats?.status === 'compromised';
      const bCompromised = b.breachStats?.status === 'compromised';
      if (aCompromised && !bCompromised) return -1;
      if (!aCompromised && bCompromised) return 1;

      switch (sortMode) {
          case 'created':
              return (b.createdAt || 0) - (a.createdAt || 0);
          case 'usage':
              return (b.usageCount || 0) - (a.usageCount || 0);
          case 'manual':
              return (a.sortOrder || 0) - (b.sortOrder || 0);
          case 'alpha':
          default:
              return a.name.localeCompare(b.name);
      }
  });

  const handleIncrementUsage = (config: VaultConfig) => {
      onUpdateConfig({
          ...config,
          usageCount: (config.usageCount || 0) + 1
      });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
      if (!onUpdateAllConfigs || sortMode !== 'manual') return;
      
      if (search) {
          alert("Clear search to reorder items.");
          return;
      }

      const newConfigs = [...processedConfigs];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newConfigs.length) return;

      const temp = newConfigs[index];
      newConfigs[index] = newConfigs[targetIndex];
      newConfigs[targetIndex] = temp;

      const reindexed = newConfigs.map((c, i) => ({ ...c, sortOrder: i }));
      
      onUpdateAllConfigs(reindexed);
  };

  const handleSmartSearch = async () => {
      if (!search || !isModelReady()) return;
      setIsExpanding(true);
      try {
          const terms = await expandSearchQuery(search);
          setSmartTerms(terms);
      } catch (e) {
          console.error("Smart search failed", e);
      } finally {
          setIsExpanding(false);
      }
  };

  const openEditor = (config?: VaultConfig) => {
      if (config) {
          setIsNewEntry(false);
          setEditConfig({ ...config });
      } else {
          setIsNewEntry(true);
          setEditConfig({ 
            name: '', 
            username: '', 
            length: 16, 
            useSymbols: true,
            version: 1,
            customPassword: ''
          });
      }
      setView('editor');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editConfig.name || !editConfig.username) return;

    if (isNewEntry) {
        onAddConfig({
            id: ChaosLock.getUUID(),
            name: editConfig.name,
            username: editConfig.username,
            length: editConfig.length || 16,
            useSymbols: editConfig.useSymbols ?? true,
            version: 1,
            category: 'login',
            updatedAt: Date.now(),
            createdAt: Date.now(),
            usageCount: 0,
            sortOrder: configs.length,
            customPassword: editConfig.customPassword
        });
    } else {
        const newStats = editConfig.breachStats ? { ...editConfig.breachStats, status: 'unknown' as const, seenCount: 0 } : undefined;
        
        onUpdateConfig({
            ...(editConfig as VaultConfig),
            version: (editConfig.version || 0) + 1,
            updatedAt: Date.now(),
            breachStats: newStats
        });
    }
    setView('list');
  };

  if (view === 'scanner') {
      return (
          <VaultBreachScanner 
            configs={configs} 
            masterSeed={masterSeed} 
            onClose={() => setView('list')} 
            onNavigateToConfig={(id) => {
                const cfg = configs.find(c => c.id === id);
                if (cfg) openEditor(cfg);
            }}
            onMarkCompromised={(id) => {
                const cfg = configs.find(c => c.id === id);
                if (cfg) {
                    onUpdateConfig({ 
                        ...cfg, 
                        breachStats: { 
                            status: 'compromised', 
                            lastChecked: Date.now(),
                            seenCount: 1 
                        } 
                    });
                }
            }}
          />
      );
  }

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

  if (view === 'editor') {
    return (
        <div className="glass-panel p-8 rounded-2xl animate-in fade-in slide-in-from-right-8 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{isNewEntry ? 'New Login' : 'Edit Login'}</h2>
                    <p className="text-slate-400 text-sm">Configure login parameters.</p>
                </div>
                <Button variant="ghost" onClick={() => setView('list')}>Cancel</Button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-8 relative z-10">
                <div className="grid md:grid-cols-2 gap-6">
                    <Input 
                        label="Service Name" 
                        placeholder="e.g. GitHub" 
                        value={editConfig.name}
                        onChange={e => setEditConfig({...editConfig, name: e.target.value})}
                        icon={<Globe size={16} />}
                        required
                    />
                    <Input 
                        label="Identity / Username" 
                        placeholder="user@domain.com"
                        value={editConfig.username}
                        onChange={e => setEditConfig({...editConfig, username: e.target.value})}
                        icon={<Wallet size={16} />}
                        required
                    />
                </div>
                
                <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <KeyRound size={14} /> Password Strategy
                    </h3>
                    
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Custom Password (Optional)</label>
                        <p className="text-[10px] text-slate-500 mb-2">If set, this specific password will be stored encrypted instead of generating one.</p>
                        <Input 
                            type="password"
                            placeholder="Leave empty to use Generator"
                            value={editConfig.customPassword || ''}
                            onChange={e => setEditConfig({...editConfig, customPassword: e.target.value})}
                            className="bg-black/20"
                        />
                    </div>

                    {!editConfig.customPassword && (
                        <div className="flex flex-col md:flex-row gap-6 animate-in fade-in">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-2">Generated Length: {editConfig.length}</label>
                                <input 
                                    type="range" 
                                    min="8" max="64" 
                                    value={editConfig.length} 
                                    onChange={e => setEditConfig({...editConfig, length: parseInt(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer bg-slate-800/50 px-4 py-2 rounded-lg border border-white/5 hover:bg-slate-800 transition-colors h-10 self-end">
                                <input 
                                    type="checkbox" 
                                    checked={editConfig.useSymbols} 
                                    onChange={e => setEditConfig({...editConfig, useSymbols: e.target.checked})}
                                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-slate-300">Use Symbols</span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <Button type="submit" className="w-full py-3 text-lg">{isNewEntry ? 'Encrypt & Add to Vault' : 'Save Changes'}</Button>
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
                 <p className="text-slate-400 text-sm flex items-center gap-2">
                     Deterministic & Stored Credentials
                     {lastGlobalAudit > 0 && (
                         <span className="text-xs text-slate-500 border-l border-slate-700 pl-2 ml-1 flex items-center gap-1">
                             <Clock size={10} /> Auto-Defense Scan: {new Date(lastGlobalAudit).toLocaleDateString()}
                         </span>
                     )}
                 </p>
             </div>
             
             <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                <Input 
                    icon={<Search size={16} />} 
                    placeholder="Search or !cmd..." 
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSmartTerms([]); }} 
                    className="md:w-48 min-w-[150px] h-10"
                />
                
                <div className="relative">
                    <Button 
                        variant="secondary" 
                        onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} 
                        className="shrink-0 h-10 px-3"
                        title="Sort Order"
                    >
                        <ListFilter size={18} className={sortMode !== 'alpha' ? "text-indigo-400" : ""} />
                    </Button>
                    {isSortMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-1 animate-in zoom-in-95 origin-top-right">
                            <button onClick={() => { setSortMode('alpha'); setIsSortMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${sortMode === 'alpha' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
                                <ListFilter size={14}/> Name (A-Z)
                            </button>
                            <button onClick={() => { setSortMode('created'); setIsSortMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${sortMode === 'created' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
                                <Calendar size={14}/> Newest First
                            </button>
                            <button onClick={() => { setSortMode('usage'); setIsSortMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${sortMode === 'usage' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
                                <BarChart2 size={14}/> Most Used
                            </button>
                            {onUpdateAllConfigs && (
                                <button onClick={() => { setSortMode('manual'); setIsSortMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${sortMode === 'manual' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
                                    <Hash size={14}/> Manual Order
                                </button>
                            )}
                        </div>
                    )}
                    {isSortMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsSortMenuOpen(false)}></div>}
                </div>

                <Button onClick={() => setView('scanner')} variant="secondary" className="shrink-0 h-10 text-red-400 border-red-500/20 hover:bg-red-500/10" title="Check for Breaches">
                    <ShieldAlert size={18} />
                </Button>
                <Button onClick={() => setView('recover')} variant="secondary" className="shrink-0 h-10" title="Assemble Shards">
                    <Layers size={18} />
                </Button>
                <Button onClick={() => setView('generator')} variant="secondary" className="shrink-0 h-10" title="Random Password Generator">
                    <ShieldCheck size={18} />
                </Button>
                <Button onClick={() => openEditor()} className="shrink-0 h-10">
                    <Plus size={18} /> New
                </Button>
             </div>
        </div>

        {/* --- CLI COMMAND INDICATOR --- */}
        {(isCommand || isFieldQuery) && (
            <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20 animate-in fade-in">
                <Terminal size={12} className="text-indigo-400"/>
                <span>
                    {isCommand ? "Executing Command: " : "Field Filter: "} 
                    <strong>{search}</strong>
                </span>
                <span className="ml-auto text-indigo-500/50 text-[10px] uppercase font-bold tracking-wider">
                    {processedConfigs.length} Matches
                </span>
            </div>
        )}

        {smartTerms.length > 0 && !isCommand && !isFieldQuery && (
            <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20 animate-in fade-in">
                <Sparkles size={12} className="text-indigo-400"/>
                <span>Including related terms: <strong>{smartTerms.join(", ")}</strong></span>
                <button onClick={() => setSmartTerms([])} className="ml-auto hover:text-white"><X size={12}/></button>
            </div>
        )}

        {processedConfigs.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-800/50 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-600">
                    <Wallet size={32} />
                </div>
                <div>
                    <h3 className="text-slate-300 font-medium">No Logins Found</h3>
                    <p className="text-slate-500 text-sm mt-1">
                        {search ? `No matches for "${search}"` : "Add your first service to generate a secure password."}
                    </p>
                </div>
                
                {search && isModelReady() && !isExpanding && smartTerms.length === 0 && !isCommand && !isFieldQuery && (
                    <div className="mt-2 animate-in fade-in">
                        <button 
                            onClick={handleSmartSearch}
                            className="text-xs flex items-center gap-2 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-full transition-all border border-indigo-500/20"
                        >
                            <Sparkles size={12} /> Try Neural Search?
                        </button>
                    </div>
                )}
                
                {isExpanding && (
                    <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse mt-2">
                        <Loader2 size={12} className="animate-spin" /> Expanding Query...
                    </div>
                )}

                <div className="flex gap-2 mt-4">
                    <Button variant="secondary" onClick={() => setView('generator')} size="sm">Generator Tool</Button>
                    <Button onClick={() => openEditor()} size="sm">Create Login</Button>
                </div>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2">
                {processedConfigs.map((config, idx) => (
                    <VaultConfigCard 
                        key={config.id} 
                        config={config} 
                        masterSeed={masterSeed}
                        sortMode={sortMode}
                        isFirst={idx === 0}
                        isLast={idx === processedConfigs.length - 1}
                        onDelete={() => onDeleteConfig(config.id)}
                        onRotate={() => onUpdateConfig({...config, version: config.version + 1, updatedAt: Date.now(), breachStats: undefined})}
                        onEdit={() => openEditor(config)}
                        onIncrementUsage={() => handleIncrementUsage(config)}
                        onMoveUp={() => handleMove(idx, 'up')}
                        onMoveDown={() => handleMove(idx, 'down')}
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
    sortMode: SortMode;
    isFirst: boolean;
    isLast: boolean;
    onDelete: () => void;
    onRotate: () => void;
    onEdit: () => void;
    onIncrementUsage: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}> = ({ config, masterSeed, sortMode, isFirst, isLast, onDelete, onRotate, onEdit, onIncrementUsage, onMoveUp, onMoveDown }) => {
    const [reveal, setReveal] = useState(false);
    const [password, setPassword] = useState('');
    const [showShare, setShowShare] = useState(false);
    const [generatedShards, setGeneratedShards] = useState<string[]>([]);
    const [isSharing, setIsSharing] = useState(false);

    const isCompromised = config.breachStats?.status === 'compromised';

    const toggleReveal = async () => {
        if (!reveal) {
            const pwd = await ChaosEngine.transmute(masterSeed, config);
            setPassword(pwd);
        } else {
            setPassword('');
        }
        setReveal(!reveal);
    };

    const copy = async () => {
        if (!password) {
            const pwd = await ChaosEngine.transmute(masterSeed, config);
            navigator.clipboard.writeText(pwd);
        } else {
            navigator.clipboard.writeText(password);
        }
        onIncrementUsage();
    };

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            const pwd = await ChaosEngine.transmute(masterSeed, config);
            // Default: Split into 5 shares, need 3 to recover
            const shards = await SecretSharer.split(pwd, 5, 3);
            setGeneratedShards(shards);
            setShowShare(true);
        } catch(e) {
            alert("Cryptographic operation failed. Please try again.");
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className={`border p-5 rounded-xl transition-all duration-300 relative group overflow-hidden ${isCompromised ? 'bg-red-950/20 border-red-500/50 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]' : 'bg-slate-900/80 border-white/5 hover:border-indigo-500/30 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]'}`}>
            
            {/* Compromised Banner */}
            {isCompromised && (
                <div className="absolute top-0 right-0 p-2 pointer-events-none">
                    <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1 shadow-lg">
                        <ShieldAlert size={10} /> BREACHED
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border shadow-inner ${isCompromised ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-slate-800 border-white/5 text-white'}`}>
                        {config.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-white tracking-tight">{config.name}</h3>
                        <p className="text-sm text-slate-400 font-mono">{config.username}</p>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => { if(confirm('Delete credential?')) onDelete(); }} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    {sortMode === 'manual' && (
                        <div className="flex flex-col gap-0.5 ml-1">
                            <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"><ArrowUp size={12}/></button>
                            <button onClick={onMoveDown} disabled={isLast} className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30"><ArrowDown size={12}/></button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-black/30 rounded-lg p-3 flex items-center justify-between border border-white/5">
                <div className="font-mono text-sm text-slate-300 truncate mr-4">
                    {reveal ? password : '••••••••••••••••'}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={toggleReveal} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                        {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={copy} className="p-1.5 text-slate-500 hover:text-white transition-colors" title="Copy to Clipboard">
                        <Copy size={16} />
                    </button>
                    <button onClick={handleShare} disabled={isSharing} className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-50" title="Share Secret (Split Key)">
                        {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center mt-3 text-[10px] uppercase font-bold tracking-widest text-slate-600">
                <div className="flex items-center gap-2">
                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-white/5">v{config.version}</span>
                    {config.customPassword && <span className="bg-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">CUSTOM</span>}
                </div>
                <button onClick={onRotate} className="flex items-center gap-1 hover:text-white transition-colors">
                    <RotateCw size={10} /> Rotate
                </button>
            </div>

            {/* Share Modal Overlay */}
            {showShare && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-20 flex flex-col p-4 animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-white font-bold flex items-center gap-2 text-sm"><Layers size={14}/> Secret Shards</h4>
                        <button onClick={() => setShowShare(false)} className="text-slate-500 hover:text-white"><X size={16}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-2">
                        {generatedShards.map((shard, i) => (
                            <div key={i} className="bg-black/50 p-2 rounded border border-white/10 text-[10px] font-mono text-slate-300 break-all select-all hover:bg-black/80 transition-colors cursor-pointer" onClick={() => navigator.clipboard.writeText(shard)}>
                                {shard}
                            </div>
                        ))}
                    </div>
                    <p className="text-[9px] text-slate-500 text-center">
                        Distribute these 5 shards. Any 3 can combine to recover the password.
                    </p>
                </div>
            )}
        </div>
    );
};
