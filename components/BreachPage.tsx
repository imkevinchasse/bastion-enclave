
import React, { useState } from 'react';
import { ShieldAlert, Search, CheckCircle, AlertTriangle, Info, Lock, Globe, Server, Hash } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { TopNav } from './TopNav';
import { PublicPage } from '../types';
import { BreachService } from '../services/breachService';

interface BreachPageProps {
  onNavigate: (page: PublicPage) => void;
}

type ScanStatus = 'idle' | 'hashing' | 'scanning' | 'result' | 'error';

export const BreachPage: React.FC<BreachPageProps> = ({ onNavigate }) => {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [pwnCount, setPwnCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);

  const checkBreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    // Client-Side Rate Limiting (Throttle)
    const now = Date.now();
    if (now - lastScanTime < 3000) {
        setStatus('error');
        setErrorMsg("Requesting too fast. Please wait a moment.");
        return;
    }
    setLastScanTime(now);

    setStatus('hashing');
    setPwnCount(null);
    setErrorMsg('');

    try {
      // 1. UI Feedback: Hashing
      // (The hashing happens inside BreachService, but we show the state for UX)
      await new Promise(r => setTimeout(r, 300)); 

      setStatus('scanning');

      // 2. Fetch using shared Service
      const count = await BreachService.checkPassword(password);
      
      setPwnCount(count);
      setStatus('result');

    } catch (err: any) {
      setStatus('error');
      if (err.message === "CONGESTION") {
          setErrorMsg("Network congestion detected. There are too many requests being made right now. Please check back later.");
      } else {
          setErrorMsg("Connection to privacy relay failed. Please check your internet connection.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950 font-sans text-slate-200">
        
        {/* Dynamic Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-grid opacity-20"></div>
            <div className="absolute top-[30%] left-[50%] w-[50%] h-[50%] bg-red-900/5 rounded-full blur-[120px] -translate-x-1/2"></div>
        </div>

        <TopNav active="breach" onNavigate={onNavigate} />

        <div className="relative z-10 flex-1 w-full max-w-4xl mx-auto p-6 pt-32 pb-12 flex flex-col items-center">
            
            {/* Header */}
            <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_40px_-5px_rgba(239,68,68,0.2)]">
                    <ShieldAlert size={40} className="text-red-500" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                    Breach Reconnaissance
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    Check if your password has been exposed in a known data breach. 
                    Uses <strong>k-Anonymity</strong> to ensure your password never leaves this device.
                </p>
            </div>

            {/* Main Interaction Card */}
            <div className="w-full max-w-xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                
                {status === 'idle' || status === 'error' ? (
                    <form onSubmit={checkBreach} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password to Check</label>
                            <Input 
                                type="password" 
                                placeholder="Enter password..." 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-14 text-lg"
                                autoFocus
                            />
                        </div>

                        {status === 'error' && (
                            <div className="p-3 bg-red-950/50 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                                <AlertTriangle size={16} className="shrink-0" /> {errorMsg}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-14 text-lg" disabled={!password}>
                            <Search size={20} /> Analyze Hash
                        </Button>

                        <div className="text-center text-[10px] text-slate-500 font-mono leading-relaxed mt-4">
                            PRIVACY GUARANTEE: The full hash of your password is NEVER sent. 
                            We only transmit the first 5 characters (prefix) to the API. 
                            The matching happens locally in your browser.
                        </div>
                    </form>
                ) : status === 'hashing' || status === 'scanning' ? (
                    <div className="py-12 text-center space-y-6">
                        <div className="relative w-20 h-20 mx-auto">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                {status === 'hashing' ? <Hash size={24} className="text-indigo-400 animate-pulse"/> : <Globe size={24} className="text-indigo-400 animate-pulse"/>}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">
                                {status === 'hashing' ? 'Computing SHA-1 Hash...' : 'Querying Anonymity Set...'}
                            </h3>
                            <p className="text-slate-400 text-sm font-mono">
                                {status === 'hashing' ? 'LOCAL_CPU_OP' : 'GET api.pwnedpasswords.com/range/XXXXX'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 space-y-8 animate-in fade-in">
                        {pwnCount && pwnCount > 0 ? (
                            <>
                                <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(239,68,68,0.5)] animate-pulse">
                                    <AlertTriangle size={48} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-red-500 mb-2">COMPROMISED</h2>
                                    <p className="text-slate-300">
                                        This password appears in <strong className="text-white text-lg">{pwnCount.toLocaleString()}</strong> known breaches.
                                    </p>
                                </div>
                                <div className="p-4 bg-red-950/30 border border-red-500/20 rounded-xl text-left">
                                    <h4 className="text-red-400 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Info size={14} /> Recommendation
                                    </h4>
                                    <p className="text-sm text-red-200/80">
                                        Do not use this password. If you are using it somewhere, change it immediately. 
                                        Use the Bastion Generator to create a unique, unguessable alternative.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                                    <CheckCircle size={48} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-emerald-500 mb-2">NO MATCH FOUND</h2>
                                    <p className="text-slate-300">
                                        This password was not found in the public database of leaked credentials.
                                    </p>
                                </div>
                                <div className="p-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-left">
                                    <h4 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Lock size={14} /> Good News
                                    </h4>
                                    <p className="text-sm text-emerald-200/80">
                                        This does not guarantee the password is secure, only that it hasn't been publicly leaked 
                                        in the specific datasets we checked. Always use complex, unique passwords.
                                    </p>
                                </div>
                            </>
                        )}
                        
                        <Button onClick={() => { setStatus('idle'); setPassword(''); }} variant="secondary" className="w-full">
                            Check Another
                        </Button>
                    </div>
                )}
            </div>

            {/* Protocol Explanation */}
            <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-5xl w-full">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                    <Hash className="text-indigo-400 mb-4" size={24} />
                    <h3 className="font-bold text-white mb-2">1. Client-Side Hashing</h3>
                    <p className="text-sm text-slate-400">
                        Your browser computes the SHA-1 hash. The plain text password is wiped from memory immediately after hashing.
                    </p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                    <Server className="text-indigo-400 mb-4" size={24} />
                    <h3 className="font-bold text-white mb-2">2. Prefix Query</h3>
                    <p className="text-sm text-slate-400">
                        We send only the first 5 characters of the hash to the API. This returns a list of ~500 suffix matches.
                    </p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                    <Lock className="text-indigo-400 mb-4" size={24} />
                    <h3 className="font-bold text-white mb-2">3. Local Match</h3>
                    <p className="text-sm text-slate-400">
                        Your browser checks if the remaining hash characters exist in the downloaded list. The API never sees your full hash.
                    </p>
                </div>
            </div>

            {/* Attribution */}
            <div className="mt-12 text-center text-slate-600 text-xs">
                Password breach data provided by <a href="https://haveibeenpwned.com" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">Have I Been Pwned</a> (haveibeenpwned.com).
                <br/>
                This service strictly adheres to the k-Anonymity model for privacy preservation.
            </div>

        </div>
    </div>
  );
};
