
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { initLLM, runCredentialAudit, runPhishingAnalysis, isModelReady } from '../services/llmService';
import { AuditResult, SecurityLevel, LLMStatus, PhishingResult } from '../types';
import { BrainCircuit, AlertTriangle, CheckCircle, Download, Activity, ScanLine, Shield, Mail, Lock, User, Globe, AlertOctagon, Terminal, Eye, MessageSquare, Key, Layers, Workflow, Network, Zap } from 'lucide-react';

type AnalysisMode = 'credential' | 'phishing';

export const AIAuditor: React.FC = () => {
  const [mode, setMode] = useState<AnalysisMode>('credential');
  const [llmStatus, setLlmStatus] = useState<LLMStatus>({ status: 'idle', progress: 0, message: '' });
  
  // Credential State
  const [password, setPassword] = useState('');
  const [service, setService] = useState('');
  const [username, setUsername] = useState('');
  const [credResult, setCredResult] = useState<AuditResult | null>(null);

  // Phishing State
  const [phishText, setPhishText] = useState('');
  const [phishResult, setPhishResult] = useState<PhishingResult | null>(null);
  const [thinkingStep, setThinkingStep] = useState<number>(0); // 0=Idle, 1=Heuristic, 2=Semantic, 3=Reasoning

  useEffect(() => {
      loadModel();
  }, []);

  const loadModel = async () => {
    if (isModelReady()) {
        setLlmStatus({ status: 'ready', progress: 100, message: 'Hybrid Engine Active' });
        return;
    }

    setLlmStatus({ status: 'loading', progress: 0, message: 'Initializing Hybrid Architecture...' });
    try {
      await initLLM((progressText) => {
        setLlmStatus(prev => ({ ...prev, status: 'loading', message: progressText }));
      });
      setLlmStatus({ status: 'ready', progress: 100, message: 'Neural Engines Ready' });
    } catch (e: any) {
      setLlmStatus({ status: 'error', progress: 0, message: e.message || 'Initialization Failed' });
    }
  };

  const handleCredentialAudit = async () => {
    if (!password || llmStatus.status !== 'ready') return;
    setLlmStatus(prev => ({ ...prev, status: 'loading', message: 'Extracting Signals...' }));
    
    try {
        const result = await runCredentialAudit(password, service, username);
        setCredResult(result);
        setLlmStatus(prev => ({ ...prev, status: 'ready', message: 'Audit Complete' }));
    } catch (e) {
        setLlmStatus(prev => ({ ...prev, status: 'error', message: 'Inference Error' }));
    }
  };

  const handlePhishingScan = async () => {
      if (!phishText || llmStatus.status !== 'ready') return;
      setPhishResult(null);
      setThinkingStep(1);
      
      // Visualizing the 3-Layer Process with slight delays for UX
      const sequence = async () => {
          setLlmStatus(prev => ({ ...prev, status: 'loading', message: 'Layer 1: Deterministic Heuristics...' }));
          await new Promise(r => setTimeout(r, 600)); 
          
          setThinkingStep(2);
          setLlmStatus(prev => ({ ...prev, status: 'loading', message: 'Layer 2: MiniLM-L12 Semantic Mapping...' }));
          
          try {
              const result = await runPhishingAnalysis(phishText);
              
              setThinkingStep(3);
              setLlmStatus(prev => ({ ...prev, status: 'loading', message: 'Layer 3: TinyLlama Logic Synthesis...' }));
              await new Promise(r => setTimeout(r, 800));
              
              setPhishResult(result);
              setThinkingStep(0);
              setLlmStatus(prev => ({ ...prev, status: 'ready', message: 'Analysis Complete' }));
          } catch (e) {
              setLlmStatus(prev => ({ ...prev, status: 'error', message: 'Pipeline Failed' }));
              setThinkingStep(0);
          }
      };
      
      sequence();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
    if (score >= 70) return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
    return 'text-red-400 border-red-500/50 bg-red-500/10';
  };

  const getIndicatorStyle = (ind: string) => {
      const redSignals = ['URGENCY', 'CREDENTIAL', 'FINANCIAL', 'PRESSURE'];
      if (redSignals.includes(ind)) return 'bg-red-500/10 text-red-400 border-red-500/20';
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500 gap-6">
        
        {/* HEADER & STATUS */}
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    <BrainCircuit size={28} className="text-violet-400" /> Neural Security Center
                </h2>
                <div className="flex items-center gap-4 text-slate-400 text-xs mt-1 font-mono">
                    <span className="flex items-center gap-1"><Layers size={10}/> 3-Layer Pipeline</span>
                    <span className="flex items-center gap-1"><Workflow size={10}/> MiniLM-L12 (Embeddings)</span>
                    <span className="flex items-center gap-1"><Network size={10}/> TinyLlama (Logic)</span>
                </div>
            </div>

            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${llmStatus.status === 'ready' ? 'bg-emerald-900/20 border-emerald-500/30' : llmStatus.status === 'error' ? 'bg-red-900/20 border-red-500/30' : 'bg-slate-900 border-white/10'}`}>
                {llmStatus.status === 'loading' ? (
                    <Activity size={18} className="text-indigo-400 animate-spin" />
                ) : llmStatus.status === 'ready' ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                ) : (
                    <AlertTriangle size={18} className="text-red-400" />
                )}
                <div className="text-right">
                    <div className={`text-xs font-bold uppercase tracking-widest ${llmStatus.status === 'ready' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {llmStatus.status === 'error' ? 'OFFLINE' : llmStatus.status === 'ready' ? 'HYBRID ENGINE ACTIVE' : 'PROCESSING'}
                    </div>
                    {llmStatus.message && <div className="text-[10px] text-slate-500 font-mono max-w-[200px] truncate">{llmStatus.message}</div>}
                </div>
            </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 border-b border-white/5 pb-1">
            <button 
                onClick={() => setMode('credential')}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl text-sm font-bold transition-all ${mode === 'credential' ? 'bg-slate-800 text-white border-t border-x border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Lock size={16} /> Credential Audit
            </button>
            <button 
                onClick={() => setMode('phishing')}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl text-sm font-bold transition-all ${mode === 'phishing' ? 'bg-slate-800 text-white border-t border-x border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <MessageSquare size={16} /> Social Engineering
            </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 bg-slate-800/30 rounded-b-2xl rounded-tr-2xl border border-white/5 p-8 relative overflow-hidden">
            
            {llmStatus.status === 'error' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-8 text-center">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Neural Engine Unavailable</h3>
                    <p className="text-slate-400 max-w-md mb-6">
                        Your browser does not support WebGPU or the model failed to load.
                    </p>
                    <Button onClick={loadModel} variant="secondary">Retry Initialization</Button>
                </div>
            )}

            {mode === 'credential' ? (
                <div className="grid lg:grid-cols-2 gap-12 h-full">
                    <div className="space-y-6">
                        <div className="bg-indigo-900/10 p-4 rounded-xl border border-indigo-500/20 text-indigo-200 text-sm">
                            <strong className="block mb-1 flex items-center gap-2"><ScanLine size={16}/> Context-Aware Analysis</strong>
                            Checks for pattern leaks between your identity (Username/Service) and your password using heuristic matching.
                        </div>

                        <div className="space-y-4">
                            <Input 
                                label="Target Service (Optional)" 
                                placeholder="e.g. PayPal, Gmail" 
                                value={service}
                                onChange={e => setService(e.target.value)}
                                icon={<Globe size={16} />}
                            />
                            <Input 
                                label="Username / Identity (Optional)" 
                                placeholder="e.g. john.doe" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                icon={<User size={16} />}
                            />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password to Audit</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        className="w-full bg-slate-900/50 border border-slate-700/50 text-slate-100 rounded-xl py-3 px-4 pl-11 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                                        placeholder="Enter password..."
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={handleCredentialAudit} 
                            isLoading={llmStatus.status === 'loading'}
                            className="w-full py-4 text-lg"
                            disabled={!password}
                        >
                            Run Deep Audit
                        </Button>
                    </div>

                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 relative min-h-[300px]">
                        {!credResult ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 opacity-50">
                                <Shield size={64} strokeWidth={1} className="mb-4" />
                                <p className="text-sm font-mono uppercase tracking-widest">Awaiting Input Data</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Security Score</div>
                                        <div className={`text-4xl font-black ${getScoreColor(credResult.score).split(' ')[0]}`}>
                                            {credResult.score}/100
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-lg border text-sm font-bold uppercase tracking-wider ${getScoreColor(credResult.score)}`}>
                                        {credResult.level} RISK
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">AI Reasoning</div>
                                    <p className="text-slate-300 text-sm leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                                        {credResult.analysis}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recommendations</div>
                                    <ul className="space-y-2">
                                        {credResult.suggestions.map((s, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                                <CheckCircle size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-12 h-full">
                    <div className="space-y-6">
                        <div className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-500/20 text-emerald-200 text-sm">
                            <strong className="block mb-1 flex items-center gap-2"><Layers size={16}/> 3-Layer Defense Grid</strong>
                            Content is processed sequentially: Heuristic Rules &rarr; Semantic Embeddings &rarr; Neural Reasoning.
                        </div>

                        <textarea 
                            className="w-full h-64 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none placeholder-slate-600"
                            placeholder="Paste suspicious text here..."
                            value={phishText}
                            onChange={e => setPhishText(e.target.value)}
                        />

                        {thinkingStep > 0 && (
                            <div className="flex items-center gap-2 py-2">
                                <div className="flex gap-1">
                                    <div className={`w-2 h-2 rounded-full ${thinkingStep >= 1 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                    <div className={`w-2 h-2 rounded-full ${thinkingStep >= 2 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                    <div className={`w-2 h-2 rounded-full ${thinkingStep >= 3 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                </div>
                                <span className="text-xs text-emerald-400 font-mono animate-pulse">
                                    {thinkingStep === 1 && 'EXTRACTING_SIGNALS'}
                                    {thinkingStep === 2 && 'MAPPING_VECTORS'}
                                    {thinkingStep === 3 && 'GENERATING_REPORT'}
                                </span>
                            </div>
                        )}

                        <Button 
                            onClick={handlePhishingScan} 
                            isLoading={thinkingStep > 0}
                            className="w-full py-4 text-lg bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                            disabled={!phishText}
                        >
                            <Zap size={18} /> Analyze Intent
                        </Button>
                    </div>

                    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 relative min-h-[300px]">
                        {!phishResult ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 opacity-50">
                                <AlertOctagon size={64} strokeWidth={1} className="mb-4" />
                                <p className="text-sm font-mono uppercase tracking-widest">Awaiting Text Sample</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                    <div className="space-y-1">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Threat Level</div>
                                        <div className={`text-3xl font-black ${phishResult.riskLevel === 'DANGEROUS' ? 'text-red-500' : phishResult.riskLevel === 'SUSPICIOUS' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {phishResult.riskLevel}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hybrid Confidence</div>
                                        <div className="text-xl font-mono text-white">{phishResult.confidence}%</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Neural Explanation</div>
                                    <p className="text-slate-300 text-sm leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                                        {phishResult.analysis}
                                    </p>
                                </div>

                                {phishResult.indicators.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Detected Signals</div>
                                        <div className="flex flex-wrap gap-2">
                                            {phishResult.indicators.map((ind, i) => (
                                                <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${getIndicatorStyle(ind)}`}>
                                                    <AlertTriangle size={10} /> {ind}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
