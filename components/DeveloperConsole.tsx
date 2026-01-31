
import React, { useState, useEffect } from 'react';
import { VaultState, VaultConfig } from '../types';
import { ChaosLock, ChaosEngine } from '../services/cryptoService';
import { ProvenanceService, ProvenanceReport } from '../services/provenance';
import { Button } from './Button';
import { Terminal, Key, Database, AlertTriangle, Bug, Code, RefreshCw, Trash2, ShieldAlert, GitBranch, CheckCircle } from 'lucide-react';

interface DeveloperConsoleProps {
  state: VaultState;
  onUpdate: (newState: VaultState) => void;
  onForceExit: () => void;
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ state, onUpdate, onForceExit }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(['> System initialized in DEBUG mode.']);
  const [provenance, setProvenance] = useState<ProvenanceReport | null>(null);

  useEffect(() => {
      ProvenanceService.verify().then(report => {
          setProvenance(report);
          log(`Cryptographic Provenance Check: ${report.status}`);
          if (!report.verified) log(`WARNING: Build signature verification failed. Issuer: ${report.issuer}`);
      });
  }, []);

  const log = (msg: string) => setLogs(prev => [`> ${msg}`, ...prev]);

  const generateApiKey = async () => {
    try {
      log('Deriving Headless Access Key...');
      
      // RESERVED SYSTEM CONTEXT
      const systemConfig: VaultConfig = {
        id: 'system-root-key',
        name: "BASTION_SYSTEM_API_V1",
        username: "root_access_token",
        version: 1,
        length: 64,
        useSymbols: true,
        category: 'login',
        updatedAt: Date.now()
      };

      const key = await ChaosEngine.transmute(state.entropy, systemConfig);
      
      setApiKey(key);
      log('API Key Generated. Warning: This key grants programmatic access.');
    } catch (e) {
      log('Error generating key.');
    }
  };

  const injectMockData = () => {
    const mocks: VaultConfig[] = Array.from({ length: 5 }).map((_, i) => ({
      id: ChaosLock.getUUID(),
      name: `Mock Service ${i + 1}`,
      username: `user_${Math.floor(Math.random() * 1000)}@test.com`,
      version: 1,
      length: 20,
      useSymbols: true,
      category: 'login',
      updatedAt: Date.now()
    }));
    
    onUpdate({
      ...state,
      configs: [...state.configs, ...mocks]
    });
    log(`Injected ${mocks.length} mock credential records.`);
  };

  const wipeVault = () => {
    if (confirm("DEBUG: WIPE ALL DATA? This ignores backups.")) {
        onUpdate({
            ...state,
            configs: [],
            notes: [],
            contacts: [],
            locker: []
        });
        log('Vault state cleared.');
    }
  };

  const crashTest = () => {
      throw new Error("MANUAL_KERNEL_PANIC: Developer triggered fatal error.");
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-amber-500/20 pb-6">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-500">
                <Terminal size={32} />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                    Developer Console <span className="text-xs bg-amber-500 text-black px-2 py-1 rounded font-bold">UNLOCKED</span>
                </h2>
                <p className="text-amber-500/60 font-mono text-sm mt-1">
                    ACCESS_LEVEL: ROOT • FLAG_BIT: 0x01
                </p>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            
            {/* Tools Panel */}
            <div className="space-y-6">
                
                {/* Provenance Card */}
                <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                        <GitBranch size={18} className="text-blue-400" /> Build Provenance
                    </h3>
                    {provenance ? (
                        <div className={`p-4 rounded-lg border ${provenance.verified ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-amber-900/10 border-amber-500/30'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-xs font-bold uppercase ${provenance.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {provenance.status}
                                </span>
                                {provenance.verified ? <CheckCircle size={16} className="text-emerald-500"/> : <ShieldAlert size={16} className="text-amber-500"/>}
                            </div>
                            <div className="font-mono text-xs text-slate-400 break-all">
                                Issuer: {provenance.issuer}<br/>
                                Epoch: {new Date(provenance.timestamp * 1000).toLocaleDateString()}
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500">Verifying signature...</div>
                    )}
                </div>

                {/* API Key Gen */}
                <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                        <Key size={18} className="text-emerald-400" /> API Access Control
                    </h3>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                        Generate a "Headless Master Key" for use with the Python/Java runtimes. 
                        This key allows automation scripts to derive credentials without UI interaction.
                    </p>
                    
                    {apiKey ? (
                        <div className="bg-black/50 border border-emerald-500/30 p-4 rounded-lg break-all font-mono text-emerald-400 text-xs relative group">
                            {apiKey}
                            <button 
                                onClick={() => navigator.clipboard.writeText(apiKey)}
                                className="absolute top-2 right-2 p-1 bg-slate-800 text-slate-400 rounded hover:text-white"
                            >
                                <Code size={14} />
                            </button>
                        </div>
                    ) : (
                        <Button onClick={generateApiKey} className="w-full border-dashed border-2 border-white/10 bg-transparent hover:bg-white/5">
                            Generate Root Token
                        </Button>
                    )}
                </div>

                {/* Data Operations */}
                <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                        <Database size={18} className="text-indigo-400" /> State Mutation
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="secondary" onClick={injectMockData} className="text-xs">
                            <Bug size={14} className="mr-2" /> Inject Mocks
                        </Button>
                        <Button variant="secondary" onClick={() => log(`Entropy: ${state.entropy}`)} className="text-xs">
                            <Code size={14} className="mr-2" /> Log Entropy
                        </Button>
                        <Button variant="danger" onClick={crashTest} className="text-xs">
                            <ShieldAlert size={14} className="mr-2" /> Force Crash
                        </Button>
                        <Button variant="danger" onClick={wipeVault} className="text-xs">
                            <Trash2 size={14} className="mr-2" /> Wipe DB
                        </Button>
                    </div>
                </div>

            </div>

            {/* Terminal Output */}
            <div className="bg-black rounded-xl border border-slate-800 p-4 font-mono text-xs h-[400px] overflow-y-auto flex flex-col shadow-inner">
                <div className="text-slate-500 mb-2 border-b border-slate-900 pb-2">Console Output Stream</div>
                <div className="flex-1 space-y-1">
                    {logs.map((line, i) => (
                        <div key={i} className={line.includes('Error') ? 'text-red-400' : line.includes('Warning') ? 'text-amber-400' : 'text-emerald-500/80'}>
                            {line}
                        </div>
                    ))}
                </div>
                <div className="mt-2 flex items-center gap-2 text-slate-500">
                    <span className="animate-pulse">_</span>
                </div>
            </div>

        </div>
    </div>
  );
};
