
import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Database, Server, Laptop, Skull, Lock, Unlock, Zap, Activity, Play, Pause, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './Button';

type Stage = 0 | 1 | 2 | 3;

const STAGES = [
  {
    id: 0,
    title: "Infiltration",
    time: "T-00:00",
    desc: "Attacker compromises a DevOps engineer's API key via phishing.",
    status: "PERIMETER BREACHED"
  },
  {
    id: 1,
    title: "Lateral Movement",
    time: "T+04:15",
    desc: "Attacker uses keys to escalate privileges and access production S3 buckets.",
    status: "ADMIN ACCESS GAINED"
  },
  {
    id: 2,
    title: "Exfiltration",
    time: "T+08:30",
    desc: "25TB of encrypted user vaults are copied to an external command server.",
    status: "DATA STOLEN"
  },
  {
    id: 3,
    title: "Decryption",
    time: "T+48:00",
    desc: "Offline GPU clusters attempt to brute-force master passwords.",
    status: "INTEGRITY CRITICAL"
  }
];

export const AttackVisualizer: React.FC = () => {
  const [stage, setStage] = useState<Stage>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'strong'>('weak');

  // Auto-play logic
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setStage(prev => {
          if (prev >= 3) {
            setIsPlaying(false);
            return 3;
          }
          return (prev + 1) as Stage;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const getCloudOutcome = () => {
      if (stage < 3) return "Compromised";
      if (passwordStrength === 'weak') return "BREACHED";
      return "AT RISK";
  };

  const getBastionOutcome = () => {
      if (stage === 0) return "Ignored";
      return "SECURE";
  };

  return (
    <div className="w-full bg-slate-900/80 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-8">
        
        {/* Header / Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-white/5 bg-slate-950/50">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                    <Activity size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg tracking-tight">Breach Timeline Visualizer</h3>
                    <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Forensic Simulation // {STAGES[stage].time}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-900 p-1.5 rounded-xl border border-white/5">
                 <button 
                    onClick={() => setPasswordStrength('weak')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${passwordStrength === 'weak' ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-white'}`}
                 >
                    Weak Password
                 </button>
                 <button 
                    onClick={() => setPasswordStrength('strong')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${passwordStrength === 'strong' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white'}`}
                 >
                    Strong Password
                 </button>
            </div>
        </div>

        {/* Visualization Canvas */}
        <div className="relative h-[400px] bg-[#020617] p-8 flex flex-col justify-center overflow-hidden">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>

            {/* --- TOP TRACK: CLOUD --- */}
            <div className="flex items-center justify-between relative z-10 mb-16">
                 {/* Attacker Node */}
                 <div className="flex flex-col items-center gap-2 w-24 relative">
                     <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${stage >= 0 ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                         <Skull size={24} />
                     </div>
                     <span className="text-[10px] font-mono text-red-400 font-bold tracking-widest">THREAT_ACTOR</span>
                 </div>

                 {/* Connection Line */}
                 <div className="flex-1 h-0.5 bg-slate-800 mx-4 relative overflow-hidden">
                     <div className={`absolute inset-0 bg-red-500 transition-transform duration-1000 ${stage >= 1 ? 'translate-x-0' : '-translate-x-full'}`}></div>
                     {stage >= 1 && <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-red-500 to-transparent animate-pulse"></div>}
                 </div>

                 {/* Cloud DB Node */}
                 <div className="flex flex-col items-center gap-2 w-24 relative">
                     <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${stage >= 1 ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                         <Database size={24} />
                     </div>
                     <span className="text-[10px] font-mono text-slate-500 font-bold tracking-widest">CLOUD_DB</span>
                 </div>

                 {/* Connection Line */}
                 <div className="flex-1 h-0.5 bg-slate-800 mx-4 relative overflow-hidden">
                     <div className={`absolute inset-0 bg-red-500 transition-transform duration-1000 ${stage >= 2 ? 'translate-x-0' : '-translate-x-full'}`}></div>
                     {stage === 2 && <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZWY0NDQ0IiBmaWxsLW9wYWNpdHk9IjAuNSIvPgo8L3N2Zz4=')] opacity-50 animate-flow"></div>}
                 </div>

                 {/* User Outcome Node */}
                 <div className="flex flex-col items-center gap-2 w-24 relative">
                     <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${stage >= 3 ? (passwordStrength === 'weak' ? 'bg-red-500 border-red-500 text-white' : 'bg-amber-500/20 border-amber-500 text-amber-500') : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                         {stage >= 3 ? <Unlock size={24} /> : <Lock size={24} />}
                     </div>
                     <span className={`text-[10px] font-mono font-bold tracking-widest ${stage >= 3 ? (passwordStrength === 'weak' ? 'text-red-500' : 'text-amber-500') : 'text-slate-500'}`}>
                        {stage < 3 ? 'USER_VAULT' : passwordStrength === 'weak' ? 'CRACKED' : 'EXPOSED'}
                     </span>
                 </div>
            </div>

            {/* --- BOTTOM TRACK: BASTION --- */}
            <div className="flex items-center justify-between relative z-10">
                 {/* Attacker Node (Ghost) */}
                 <div className="flex flex-col items-center gap-2 w-24 opacity-20">
                     <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-slate-700 bg-slate-800">
                         <Skull size={24} />
                     </div>
                 </div>

                 {/* Broken Line */}
                 <div className="flex-1 flex items-center justify-center mx-4">
                     <div className="h-0.5 w-1/3 bg-gradient-to-r from-slate-800 to-transparent"></div>
                     <div className="px-4 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                         AIR GAP / NO SERVER
                     </div>
                     <div className="h-0.5 w-1/3 bg-transparent"></div>
                 </div>

                 {/* Bastion Node (Secure) */}
                 <div className="flex flex-col items-center gap-2 w-24">
                     <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]`}>
                         <Laptop size={24} />
                     </div>
                     <span className="text-[10px] font-mono text-emerald-500 font-bold tracking-widest">LOCAL_DEVICE</span>
                 </div>
            </div>

            {/* Scenario Label Overlay */}
            <div className="absolute left-8 bottom-8 text-xs font-mono text-slate-600">
                SCENARIO: CENTRALIZED CLOUD BREACH
            </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="bg-slate-950/80 p-6 border-t border-white/5">
            <div className="flex items-center gap-4 mb-6">
                 <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20"
                 >
                     {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                 </button>
                 
                 {/* Steps */}
                 <div className="flex-1 grid grid-cols-4 gap-2">
                     {STAGES.map((s, idx) => (
                         <div 
                            key={s.id} 
                            onClick={() => { setStage(s.id as Stage); setIsPlaying(false); }}
                            className={`cursor-pointer group relative h-2 rounded-full transition-all duration-500 ${idx <= stage ? 'bg-indigo-500' : 'bg-slate-800 hover:bg-slate-700'}`}
                         >
                             {/* Tooltip */}
                             <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[150px] bg-slate-800 border border-white/10 p-2 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20`}>
                                 <div className="font-bold text-white mb-1">{s.time}</div>
                                 <div className="text-slate-400">{s.title}</div>
                             </div>
                         </div>
                     ))}
                 </div>
            </div>

            {/* Info Panel */}
            <div className="grid md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2">
                <div className="col-span-2">
                    <h4 className="text-indigo-400 font-bold text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
                        Step {stage + 1}: {STAGES[stage].title}
                    </h4>
                    <p className="text-slate-300 leading-relaxed text-sm">
                        {STAGES[stage].desc}
                    </p>
                </div>
                <div className="bg-slate-900 rounded-xl border border-white/5 p-4 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Cloud Impact</span>
                        <span className={`text-xs font-bold ${stage >= 3 && passwordStrength === 'weak' ? 'text-red-500 animate-pulse' : stage >= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                            {getCloudOutcome()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Bastion Impact</span>
                        <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                            <CheckCircle size={12} /> {getBastionOutcome()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
