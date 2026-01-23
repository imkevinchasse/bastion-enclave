import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Copy, RefreshCw, ShieldCheck, ShieldAlert, Shield, Zap } from 'lucide-react';

export const Generator: React.FC = () => {
  const [length, setLength] = useState(16);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    let charset = '';
    if (useLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (useUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useNumbers) charset += '0123456789';
    if (useSymbols) charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    if (charset === '') return;

    let retVal = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      retVal += charset[array[i] % charset.length];
    }
    setPassword(retVal);
    setCopied(false);
  };

  useEffect(() => {
    generatePassword();
  }, [length, useUppercase, useLowercase, useNumbers, useSymbols]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStrengthColor = () => {
    const poolSize = (useLowercase ? 26 : 0) + (useUppercase ? 26 : 0) + (useNumbers ? 10 : 0) + (useSymbols ? 32 : 0);
    const entropy = length * Math.log2(poolSize || 1);
    
    if (entropy < 50) return 'text-red-400 bg-red-400/10 border-red-500/20';
    if (entropy < 80) return 'text-amber-400 bg-amber-400/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Entropy Generator</h1>
          <p className="text-slate-400">Cryptographically secure random artifacts.</p>
      </div>

      {/* Hero Display */}
      <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
          <div className="relative bg-slate-900 rounded-2xl border border-white/10 p-8 flex flex-col items-center justify-center gap-4 shadow-2xl">
              
              <div className="w-full font-mono text-3xl md:text-4xl text-center break-all text-white font-bold tracking-tight selection:bg-indigo-500/30">
                  {password}
              </div>
              
              <div className="flex items-center gap-3 mt-2">
                   <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStrengthColor()}`}>
                       <ShieldCheck size={14} />
                       {length > 20 ? 'Bit-Rot Proof' : 'Secure'}
                   </div>
                   {copied && <span className="text-emerald-400 text-xs font-bold animate-pulse">COPIED TO CLIPBOARD</span>}
              </div>

              <div className="absolute right-4 top-4">
                  <button 
                    onClick={copyToClipboard} 
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                  >
                      <Copy size={20} />
                  </button>
              </div>
          </div>
      </div>

      {/* Controls */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <div className="space-y-8">
            <div>
                <div className="flex justify-between text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">
                    <span>Artifact Length</span>
                    <span className="text-white">{length} Chars</span>
                </div>
                <input 
                    type="range" 
                    min="6" 
                    max="64" 
                    value={length} 
                    onChange={(e) => setLength(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'ABC', state: useUppercase, setter: setUseUppercase },
                    { label: 'abc', state: useLowercase, setter: setUseLowercase },
                    { label: '123', state: useNumbers, setter: setUseNumbers },
                    { label: '#@$', state: useSymbols, setter: setUseSymbols },
                ].map((opt, i) => (
                    <button 
                        key={i}
                        onClick={() => opt.setter(!opt.state)}
                        className={`p-4 rounded-xl border font-bold text-sm transition-all duration-200 ${opt.state ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300' : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/20'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <Button onClick={generatePassword} className="w-full py-4 text-lg shadow-xl shadow-indigo-500/10">
                <Zap className="w-5 h-5 fill-current" /> Regenerate Entropy
            </Button>
        </div>
      </div>
    </div>
  );
};