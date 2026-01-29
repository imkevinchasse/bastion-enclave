
import React, { useState, useRef } from 'react';
import { VaultConfig } from '../types';
import { ChaosEngine } from '../services/cryptoService';
import { BreachService } from '../services/breachService';
import { Button } from './Button';
import { Input } from './Input';
import { ShieldAlert, CheckCircle, Loader2, AlertTriangle, ArrowRight, XCircle, Search, Wifi, Shield } from 'lucide-react';

interface VaultBreachScannerProps {
  configs: VaultConfig[];
  masterSeed: string;
  onClose: () => void;
  onNavigateToConfig: (id: string) => void;
  onMarkCompromised?: (id: string) => void; 
}

interface ScanResult {
  configId: string;
  configName: string;
  username: string;
  pwnCount: number;
}

export const VaultBreachScanner: React.FC<VaultBreachScannerProps> = ({ configs, masterSeed, onClose, onNavigateToConfig, onMarkCompromised }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [filter, setFilter] = useState('');
  const [scanError, setScanError] = useState('');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const startScan = async () => {
    setIsScanning(true);
    setResults([]);
    setScannedCount(0);
    setProgress(0);
    setScanError('');
    abortControllerRef.current = new AbortController();

    const signal = abortControllerRef.current.signal;

    try {
      for (let i = 0; i < configs.length; i++) {
        if (signal.aborted) break;

        const config = configs[i];
        
        // 1. Regenerate Password (In-Memory)
        const password = await ChaosEngine.transmute(masterSeed, config);
        
        // 2. Check Breach
        try {
            const count = await BreachService.checkPassword(password, signal);

            if (count > 0) {
                // Add to results
                setResults(prev => [...prev, {
                    configId: config.id,
                    configName: config.name,
                    username: config.username,
                    pwnCount: count
                }]);
                
                // Trigger State Update in Parent
                if (onMarkCompromised) {
                    onMarkCompromised(config.id);
                }
            }
        } catch (e: any) {
            if (e.message === "CONGESTION") {
                setScanError("Network congestion detected. Scan paused. Try again later.");
                setIsScanning(false);
                return;
            }
            if (e.name !== 'AbortError') console.error("Scan error for", config.name, e);
        }

        // 3. Update Progress
        setScannedCount(i + 1);
        setProgress(((i + 1) / configs.length) * 100);

        // 4. Rate Limiting (Politeness Delay)
        await new Promise(r => setTimeout(r, 1500));
      }
    } finally {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          setIsScanning(false);
      }
      abortControllerRef.current = null;
    }
  };

  const stopScan = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setIsScanning(false);
  };

  const filteredResults = results.filter(r => 
      r.configName.toLowerCase().includes(filter.toLowerCase()) || 
      r.username.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="text-red-500" /> Vault Breach Scanner
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                    Check all {configs.length} stored logins against known data breaches.
                </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
                Close
            </Button>
        </div>

        {/* Control Panel */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            {/* Background Pulse */}
            {isScanning && <div className="absolute inset-0 bg-indigo-500/5 animate-pulse pointer-events-none"></div>}

            <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                {/* Stats */}
                <div className="flex-1 w-full space-y-4">
                    <div className="flex justify-between text-sm font-bold uppercase tracking-wider text-slate-500">
                        <span>Progress</span>
                        <span>{scannedCount} / {configs.length}</span>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                        <div 
                            className={`h-full transition-all duration-300 ${isScanning ? 'bg-indigo-500' : 'bg-slate-600'}`} 
                            style={{width: `${progress}%`}}
                        ></div>
                    </div>
                    {isScanning ? (
                        <div className="text-xs text-indigo-400 flex items-center gap-2 animate-pulse">
                            <Wifi size={12} /> Contacting k-Anonymity Relay...
                        </div>
                    ) : scanError ? (
                        <div className="text-xs text-red-400 flex items-center gap-2 font-bold animate-in fade-in">
                            <AlertTriangle size={12} /> {scanError}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500">Ready</div>
                    )}
                </div>

                {/* Action Button */}
                <div className="shrink-0">
                    {isScanning ? (
                        <Button variant="danger" onClick={stopScan} className="px-8 h-12">
                            <XCircle size={18} /> Stop Scan
                        </Button>
                    ) : (
                        <Button onClick={startScan} className="px-8 h-12 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                            <ShieldAlert size={18} /> {results.length > 0 ? 'Re-Scan Vault' : 'Start Audit'}
                        </Button>
                    )}
                </div>
            </div>
        </div>

        {/* Results Area */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Scan Results 
                    {results.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{results.length} BREACHED</span>}
                </h3>
                {results.length > 0 && (
                    <div className="w-64">
                        <Input 
                            placeholder="Filter results..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            icon={<Search size={14} />}
                            className="h-9 text-sm"
                        />
                    </div>
                )}
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar p-2">
                {scannedCount === 0 && results.length === 0 && !scanError ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 min-h-[280px]">
                        <Shield size={48} className="mb-4" />
                        <p>Ready to audit {configs.length} credentials.</p>
                        <p className="text-xs mt-2">Passwords are hashed locally. Only prefixes are sent.</p>
                    </div>
                ) : filteredResults.length > 0 ? (
                    <div className="grid gap-3">
                        {filteredResults.map((res) => (
                            <div key={res.configId} className="bg-red-950/20 border border-red-500/20 p-4 rounded-xl flex items-center justify-between hover:bg-red-950/30 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{res.configName}</div>
                                        <div className="text-xs text-red-300">{res.username}</div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-6">
                                    <div>
                                        <div className="text-xl font-black text-red-500">{res.pwnCount.toLocaleString()}</div>
                                        <div className="text-[10px] text-red-400 uppercase font-bold tracking-wider">Times Seen</div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="secondary"
                                        onClick={() => onNavigateToConfig(res.configId)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Fix <ArrowRight size={14} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : scannedCount > 0 && !isScanning && !scanError ? (
                    <div className="h-full flex flex-col items-center justify-center text-emerald-500 min-h-[280px]">
                        <CheckCircle size={48} className="mb-4 shadow-[0_0_30px_rgba(16,185,129,0.4)] rounded-full" />
                        <h3 className="text-xl font-bold">All Clear</h3>
                        <p className="text-slate-400 text-sm mt-2">No breaches found in scanned credentials.</p>
                    </div>
                ) : scanError ? (
                    <div className="h-full flex flex-col items-center justify-center text-red-400 min-h-[280px]">
                        <AlertTriangle size={48} className="mb-4" />
                        <h3 className="text-xl font-bold">Scan Paused</h3>
                        <p className="text-slate-400 text-sm mt-2 max-w-sm text-center">{scanError}</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 min-h-[280px]">
                        <Loader2 size={32} className="animate-spin mb-4 text-indigo-500" />
                        <p>Scanning...</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
