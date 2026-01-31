
import React, { useState } from 'react';
import { ChaosLock } from '../services/cryptoService';
import { Button } from './Button';
import { Input } from './Input';
import { FlaskConical, Hash, Lock, Unlock, RefreshCw, Copy, Check, Binary, KeyRound } from 'lucide-react';

type Tool = 'hash' | 'cipher' | 'rng';

export const Sandbox: React.FC = () => {
  const [tool, setTool] = useState<Tool>('hash');

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/5 pb-6">
          <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                    <FlaskConical size={24} />
                  </div>
                  Cryptographic Sandbox
              </h2>
              <p className="text-slate-500 text-sm mt-2 font-mono">
                  Ephemeral workspace. Data is processed in-memory and discarded.
              </p>
          </div>
          
          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10">
              <button onClick={() => setTool('hash')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${tool === 'hash' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  <Hash size={14} /> Hashing
              </button>
              <button onClick={() => setTool('cipher')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${tool === 'cipher' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  <Lock size={14} /> Cipher
              </button>
              <button onClick={() => setTool('rng')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${tool === 'rng' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  <Binary size={14} /> Entropy
              </button>
          </div>
      </div>

      {/* Workspace */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 md:p-8 min-h-[400px] relative overflow-hidden">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="relative z-10">
            {tool === 'hash' && <HasherTool />}
            {tool === 'cipher' && <CipherTool />}
            {tool === 'rng' && <EntropyTool />}
          </div>
      </div>
    </div>
  );
};

// --- SUB-TOOLS ---

const HasherTool = () => {
    const [input, setInput] = useState('');
    const [sha256, setSha256] = useState('');
    const [sha512, setSha512] = useState('');

    const handleHash = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);
        if (!val) {
            setSha256('');
            setSha512('');
            return;
        }
        
        const enc = new TextEncoder();
        const data = enc.encode(val);
        
        const b256 = await crypto.subtle.digest('SHA-256', data);
        setSha256(ChaosLock.buf2hex(b256));
        
        const b512 = await crypto.subtle.digest('SHA-512', data);
        setSha512(ChaosLock.buf2hex(b512));
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 block">Input Text</label>
                <textarea 
                    value={input}
                    onChange={handleHash}
                    className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 font-mono text-sm text-slate-200 focus:ring-2 focus:ring-amber-500/50 outline-none resize-none"
                    placeholder="Type to hash..."
                />
            </div>

            <div className="grid gap-6">
                <HashOutput label="SHA-256" value={sha256} color="text-indigo-400" />
                <HashOutput label="SHA-512" value={sha512} color="text-emerald-400" />
            </div>
        </div>
    );
};

const CipherTool = () => {
    const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
    const [password, setPassword] = useState('');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const process = async () => {
        if (!password || !input) return;
        setLoading(true);
        setError('');
        setOutput('');
        
        try {
            if (mode === 'encrypt') {
                const encrypted = await ChaosLock.encryptBinary(new TextEncoder().encode(input), password);
                // Convert to Base64 for display
                const b64 = btoa(String.fromCharCode(...encrypted));
                setOutput(b64);
            } else {
                // Expect Base64 input
                const binStr = atob(input);
                const bytes = Uint8Array.from(binStr, c => c.charCodeAt(0));
                const { data } = await ChaosLock.decryptBinary(bytes, password);
                setOutput(new TextDecoder().decode(data));
            }
        } catch (e) {
            setError(mode === 'decrypt' ? 'Decryption failed. Check password or format.' : 'Encryption failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-center mb-6">
                 <div className="bg-slate-950 p-1 rounded-lg border border-white/10 flex">
                     <button onClick={() => {setMode('encrypt'); setInput(''); setOutput(''); setError('');}} className={`px-6 py-2 rounded text-xs font-bold uppercase tracking-wider ${mode === 'encrypt' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>Encrypt</button>
                     <button onClick={() => {setMode('decrypt'); setInput(''); setOutput(''); setError('');}} className={`px-6 py-2 rounded text-xs font-bold uppercase tracking-wider ${mode === 'decrypt' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>Decrypt</button>
                 </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Input 
                        type="password"
                        label="Encryption Password"
                        placeholder="Secret Key"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        icon={<KeyRound size={16} />}
                    />
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                            {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (Base64)'}
                        </label>
                        <textarea 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
                            placeholder={mode === 'encrypt' ? "Message to hide..." : "Paste Base64 string..."}
                        />
                    </div>
                    <Button onClick={process} isLoading={loading} className="w-full">
                        {mode === 'encrypt' ? <Lock size={16} /> : <Unlock size={16} />} Run Process
                    </Button>
                    {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                        Output Result
                    </label>
                    <div className="w-full h-full min-h-[240px] bg-black/40 border border-slate-800 rounded-xl p-4 relative group">
                        <div className="font-mono text-xs text-emerald-400 break-all whitespace-pre-wrap">
                            {output || <span className="text-slate-700 select-none">// Waiting for input...</span>}
                        </div>
                        {output && (
                            <button 
                                onClick={() => navigator.clipboard.writeText(output)}
                                className="absolute top-4 right-4 p-2 bg-slate-800 rounded hover:bg-white text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                <Copy size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EntropyTool = () => {
    const [len, setLen] = useState(32);
    const [result, setResult] = useState('');
    const [mode, setMode] = useState<'hex' | 'base64' | 'uuid'>('hex');

    const generate = () => {
        if (mode === 'uuid') {
            setResult(crypto.randomUUID());
            return;
        }
        const arr = new Uint8Array(len);
        crypto.getRandomValues(arr);
        
        if (mode === 'hex') {
            setResult([...arr].map(b => b.toString(16).padStart(2, '0')).join(''));
        } else {
            setResult(btoa(String.fromCharCode(...arr)));
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8 py-8">
            <div className="grid grid-cols-3 gap-4">
                 <button onClick={() => setMode('hex')} className={`p-4 rounded-xl border text-center transition-all ${mode === 'hex' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                     <div className="font-bold text-sm mb-1">HEX</div>
                     <div className="text-[10px] opacity-60">0-9, A-F</div>
                 </button>
                 <button onClick={() => setMode('base64')} className={`p-4 rounded-xl border text-center transition-all ${mode === 'base64' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                     <div className="font-bold text-sm mb-1">Base64</div>
                     <div className="text-[10px] opacity-60">Compact</div>
                 </button>
                 <button onClick={() => setMode('uuid')} className={`p-4 rounded-xl border text-center transition-all ${mode === 'uuid' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                     <div className="font-bold text-sm mb-1">UUID v4</div>
                     <div className="text-[10px] opacity-60">Standard</div>
                 </button>
            </div>

            {mode !== 'uuid' && (
                <div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                        <span>BYTE LENGTH</span>
                        <span>{len} BYTES ({len * 8} BITS)</span>
                    </div>
                    <input 
                        type="range" min="8" max="128" step="8" 
                        value={len} onChange={e => setLen(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                </div>
            )}

            <Button onClick={generate} size="lg" className="w-full">
                <RefreshCw size={18} /> Generate Randomness
            </Button>

            {result && (
                <div className="bg-black/50 border border-emerald-500/30 rounded-xl p-6 relative animate-in zoom-in-95">
                    <div className="font-mono text-lg text-emerald-400 break-all text-center">
                        {result}
                    </div>
                    <div className="text-center mt-4">
                        <button 
                            onClick={() => navigator.clipboard.writeText(result)}
                            className="text-xs font-bold text-slate-500 hover:text-white flex items-center justify-center gap-2 mx-auto"
                        >
                            <Copy size={12} /> COPY TO CLIPBOARD
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const HashOutput = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="relative">
        <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            <span className="text-[10px] font-mono text-slate-600">{value ? value.length * 4 + ' bits' : '0 bits'}</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs break-all min-h-[3rem] flex items-center relative group">
            <span className={value ? color : 'text-slate-700'}>{value || '// Waiting for input...'}</span>
            {value && (
                <button 
                    onClick={() => navigator.clipboard.writeText(value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-800 rounded text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                >
                    <Copy size={12} />
                </button>
            )}
        </div>
    </div>
);
