import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { initLLM, runLocalAudit } from '../services/llmService';
import { AuditResult, SecurityLevel, LLMStatus } from '../types';
import { BrainCircuit, AlertTriangle, CheckCircle, Download, Cpu, Activity, ScanLine, Shield } from 'lucide-react';

export const AIAuditor: React.FC = () => {
  const [password, setPassword] = useState('');
  const [llmStatus, setLlmStatus] = useState<LLMStatus>({ status: 'idle', progress: 0, message: '' });
  const [result, setResult] = useState<AuditResult | null>(null);

  const loadModel = async () => {
    setLlmStatus({ status: 'loading', progress: 0, message: 'Initializing WebGPU Compute Shader...' });
    try {
      await initLLM((progressText) => {
        setLlmStatus({ status: 'loading', progress: 1, message: progressText });
      });
      setLlmStatus({ status: 'ready', progress: 100, message: 'TinyLlama Neural Network Active' });
    } catch (e) {
      setLlmStatus({ status: 'error', progress: 0, message: 'GPU Initialization Failed' });
    }
  };

  const handleAudit = async () => {
    if (!password || llmStatus.status !== 'ready') return;
    setLlmStatus({ ...llmStatus, status: 'loading', message: 'Inference Running...' });
    
    try {
        const data = await runLocalAudit(password);
        setResult(data);
        setLlmStatus({ ...llmStatus, status: 'ready', message: 'Analysis complete' });
    } catch (e) {
        setLlmStatus({ status: 'error', progress: 0, message: 'Audit failed.' });
    }
  };

  const getLevelColor = (level: SecurityLevel) => {
    switch(level) {
        case SecurityLevel.CRITICAL: return 'from-red-500/20 to-red-900/20 border-red-500/30 text-red-400';
        case SecurityLevel.LOW: return 'from-orange-500/20 to-orange-900/20 border-orange-500/30 text-orange-400';
        case SecurityLevel.MEDIUM: return 'from-yellow-500/20 to-yellow-900/20 border-yellow-500/30 text-yellow-400';
        case SecurityLevel.HIGH: return 'from-emerald-500/20 to-emerald-900/20 border-emerald-500/30 text-emerald-400';
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8">
        
        {/* Header Card */}
        <div className="relative overflow-hidden bg-slate-900 rounded-2xl border border-white/10 p-6 flex gap-5 items-center">
            <div className="absolute right-0 top-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="w-16 h-16 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-indigo-400 relative z-10 shadow-lg">
                <BrainCircuit size={32} />
            </div>
            <div className="relative z-10">
                <h3 className="text-xl font-bold text-white tracking-tight">Local Neural Audit</h3>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-md">
                    Running <strong>TinyLlama-1.1B</strong> via WebGPU. Zero data egress. Your secrets never leave this browser tab.
                </p>
            </div>
        </div>

        {llmStatus.status === 'idle' || llmStatus.status === 'error' ? (
             <div className="text-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                <div className="mb-4 text-slate-500 text-sm">Model weights (~800MB) required for local inference.</div>
                <Button onClick={loadModel} className="mx-auto px-8" variant={llmStatus.status === 'error' ? 'danger' : 'primary'}>
                    <Download size={18} /> {llmStatus.status === 'error' ? 'Retry Load' : 'Load Neural Network'}
                </Button>
                {llmStatus.status === 'error' && <p className="text-red-400 text-sm mt-4 font-mono">{llmStatus.message}</p>}
             </div>
        ) : (
             <div className="space-y-6">
                 {/* Status Bar */}
                 <div className="bg-slate-900 rounded-xl border border-white/5 p-4 flex items-center gap-4">
                     <div className={`w-3 h-3 rounded-full ${llmStatus.status === 'loading' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                     <div className="flex-1 font-mono text-xs text-slate-400 uppercase tracking-wider">
                         {llmStatus.message}
                     </div>
                 </div>
                 
                 <div className="flex gap-3">
                    <Input 
                        type="password" 
                        placeholder="Paste password for cryptographic analysis..." 
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (result) setResult(null); // Clear stale results when typing
                        }}
                        className="font-mono text-sm"
                        disabled={llmStatus.status !== 'ready'}
                        icon={<ScanLine size={16} />}
                    />
                    <Button onClick={handleAudit} isLoading={llmStatus.status === 'loading'} disabled={!password || llmStatus.status !== 'ready'}>
                        Analyze
                    </Button>
                </div>
             </div>
        )}

        {result && (
            <div className="animate-in zoom-in-95 duration-500 space-y-4">
                {/* Result Hero */}
                <div className={`relative overflow-hidden p-8 rounded-2xl border bg-gradient-to-br ${getLevelColor(result.level)}`}>
                    <div className="absolute top-0 right-0 p-24 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 flex justify-between items-end">
                        <div>
                            <div className="text-xs uppercase tracking-widest font-bold opacity-70 mb-2">Security Classification</div>
                            <div className="text-4xl font-black tracking-tight">{result.level}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-5xl font-black opacity-90">{result.score}</div>
                             <div className="text-[10px] uppercase font-bold opacity-60 mt-1">Entropy Score</div>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <h4 className="flex items-center gap-2 font-bold text-slate-200 mb-4 text-sm uppercase tracking-wider">
                            <Activity size={16} className="text-indigo-400" /> Analysis
                        </h4>
                        <p className="text-slate-400 text-sm leading-relaxed">{result.analysis}</p>
                    </div>

                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <h4 className="flex items-center gap-2 font-bold text-slate-200 mb-4 text-sm uppercase tracking-wider">
                            <Shield size={16} className="text-emerald-400" /> Protocol
                        </h4>
                        <ul className="space-y-3">
                            {result.suggestions.map((s, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-400">
                                    {result.level === SecurityLevel.HIGH ? <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
                                    <span>{s}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};