
import React, { useState, useEffect } from 'react';
import { TopNav } from '@/components/TopNav';
import { LandingFeatures } from '@/components/LandingFeatures';
import { Button } from '@/components/Button';
import { BrandLogo } from '@/components/BrandLogo';
import { ArrowRight, HeartHandshake, Zap, HardDrive, FileJson, Binary, Shield, ServerOff, Scaling, Terminal, Lock, Globe, Database, Anchor, RefreshCw, Cpu, CheckCircle, GitFork, ShieldCheck, Fingerprint, Activity } from 'lucide-react';
import { PublicPage } from '@/types';
import { ProvenanceService, ProvenanceReport } from '@/services/provenance';

interface LandingPageProps {
  onNavigate: (page: PublicPage) => void;
}

const DEMO_STAGES = {
    'input': {
        icon: <FileJson size={20} />,
        label: 'Raw Input',
        desc: 'Plaintext JSON object in volatile RAM',
        color: 'text-indigo-400',
        borderColor: 'border-indigo-500',
        bg: 'bg-indigo-500/10',
        code: `{
  "id": "vault_entry_8f92a",
  "service": "github.com",
  "username": "faith@key.homestead",
  "password": "correct-horse-battery-staple",
  "protocol": "SOVEREIGN_V3.5"
}`
    },
    'process': {
        icon: <Binary size={20} />,
        label: 'Argon2id Transmutation',
        desc: 'Memory-Hard Key Derivation (V3 Standard)',
        color: 'text-emerald-400',
        borderColor: 'border-emerald-500',
        bg: 'bg-emerald-500/10',
        code: `// Sovereign-V3: Anti-ASIC Hardening
const masterKey = await argon2id({
  password: userInput,
  salt: randomBytes(16),
  parallelism: 1,
  iterations: 3,
  memorySize: 65536, // 64 MB RAM Cost
  hashLength: 32,
  outputType: 'binary'
});

// STATUS: KEY DERIVED (TIME COST: ~250ms)`
    },
    'chaos': {
        icon: <RefreshCw size={20} />,
        label: 'Chaos Engine V2',
        desc: 'Deterministic Stateless Generation',
        color: 'text-violet-400',
        borderColor: 'border-violet-500',
        bg: 'bg-violet-500/10',
        code: `// Chaos V2: HMAC-SHA512 + Rejection Sampling
const salt = "BASTION_V2::" + service + "::" + user;
const flux = pbkdf2(entropy, salt, 210000, 512);

// Zero-Bias Sampling Loop
while (out.length < length) {
  const byte = flux[i++];
  if (byte < limit) { // Reject biased bytes
    out += charset[byte % charset.length];
  }
}
// RESULT: 8x9#mP2$v... (Never Stored)`
    },
    'storage': {
        icon: <HardDrive size={20} />,
        label: 'Local Storage',
        desc: 'Authenticated Encryption (AEAD)',
        color: 'text-amber-400',
        borderColor: 'border-amber-500',
        bg: 'bg-amber-500/10',
        code: `// Header: "BSTN" + Version 0x04 (V3.5)
[0x42, 0x53, 0x54, 0x4E, 0x04]

// Payload (AES-256-GCM) + Deterministic Padding
IV:  [12 bytes random]
TAG: [16 bytes auth]
PAD: [0x00 * n] // Align to 64 bytes
CIPHER: [Encrypted Data]

// STORAGE LOCATION: IndexedDB / LocalStorage
// SERVER STATUS: 404 NOT FOUND (No Backend)`
    }
};

// Fact-checked comparison data. 
// "Local-First" vs "Cloud-First". 
// "On-Device AI" vs "Cloud AI".
const COMPARISON_DATA = [
    { feature: "Primary Storage Model", bastion: "Local Device (Sovereign)", lp: "Cloud Database", bw: "Cloud Database", op: "Cloud Database", kp: "Local File" },
    { feature: "Trust Boundary", bastion: "Device Root", lp: "Vendor Cloud", bw: "Vendor Cloud", op: "Vendor Cloud", kp: "Device Root" },
    { feature: "Encryption", bastion: "Argon2id (Memory-Hard)", lp: "PBKDF2", bw: "PBKDF2 (Argon2 Opt)", op: "PBKDF2 + Secret Key", kp: "AES / ChaCha20" },
    { feature: "Zero-Knowledge Architecture", bastion: "By Architecture (No Server)", lp: "By Policy", bw: "Audited Code", op: "Proprietary", kp: "Local Only" },
    { feature: "AI Security Analysis", bastion: "On-Device (WebGPU)", lp: "Cloud-Assisted", bw: "Basic Reporting", op: "Basic Reporting", kp: "None" },
    { feature: "Traffic Analysis Resistance", bastion: "Deterministic Padding", lp: "Variable", bw: "Variable", op: "Variable", kp: "Variable" },
    { feature: "Data Serialization", bastion: "Canonical (Enforced)", lp: "Implementation Dependent", bw: "Implementation Dependent", op: "Implementation Dependent", kp: "XML / Binary" },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [activeStage, setActiveStage] = useState<'input' | 'process' | 'chaos' | 'storage'>('input');
  const [provenance, setProvenance] = useState<ProvenanceReport | null>(null);
  
  const currentDemo = DEMO_STAGES[activeStage];

  useEffect(() => {
      ProvenanceService.verify().then(setProvenance);
  }, []);

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
                     
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[1.1]">
                        The Cloud is Compromised. <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400">
                            Go Sovereign.
                        </span>
                    </h1>
                    
                    <p className="text-xl text-slate-400 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0">
                        Bastion Enclave replaces trust with cryptographic certainty. We do not store credentials; we compute them deterministically on-the-fly using Argon2id.
                        <br/>
                        <strong className="text-white">Your data physically cannot leave this device.</strong>
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                        <Button size="lg" onClick={() => onNavigate('auth')} className="w-full sm:w-auto h-14 text-lg px-8 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] border border-indigo-400/20">
                            Launch App <ArrowRight size={20} />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex justify-center animate-in fade-in zoom-in-95 duration-1000">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full group-hover:bg-indigo-500/30 transition-all duration-1000"></div>
                        <BrandLogo size={320} animated={true} className="drop-shadow-[0_0_50px_rgba(99,102,241,0.3)] relative z-10 transition-transform duration-700 group-hover:scale-105" />
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
                            <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                <Activity size={16} /> Zero-Knowledge Architecture
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white">Trust No One. Not Even Us.</h2>
                            <p className="text-lg text-slate-400 leading-relaxed">
                                Most password managers claim "Zero Knowledge" while still storing your encrypted blob on their central servers. This is a <strong>policy</strong>, not a guarantee. If their server is subpoenaed or breached, your data is at risk.
                                <br/><br/>
                                <strong className="text-white">Bastion is architecturally different.</strong> It executes entirely in your browser's memory. We provide the code; you provide the execution environment. There is no central database to breach.
                            </p>
                            
                            {/* Interactive Pipeline Triggers */}
                            <div className="flex flex-col gap-4">
                                {Object.entries(DEMO_STAGES).map(([key, stage]) => (
                                    <button 
                                        key={key}
                                        onClick={() => setActiveStage(key as any)}
                                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${activeStage === key ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}
                                    >
                                        <div className={`p-3 rounded-lg ${activeStage === key ? stage.bg.replace('/10', '') + ' text-white' : 'bg-slate-800 text-slate-500'}`}>
                                            {stage.icon}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${activeStage === key ? 'text-white' : 'text-slate-400'}`}>{stage.label}</h4>
                                            <p className="text-xs text-slate-500">{stage.desc}</p>
                                        </div>
                                        <ArrowRight className={`ml-auto ${activeStage === key ? stage.color : 'text-slate-700'} group-hover:translate-x-1 transition-transform`} size={16} />
                                    </button>
                                ))}
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
                                <div className="flex-1 text-center font-mono text-[10px] text-slate-500 uppercase flex items-center justify-center gap-2">
                                    <Lock size={10} /> bastion_runtime_env
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
                                <span className="flex items-center gap-1"><ShieldCheck size={10} /> INTEGRITY_OK</span>
                                <span>{activeStage === 'storage' ? 'ENCRYPTED' : activeStage === 'process' ? 'PROCESSING' : activeStage === 'chaos' ? 'COMPUTING' : 'PLAINTEXT'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. PROBLEM / SOLUTION */}
            <div className="bg-slate-900/30 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16">
                    <div className="space-y-6">
                        <div className="text-amber-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                            <ServerOff size={16} /> The Risk
                        </div>
                        <h2 className="text-3xl font-bold text-white">Centralization is Vulnerability</h2>
                        <p className="text-lg text-slate-400 leading-relaxed">
                            When 50 million passwords are stored on one server, it becomes the ultimate target for nation-state actors. 
                            If that server falls, encryption is the only defense—and history shows that metadata leaks, weak PBKDF2 iterations, and operational errors often render server-side encryption moot.
                        </p>
                    </div>
                    <div className="space-y-6">
                         <div className="text-emerald-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                             <Shield size={16} /> The Solution
                         </div>
                         <h2 className="text-3xl font-bold text-white">Distributed Sovereignty</h2>
                         <p className="text-lg text-slate-400 leading-relaxed">
                            Bastion Enclave distributes the risk. By keeping data local, there is no central database to breach. 
                            Attacking Bastion means attacking millions of individual, hardened devices—a task that is computationally and economically infeasible.
                         </p>
                    </div>
                </div>
            </div>

            {/* 5. COMPETITIVE LANDSCAPE */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-white/10 text-slate-400 text-[10px] font-mono uppercase tracking-widest">
                        <Database size={12} className="text-indigo-400" /> Architectural Audit
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">The Sovereign Advantage</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                        See how the Bastion protocol eliminates entire classes of attack vectors inherent to cloud-based managers.
                    </p>
                </div>

                <div className="overflow-x-auto pb-6">
                    <div className="min-w-[1000px]">
                        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 mb-4 px-4">
                            <div className="font-bold text-sm text-slate-500 uppercase tracking-wider py-4">Category</div>
                            <div className="font-bold text-lg text-white py-2 flex flex-col items-center justify-center bg-indigo-600/20 border border-indigo-500/50 rounded-t-xl">
                                <BrandLogo size={24} className="mb-2" />
                                Bastion
                            </div>
                            <div className="font-bold text-sm text-slate-400 py-4 text-center">LastPass</div>
                            <div className="font-bold text-sm text-slate-400 py-4 text-center">Bitwarden</div>
                            <div className="font-bold text-sm text-slate-400 py-4 text-center">1Password</div>
                            <div className="font-bold text-sm text-slate-400 py-4 text-center">KeePass</div>
                        </div>

                        <div className="space-y-2">
                            {COMPARISON_DATA.map((row, idx) => (
                                <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <div className="font-medium text-slate-300 text-sm">{row.feature}</div>
                                    
                                    {/* Bastion Column */}
                                    <div className="text-center font-bold text-white text-xs bg-indigo-500/10 py-3 rounded-lg border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]">
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
                        <Anchor size={32} className="text-indigo-400 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-3">Anchored Data</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Heavy files in the Locker are <strong>anchored</strong> to the specific device they were encrypted on. They do not sync automatically, preventing massive bandwidth usage or "surprise" downloads on mobile.
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-colors">
                        <Scaling size={32} className="text-violet-400 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-3">Sovereign Intelligence</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Our optimized Neural Auditor executes entirely on your local silicon via WebGPU. We don't ship your data to a cloud brain; we ship the model to your device.
                        </p>
                    </div>
                    <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-colors">
                        <Terminal size={32} className="text-emerald-400 mb-6" />
                        <h3 className="text-xl font-bold text-white mb-3">Portable Identity</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Your Identity (Passwords, Contacts, Notes, and File Keys) travels with your 5KB text backup. You can restore access on any device instantly, while heavy files remain on their origin device.
                        </p>
                    </div>
                </div>
            </div>

            {/* 7. CTA */}
            <div className="relative py-32 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-indigo-900/10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950"></div>
                
                <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                        Take Back Your Digital Sovereignty
                    </h2>
                    <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                        Stop renting your security from the cloud. Own your encryption. Control your keys.
                        Become a founding member of the Bastion Protocol.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button size="lg" className="h-16 px-10 text-xl bg-white text-slate-950 hover:bg-slate-200 hover:text-slate-900 shadow-xl border-0">
                            Support Project
                        </Button>
                        <Button size="lg" variant="secondary" className="h-16 px-10 text-xl" onClick={() => onNavigate('auth')}>
                            Launch Web App
                        </Button>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="border-t border-white/5 bg-slate-950 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 opacity-50">
                        <BrandLogo size={24} />
                        <span className="font-bold text-white">Bastion Enclave</span>
                    </div>
                    <div className="text-sm text-slate-500 font-mono text-center md:text-right">
                        <div>© 2024 BASTION SECURITY • OPEN SOURCE PROTOCOL</div>
                        <div className="text-[10px] mt-1 opacity-60">NO TRACKING. NO ANALYTICS. NO COOKIES.</div>
                        {provenance && (
                            <div className={`text-[10px] mt-2 flex items-center justify-center md:justify-end gap-1 ${provenance.verified ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {provenance.verified ? <CheckCircle size={10} /> : <GitFork size={10} />}
                                {provenance.status === 'OFFICIAL' ? 'OFFICIAL BUILD' : provenance.status === 'DEV' ? 'DEV BUILD' : 'COMMUNITY FORK'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
