
import React, { useState } from 'react';
import { VaultConfig } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { Generator } from './Generator';
import { VaultBreachScanner } from './VaultBreachScanner';
import { ChaosEngine, ChaosLock, SecretSharer } from '../services/cryptoService';
import { expandSearchQuery, isModelReady } from '../services/llmService';
import { useDebounce } from '../hooks/useDebounce';
import { Trash2, Copy, Eye, EyeOff, Search, Plus, RotateCw, Wallet, Globe, ArrowLeft, ShieldCheck, KeyRound, Share2, Layers, Check, AlertTriangle, X, ShieldAlert, Edit2, AlertOctagon, Clock, Sparkles, Loader2, ArrowUp, ArrowDown, ListFilter, Calendar, BarChart2, Hash } from 'lucide-react';

interface VaultProps {
  configs: VaultConfig[];
  masterSeed: string;
  onAddConfig: (config: VaultConfig) => void;
  onDeleteConfig: (id: string) => void;
  onUpdateConfig: (config: VaultConfig) => void;
  onUpdateAllConfigs?: (configs: VaultConfig[]) => void; // New prop for bulk updates (reordering)
}

type SortMode = 'alpha' | 'created' | 'usage' | 'manual';

export const Vault: React.FC<VaultProps> = ({ configs, masterSeed, onAddConfig, onDeleteConfig, onUpdateConfig, onUpdateAllConfigs }) => {
  const [view, setView] = useState<'list' | 'editor' | 'generator' | 'recover' | 'scanner'>('list');
  const [search, setSearch] = useState('');
  
  // Debounce search to prevent heavy filtering/sorting on every keystroke
  const debouncedSearch = useDebounce(search, 300);
  
  // Sorting State
  const [sortMode, setSortMode] = useState<SortMode>('alpha');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // Smart Search State
  const [smartTerms, setSmartTerms] = useState<string[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);
  
  // Editor State
  const [editConfig, setEditConfig] = useState<Partial<VaultConfig>>({ 
    name: '', 
    username: '', 
    length: 16, 
    useSymbols: true,
    version: 1,
    customPassword: ''
  });
  const [isNewEntry, setIsNewEntry] = useState(true);

  // Calculate Last Global Audit from items
  const lastGlobalAudit = configs.reduce((latest, c) => {
      return c.breachStats && c.breachStats.lastChecked > latest ? c.breachStats.lastChecked : latest;
  }, 0);

  // --- FILTER & SORT LOGIC ---
  // Use debouncedSearch instead of raw search for the heavy lifting
  const activeTerms = [debouncedSearch, ...smartTerms].filter(Boolean);
  
  let processedConfigs = configs.filter(c => {
      if (activeTerms.length === 0) return true;
      return activeTerms.some(term => 
          c.name.toLowerCase().includes(term.toLowerCase()) || 
          c.username.toLowerCase().includes(term.toLowerCase())
      );
  });

  // Sorting
  processedConfigs.sort((a, b) => {
      // Always prioritize compromised items at top regardless of sort (Safety first)
      const aCompromised = a.breachStats?.status === 'compromised';
      const bCompromised = b.breachStats?.status === 'compromised';
      if (aCompromised && !bCompromised) return -1;
      if (!aCompromised && bCompromised) return 1;

      switch (sortMode) {
          case 'created':
              return (b.createdAt || 0) - (a.createdAt || 0); // Newest first
          case 'usage':
              return (b.usageCount || 0) - (a.usageCount || 0); // Most used first
          case 'manual':
              return (a.sortOrder || 0) - (b.sortOrder || 0); // Ascending order index
          case 'alpha':
          default:
              return a.name.localeCompare(b.name);
      }
  });

  // --- HANDLERS ---

  const handleIncrementUsage = (config: VaultConfig) => {
      onUpdateConfig({
          ...config,
          usageCount: (config.usageCount || 0) + 1
      });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
      if (!onUpdateAllConfigs || sortMode !== 'manual') return;
      
      const newConfigs = [...processedConfigs]; // Working on the filtered list might be tricky if search is active
      // For manual sorting to work robustly, we usually disable it during search or apply it to the full list.
      // Simplification: We only support move when search is empty to avoid index confusion.
      
      if (search) {
          alert("Clear search to reorder items.");
          return;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newConfigs.length) return;

      // Swap logic
      const temp = newConfigs[index];
      newConfigs[index] = newConfigs[targetIndex];
      newConfigs[targetIndex] = temp;

      // Re-index sortOrder
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
            sortOrder: configs.length, // Append to end
            customPassword: editConfig.customPassword
        });
    } else {
        // When editing, we increment version to ensure state change tracking
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

  // --- VIEWS ---

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
                    
                    {/* Custom Password Input */}
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
                    placeholder="Search logins..." 
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSmartTerms([]); }} 
                    className="md:w-48 min-w-[150px] h-10"
                />
                
                {/* SORT MENU */}
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
                    {/* Closing overlay */}
                    {isSortMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsSortMenuOpen(false)}></div>}
                </div>

                {/* ACTIONS */}
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

        {/* Smart Search Feedback */}
        {smartTerms.length > 0 && (
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
                
                {search && isModelReady() && !isExpanding && smartTerms.length === 0 && (
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

    const copy = () => {
        navigator.clipboard.writeText(password);
        onIncrementUsage();
    };

    const handleShare = async () => {
        const pwd = await ChaosEngine.transmute(masterSeed, config);
        setPassword(pwd); 
        setShowShare(true);
    };

    return (
        <div className={`border p-5 rounded-xl transition-all duration-300 relative group overflow-hidden ${isCompromised ? 'bg-red-950/20 border-red-500/50 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]' : 'bg-slate-900/80 border-white/5 hover:border-indigo-500/30 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]'}`}>
            
            {/* Compromised Badge */}
            {isCompromised && (
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-widest flex items-center gap-1 z-10 animate-pulse">
                    <AlertOctagon size={10} /> Compromised
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-inner ${isCompromised ? 'bg-red-900/50 text-red-400 border border-red-500/30' : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 text-indigo-400'}`}>
                        {config.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className={`font-bold leading-tight ${isCompromised ? 'text-red-200' : 'text-slate-200'}`}>{config.name}</h3>
                        <p className={`text-xs font-mono mt-0.5 ${isCompromised ? 'text-red-400/70' : 'text-slate-500'}`}>{config.username}</p>
                    </div>
                </div>
                
                {sortMode === 'manual' ? (
                    <div className="flex flex-col gap-1">
                        <button onClick={onMoveUp} disabled={isFirst} className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white disabled:opacity-20"><ArrowUp size={14}/></button>
                        <button onClick={onMoveDown} disabled={isLast} className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white disabled:opacity-20"><ArrowDown size={14}/></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                        <button onClick={onEdit} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors" title="Edit">
                            <Edit2 size={14} />
                        </button>
                        <button onClick={handleShare} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors" title="Create Shards">
                            <Share2 size={14} />
                        </button>
                        <button onClick={onRotate} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-amber-400 transition-colors" title="Rotate Key / Version (Fixes Breach)">
                            <RotateCw size={14} />
                        </button>
                        <button onClick={onDelete} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            <div className={`rounded-lg border p-1 flex items-stretch h-12 shadow-inner mb-3 ${isCompromised ? 'bg-red-950/30 border-red-500/20' : 'bg-black/40 border-black/20'}`}>
                <div className={`flex-1 font-mono text-sm flex items-center px-3 tracking-wider overflow-hidden ${reveal ? (isCompromised ? 'text-red-300' : 'text-emerald-400') : 'text-slate-600'}`}>
                    {reveal ? password : '•••• •••• •••• ••••'}
                </div>
                <div className="flex items-center gap-1 pr-1">
                    <button 
                        onClick={toggleReveal}
                        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isCompromised ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                        {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {reveal && (
                        <button 
                            onClick={copy}
                            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isCompromised ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                        >
                            <Copy size={16} />
                        </button>
                    )}
                </div>
            </div>

             <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3 text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></span> v{config.version}</span>
                    <span>•</span>
                    {config.customPassword ? (
                        <span className="text-amber-500">CUSTOM</span>
                    ) : (
                        <span>{config.length} BITS</span>
                    )}
                </div>
                {config.breachStats && (
                    <div className="text-[9px] font-mono text-slate-500 flex items-center gap-1" title={`Seen ${config.breachStats.seenCount} times`}>
                        {config.breachStats.status === 'clean' && <Check size={10} className="text-emerald-500"/>}
                        Breach Scan: {new Date(config.breachStats.lastChecked).toLocaleDateString()}
                    </div>
                )}
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
