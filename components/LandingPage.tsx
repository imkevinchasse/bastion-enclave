import React, { useState } from 'react';
import { TopNav } from './TopNav';
import { LandingFeatures } from './LandingFeatures';
import { Button } from './Button';
import { BrandLogo } from './BrandLogo';
import { ArrowRight, BookOpen, ShieldCheck, ServerOff, Scaling, Zap, Lock, HeartHandshake, Code2, Database, HardDrive, FileJson, Binary, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: 'landing' | 'auth' | 'news' | 'documents') => void;
}

const DEMO_STAGES = {
    'input': {
        icon: <FileJson size={20} />,
        label: 'Raw Input',
        desc: 'Plaintext JSON object in memory',
        color: 'text-indigo-400',
        borderColor: 'border-indigo-500',
        bg: 'bg-indigo-500/10',
        code: `{
  "id": "vault_entry_8f92a",
  "service": "github.com",
  "username": "developer@bastion.os",
  "password": "correct-horse-battery-staple",
  "meta": {
    "created": 1709428120400,
    "security": "critical"
  }
}`
    },
    'process': {
        icon: <Binary size={20} />,
        label: 'AES-GCM Encryption',
        desc: 'Web Crypto API transformation',
        color: 'text-emerald-400',
        borderColor: 'border-emerald-500',
        bg: 'bg-emerald-500/10',
        code: `// 1. Generate IV (Initialization Vector)
const iv = window.crypto.getRandomValues(new Uint8Array(12));
// [142, 21, 89, 210, 44, 9, 241, 19, 78, 233, 11, 5]

// 2. Encrypt with Master Key
const key = await window.crypto.subtle.importKey(...);
const cipher = await window.crypto.subtle.encrypt(
  { name: "AES-GCM", iv: iv },
  key,
  encoder.encode(data)
);

// STATUS: OPAQUE BINARY BLOB GENERATED`
    },
    'storage': {
        icon: <HardDrive size={20} />,
        label: 'Local Blob',
        desc: 'Persisted to IndexedDB / localStorage',
        color: 'text-amber-400',
        borderColor: 'border-amber-500',
        bg: 'bg-amber-500/10',
        code: `BASTION_V1_BLOB:
eyJpdiI6IjhFNTVEOUQyQ0MwOSIsImNpcGhlciI6ImE0Zj
kyOGMwZDEyOGU5MmY4OTJjODkwMjFjODkwMTJjODkwMT
JjODkwZjgxMjkwNDgxMjkwNDgxMjkwNDgxMjkwNTgxMjkw
NTgxMjkwNTgxMjkwNTgyMTkwNTgxMjkwNTgxMjkwNTgxMj
kwNTgxMjkwNTgxMjkwNTgxMjkwNTgxMjkwNTgxMjkwNTgx
MjkwNTgxMjkwNTgxMjkwNTgxMjkwNTgxMjkwNTgxMjkwNT
gxMjkwNTgxMjkwNTgxMjkwNTgxMjkwNTgxMjkwNTgxMjkw
`
    }
};

const COMPARISON_DATA = [
    { feature: "Offline‑First Storage", bastion: "✅ Yes (local only)", lp: "❌ Cloud default", bw: "❌ Cloud default", op: "❌ Cloud default", kp: "✅ Yes" },
    { feature: "Zero‑Knowledge Architecture", bastion: "✅ Yes (Verified)", lp: "⚠ Claimed", bw: "✅ Yes", op: "✅ Yes", kp: "✅ Yes (Local)" },
    { feature: "No Central Server Vault", bastion: "✅ Yes (Serverless)", lp: "❌ Yes (cloud backups)", bw: "❌ Yes (cloud/self)", op: "❌ Yes (cloud)", kp: "✅ Yes" },
    { feature: "No Browser Autofill Exposure", bastion: "✅ Yes (Immune)", lp: "❌ Browser Extension", bw: "❌ Browser Extension", op: "❌ Browser Extension", kp: "⚠ Varies" },
    { feature: "Seed + Password + Resonance", bastion: "✅ Yes (Multi-Factor)", lp: "❌ Standard Master Pwd", bw: "❌ Standard Master Pwd", op: "❌ Pwd + Secret Key", kp: "❌ Standard Master Pwd" },
    { feature: "Encryption Standard", bastion: "AES‑256‑GCM", lp: "AES‑256 (CBC/GCM)", bw: "AES‑256 (CBC/GCM)", op: "AES‑256 (GCM)", kp: "AES / ChaCha20" },
    { feature: "Key Derivation Resilience", bastion: "High / Custom", lp: "PBKDF2 Default", bw: "PBKDF2 / Argon2id", op: "PBKDF2 + Secret", kp: "Argon2 / Configurable" },
    { feature: "Self‑Hosting Option", bastion: "✅ Client-Side (Easy)", lp: "❌", bw: "✅ Yes (Docker)", op: "❌", kp: "✅ Yes" },
    { feature: "Open Source / Auditable", bastion: "✅ Open Protocol", lp: "❌ Closed Source", bw: "✅ Yes (AGPL)", op: "❌ Closed Source", kp: "✅ Yes (GPL)" },
    { feature: "Multi‑Platform Support", bastion: "✅ Universal PWA", lp: "✅ All Devices", bw: "✅ All Devices", op: "✅ All Devices", kp: "⚠ Varies by Client" },
    { feature: "Breach Monitoring", bastion: "❌ (Air-Gapped)", lp: "✅ Yes (Cloud)", bw: "✅ Yes (Premium)", op: "✅ Yes (Watchtower)", kp: "❌" },
    { feature: "AI Security Analysis", bastion: "✅ On-Device LLM", lp: "❌", bw: "❌", op: "❌", kp: "❌" },
    { feature: "Cost Model", bastion: "✅ Free / Donation", lp: "❌ Subscription", bw: "✅ Freemium", op: "❌ Subscription", kp: "✅ Free" },
    { feature: "History of Cloud Breaches", bastion: "🚫 N/A (No Cloud)", lp: "❌ Multiple Known", bw: "✅ None Known", op: "✅ None Known", kp: "🚫 N/A" },
    { feature: "Browser Clickjacking Risk", bastion: "🚫 Immune", lp: "⚠ High (DOM Access)", bw: "⚠ High (DOM Access)", op: "⚠ High (DOM Access)", kp: "🚫 Low" },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [activeStage, setActiveStage] = useState<'input' | 'process' | 'storage'>('input');
  
  const currentDemo = DEMO_STAGES[activeStage];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950 font-sans text-slate-200">
        
        {/* Dynamic Space Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-grid opacity-20"></div>
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute top-[40%] right-[0%] w-[50%] h-[60%] bg-emerald-900/10 rounded-full blur-[100px]"></div>
            <div className="absolute inset-0 opacity-30" style={{background: 'radial-gradient(circle at center, transparent 0%, #020617 100%)'}}></div>
        </div>

        <TopNav active="landing" onNavigate={onNavigate} />

        <div className="relative z-10 flex-1 w-full overflow-y-auto">
            
            {/* 1. HERO SECTION */}
            <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-24">
                <div className="flex-1 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Secure Enclave v2.6.0
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[1.1]">
                        Bastion: <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400">
                            Your Digital Fortress
                        </span>
                    </h1>
                    
                    <p className="text-xl text-slate-400 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0">
                        Zero-knowledge security. Offline-first. Your data, your control.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                        <Button size="lg" onClick={() => onNavigate('auth')} className="w-full sm:w-auto h-14 text-lg px-8 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]">
                            See Bastion in Action <ArrowRight size={20} />
                        </Button>
                        <a href="https://github.com/google-gemini/bastion" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                           <Button variant="secondary" size="lg" className="w-full h-14 text-lg px-8">
                               <HeartHandshake size={20} /> Support the Project
                           </Button>
                        </a>
                    </div>
                </div>

                <div className="flex-1 flex justify-center animate-in fade-in zoom-in-95 duration-1000">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full"></div>
                        <BrandLogo size={320} animated={true} className="drop-shadow-[0_0_50px_rgba(99,102,241,0.3)] relative z-10" />
                    </div>
                </div>
            </div>

            {/* 2. CORE VALUE PROP (Features) */}
            <div className="bg-slate-900/30 border-y border-white/5 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-24">
                    <LandingFeatures />
                </div>
            </div>

            {/* 3. ARCHITECTURE & SECURITY */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                    
                    <div className="grid lg:grid-cols-2 gap-12 p-8 lg:p-16 items-start">
                        <div className="space-y-8">
                            <h2 className="text-3xl md:text-4xl font-bold text-white">Zero-Knowledge Architecture</h2>
                            <p className="text-lg text-slate-400 leading-relaxed">
                                Unlike cloud-based password managers that act as central honeypots for hackers, Bastion decentralizes security.
                                <br/><br/>
                                <span className="text-indigo-400 text-sm font-bold uppercase tracking-wider">Try it yourself:</span> Click the pipeline stages to see how your data is transformed.
                            </p>
                            
                            {/* Interactive Pipeline Triggers */}
                            <div className="flex flex-col gap-4">
                                <button 
                                    onClick={() => setActiveStage('input')}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${activeStage === 'input' ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}
                                >
                                    <div className={`p-3 rounded-lg ${activeStage === 'input' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                        <FileJson size={20}/>
                                    </div>
                                    <div>
                                        <h4 className={`font-bold ${activeStage === 'input' ? 'text-white' : 'text-slate-400'}`}>1. Raw Input</h4>
                                        <p className="text-xs text-slate-500">Your password entered in the UI.</p>
                                    </div>
                                    <ArrowRight className={`ml-auto ${activeStage === 'input' ? 'text-indigo-400' : 'text-slate-700'} group-hover:translate-x-1 transition-transform`} size={16} />
                                </button>

                                <button 
                                    onClick={() => setActiveStage('process')}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${activeStage === 'process' ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}
                                >
                                    <div className={`p-3 rounded-lg ${activeStage === 'process' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                        <Zap size={20}/>
                                    </div>
                                    <div>
                                        <h4 className={`font-bold ${activeStage === 'process' ? 'text-white' : 'text-slate-400'}`}>2. AES-GCM Encryption</h4>
                                        <p className="text-xs text-slate-500">Web Crypto API processes data in memory.</p>
                                    </div>
                                    <ArrowRight className={`ml-auto ${activeStage === 'process' ? 'text-emerald-400' : 'text-slate-700'} group-hover:translate-x-1 transition-transform`} size={16} />
                                </button>

                                <button 
                                    onClick={() => setActiveStage('storage')}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${activeStage === 'storage' ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}
                                >
                                    <div className={`p-3 rounded-lg ${activeStage === 'storage' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                        <HardDrive size={20}/>
                                    </div>
                                    <div>
                                        <h4 className={`font-bold ${activeStage === 'storage' ? 'text-white' : 'text-slate-400'}`}>3. Local Blob</h4>
                                        <p className="text-xs text-slate-500">Encrypted string saved to disk.</p>
                                    </div>
                                    <ArrowRight className={`ml-auto ${activeStage === 'storage' ? 'text-amber-400' : 'text-slate-700'} group-hover:translate-x-1 transition-transform`} size={16} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Interactive Code Display */}
                        <div className="relative h-full min-h-[500px] flex flex-col bg-slate-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                            {/* Window Header */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-white/5">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                                </div>
                                <div className="flex-1 text-center font-mono text-[10px] text-slate-500 uppercase">
                                    bastion_runtime_env
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-6 font-mono text-sm overflow-auto custom-scrollbar relative">
                                <div className={`absolute top-0 right-0 p-24 ${currentDemo.bg} blur-[80px] rounded-full opacity-20 transition-colors duration-500`}></div>
                                
                                <div className="relative z-10 animate-in fade-in zoom-in-95 duration-300" key={activeStage}>
                                    <div className={`inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border ${currentDemo.borderColor} ${currentDemo.bg} ${currentDemo.color} text-xs font-bold uppercase tracking-wider`}>
                                        {currentDemo.icon} {currentDemo.label}
                                    </div>
                                    <div className="text-slate-500 mb-6 border-l-2 border-slate-800 pl-3 italic">
                                        // {currentDemo.desc}
                                    </div>
                                    <pre className="text-slate-300 leading-relaxed whitespace-pre-wrap break-all">
                                        {currentDemo.code}
                                    </pre>
                                </div>
                            </div>

                            {/* Status Footer */}
                            <div className="px-4 py-2 bg-slate-900 border-t border-white/5 text-[10px] font-mono flex justify-between text-slate-500">
                                <span>UTF-8</span>
                                <span>{activeStage === 'storage' ? 'ENCRYPTED' : activeStage === 'process' ? 'PROCESSING' : 'PLAINTEXT'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. PROBLEM / SOLUTION */}
            <div className="bg-slate-900/30 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16">
                    <div className="space-y-6">
                        <div className="text-amber-400 font-bold text-sm uppercase tracking-widest">The Problem</div>
                        <h2 className="text-3xl font-bold text-white">Security Without Compromise</h2>
                        <p className="text-lg text-slate-400 leading-relaxed">
                            Most password managers require cloud storage, leaving sensitive data vulnerable to mass breaches. 
                            When a centralized server is hacked, millions of vaults are exposed at once.
                        </p>
                    </div>
                    <div className="space-y-6">
                         <div className="text-emerald-400 font-bold text-sm uppercase tracking-widest">The Solution</div>
                         <h2 className="text-3xl font-bold text-white">Bastion Enclave</h2>
                         <p className="text-lg text-slate-400 leading-relaxed">
                            With a modular design—Chaos Engine™, Locker, Shadow Rolodex, and Neural Auditor—Bastion provides a fortress for your digital life. 
                            All offline, all encrypted, all under your control.
                         </p>
                    </div>
                </div>
            </div>

            {/* 5. COMPETITIVE LANDSCAPE */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-white/10 text-slate-400 text-[10px] font-mono uppercase tracking-widest">
                        <Shield size={12} className="text-indigo-400" /> Market Analysis
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">The Honest Comparison</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                        See how Bastion's offline-first architecture stacks up against traditional cloud-based password managers.
                    </p>
                </div>

                <div className="overflow-x-auto pb-6">
                    <div className="min-w-[1000px]">
                        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 mb-4 px-4">
                            <div className="font-bold text-sm text-slate-500 uppercase tracking-wider py-4">Feature / Capability</div>
                            <div className="font-bold text-lg text-white py-2 flex flex-col items-center justify-center bg-indigo-600/20 border border-indigo-500/50 rounded-t-xl">
                                <BrandLogo size={24} className="mb-2" />
                                Bastion
                            </div>
                            <div className="font-bold text-sm text-slate-400 py-4 text-center">LastPass</div>
                            <div className="font-bold text-sm text-slate-400 py-4 text-center">Bitwarden</div>
                            <div className="font-bold text-sm text-slate-400 py-4 text-center">1Password</div>
                            <div className="font-bold text-sm text-slate-400 py-4 text-center">KeePass (Local)</div>
                        </div>

                        <div className="space-y-2">
                            {COMPARISON_DATA.map((row, idx) => (
                                <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <div className="font-medium text-slate-300 text-sm">{row.feature}</div>
                                    
                                    {/* Bastion Column */}
                                    <div className="text-center font-bold text-white text-sm bg-indigo-500/10 py-3 rounded-lg border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]">
                                        {row.bastion}
                                    </div>
                                    
                                    <div className="text-center text-xs text-slate-500">{row.lp}</div>
                                    <div className="text-center text-xs text-slate-500">{row.bw}</div>
                                    <div className="text-center text-xs text-slate-500">{row.op}</div>
                                    <div className="text-center text-xs text-slate-500">{row.kp}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 6. INVESTOR CALLOUTS */}
            <div className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-colors">
                        <ServerOff size={32} className="text-indigo-400 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-3">Offline-First Advantage</h3>
                        <p className="text-slate-400">Protects users from breaches, leaks, and cloud dependency. Zero infrastructure cost for storage.</p>
                    </div>
                    <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-colors">
                        <Scaling size={32} className="text-violet-400 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-3">Scalable AI Security</h3>
                        <p className="text-slate-400">Neural Auditor runs on the edge (WebGPU), scaling infinitely without backend GPU costs.</p>
                    </div>
                    <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-colors">
                        <Zap size={32} className="text-emerald-400 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-3">Future Roadmap</h3>
                        <p className="text-slate-400">Multi-device mesh networking, advanced backup kits, and enterprise team management.</p>
                    </div>
                </div>
            </div>

            {/* 7. CROWDFUNDING CTA */}
            <div className="relative py-32 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-indigo-900/10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950"></div>
                
                <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                        Support Bastion <br/>
                        <span className="text-indigo-400">Be a Founding Member</span>
                    </h2>
                    <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                        Join our mission to secure the web. Support Bastion with a one-time contribution or ongoing sponsorship. 
                        Get early access to features and be part of our Founders Wall.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button size="lg" className="h-16 px-10 text-xl bg-white text-slate-950 hover:bg-slate-200 hover:text-slate-900 shadow-xl border-0">
                            Support Bastion
                        </Button>
                        <Button size="lg" variant="secondary" className="h-16 px-10 text-xl" onClick={() => onNavigate('auth')}>
                            Join Early Access
                        </Button>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="border-t border-white/5 bg-slate-950 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 opacity-50">
                        <BrandLogo size={24} />
                        <span className="font-bold text-white">Bastion</span>
                    </div>
                    <div className="text-sm text-slate-500 font-mono">
                        © 2024 BASTION SECURITY • OPEN SOURCE PROTOCOL
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};