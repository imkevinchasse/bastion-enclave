import React, { useState } from 'react';
import { TopNav } from './TopNav';
import { PublicPage } from '../types';
import { Shield, Lock, FileLock2, BrainCircuit, CloudOff, FileKey, Fingerprint, RefreshCw, BookOpen, Terminal, ChevronRight, Zap, Code2, AlertTriangle, ShieldAlert, Wifi, Server, CheckCircle, Copy, Download, History, ShieldCheck, Binary, Cpu, Share2, AlertOctagon } from 'lucide-react';
import { zip, Zippable } from 'fflate';
import { PYTHON_APP_SOURCE } from '../services/pythonDistribution';
import { Button } from './Button';

interface DocsPageProps {
  onNavigate: (page: PublicPage) => void;
}

type DocSection = 'intro' | 'start' | 'chaos' | 'locker' | 'ai' | 'python' | 'breach' | 'recovery' | 'changelog';

export const DocsPage: React.FC<DocsPageProps> = ({ onNavigate }) => {
  const [activeSection, setActiveSection] = useState<DocSection>('intro');

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans text-slate-200">
        <TopNav active="docs" onNavigate={onNavigate} />
        
        <div className="flex-1 max-w-7xl mx-auto w-full pt-24 pb-12 px-4 flex flex-col lg:flex-row gap-8">
            
            {/* SIDEBAR NAVIGATION */}
            <aside className="lg:w-72 shrink-0 space-y-8 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pr-4">
                <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">User Manual</div>
                    <NavButton active={activeSection === 'intro'} onClick={() => setActiveSection('intro')} icon={<BookOpen size={16}/>} label="Introduction" />
                    <NavButton active={activeSection === 'start'} onClick={() => setActiveSection('start')} icon={<Zap size={16}/>} label="Getting Started" />
                    <NavButton active={activeSection === 'recovery'} onClick={() => setActiveSection('recovery')} icon={<FileKey size={16}/>} label="Backup & Recovery" />
                </div>

                <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Core Modules</div>
                    <NavButton active={activeSection === 'chaos'} onClick={() => setActiveSection('chaos')} icon={<RefreshCw size={16}/>} label="Chaos Engine™" />
                    <NavButton active={activeSection === 'locker'} onClick={() => setActiveSection('locker')} icon={<FileLock2 size={16}/>} label="Bastion Locker" />
                    <NavButton active={activeSection === 'ai'} onClick={() => setActiveSection('ai')} icon={<BrainCircuit size={16}/>} label="Neural Auditor" />
                    <NavButton active={activeSection === 'breach'} onClick={() => setActiveSection('breach')} icon={<ShieldAlert size={16}/>} label="Breach Scanner" />
                </div>

                <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Developer</div>
                    <NavButton active={activeSection === 'python'} onClick={() => setActiveSection('python')} icon={<Code2 size={16}/>} label="Python Runtime" />
                    <NavButton active={activeSection === 'changelog'} onClick={() => setActiveSection('changelog')} icon={<History size={16}/>} label="Changelog" />
                </div>

                <div className="p-4 bg-indigo-900/10 rounded-xl border border-indigo-500/20 mt-8">
                    <h4 className="font-bold text-indigo-400 text-sm mb-2">Status: Operational</h4>
                    <p className="text-xs text-indigo-200/80">Version 3.5.0<br/>Protocol: V3.5 (Active)</p>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 bg-slate-900/30 rounded-2xl border border-white/5 p-8 min-h-[80vh] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                {activeSection === 'intro' && <IntroContent />}
                {activeSection === 'start' && <StartContent />}
                {activeSection === 'recovery' && <RecoveryContent />}
                {activeSection === 'chaos' && <ChaosContent />}
                {activeSection === 'locker' && <LockerContent />}
                {activeSection === 'ai' && <AiContent />}
                {activeSection === 'python' && <PythonContent />}
                {activeSection === 'breach' && <BreachContent />}
                {activeSection === 'changelog' && <ChangelogContent />}
                
            </main>
        </div>
    </div>
  );
};

const IntroContent = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <Header icon={<Shield size={32} className="text-indigo-400"/>} title="Welcome to Bastion Enclave" />
        <p className="text-lg text-slate-300 leading-relaxed">
            Bastion Enclave is a <strong>Sovereign Digital Enclave</strong>. It is designed for individuals who do not trust cloud providers with their most sensitive data. 
            Unlike traditional password managers that store your secrets on a central server, Bastion Enclave keeps everything 
            <span className="text-white font-bold"> strictly on your device</span>.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard 
                icon={<CloudOff size={20} className="text-emerald-400"/>}
                title="Offline First"
                desc="The application loads into your browser's memory and cuts the cord. No data leaves your machine."
            />
            <FeatureCard 
                icon={<Lock size={20} className="text-amber-400"/>}
                title="Zero Knowledge"
                desc="We do not know who you are. We do not have your password. We cannot see your data."
            />
        </div>
    </div>
);

const StartContent = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <Header icon={<Fingerprint size={32} className="text-emerald-400"/>} title="Getting Started" />
        <div className="space-y-6">
            <Step number={1} title="Create Your Master Identity">
                <p>When you launch Bastion Enclave, you create a new Vault. You will set a <strong>Master Password</strong>. This password is the only key to your kingdom. Make it strong, and memorize it.</p>
            </Step>
            <Step number={2} title="Download the Rescue Kit">
                <p>Immediately after creating your vault, look for the "Backup Kit" button. This text file contains your encrypted data blob and instructions. <strong>If you clear your browser cache without this file, your data is gone forever.</strong></p>
            </Step>
            <Step number={3} title="Add Credentials">
                <p>Navigate to the "Logins" tab. Instead of saving a password, you enter a Service Name (e.g., "Google") and Username. Bastion Enclave will <em>calculate</em> a password for you.</p>
            </Step>
        </div>
    </div>
);

const RecoveryContent = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <Header icon={<FileKey size={32} className="text-blue-400"/>} title="Backup & Recovery" />
        <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-2xl">
            <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Critical Warning</h3>
            <p className="text-sm text-red-200/80 mb-4">
                There is no "Forgot Password" link. If you lose your Master Password AND your Backup File, your data is mathematically unrecoverable.
            </p>
            <div className="space-y-4">
                <h4 className="font-bold text-white text-sm uppercase tracking-wider">How to backup:</h4>
                <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2">
                    <li>Click the <strong>BACKUP KIT</strong> button in the top navigation bar.</li>
                    <li>Save the text file to a USB drive or print it out.</li>
                    <li className="text-white">This file is a <strong>static snapshot</strong> of your data at the exact moment of download.</li>
                    <li className="text-amber-400 font-bold">Important: The backup file does NOT auto-update. If you add new passwords or notes, you MUST download a new Backup Kit to preserve them.</li>
                </ol>
            </div>
        </div>
    </div>
);

const ChaosContent = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <Header icon={<RefreshCw size={32} className="text-violet-400"/>} title="Chaos Engine™" />
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6">
                <h3 className="font-bold text-white text-lg mb-2">The Concept</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                    Most password managers are just databases. If the database is stolen, hackers can try to crack it. 
                    Bastion Enclave is different. It doesn't store your passwords. It <strong>computes</strong> them.
                    <br/><br/>
                    Think of it like a mathematical recipe: 
                    <br/>
                    <code className="text-indigo-300">Master Key + "Netflix" + "my@email.com" = "Xy7#b9..."</code>
                    <br/><br/>
                    Every time you need the password, we re-run the recipe. This means there is no password database to steal.
                </p>
            </div>
            <div className="p-6 bg-black/20 border-t border-white/5">
                <h3 className="font-bold text-indigo-400 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Terminal size={14}/> Technical Specification (v2.8)
                </h3>
                <ul className="space-y-3 text-sm text-slate-500 font-mono">
                    <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 mt-0.5"/><span>Algo: PBKDF2-HMAC-SHA512</span></li>
                    <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 mt-0.5"/><span>Iterations: 210,000 (Computationally Expensive)</span></li>
                    <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 mt-0.5"/><span>Salt: "BASTION_GENERATOR_V2::" + Context</span></li>
                    <li className="flex gap-3"><ChevronRight size={14} className="shrink-0 mt-0.5"/><span>Sampling: Unbiased Rejection Sampling</span></li>
                </ul>
            </div>
        </div>
        
        <div className="bg-emerald-900/10 border border-emerald-500/20 p-6 rounded-2xl">
            <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><RefreshCw size={18}/> Automatic Algorithm Migration</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
                When Bastion Enclave updates its encryption or generation algorithms (e.g. increasing iteration counts for better security), 
                your vault is <strong>automatically migrated</strong> upon successful unlock. This ensures you always benefit from the latest security standards 
                without manual intervention. You will see a notification in the logs if a legacy format was seamlessly upgraded.
            </p>
        </div>
    </div>
);

const LockerContent = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <Header icon={<FileLock2 size={32} className="text-amber-400"/>} title="Bastion Locker" />
        <div className="space-y-4">
            <p className="text-slate-300 leading-relaxed">
                You can store files (documents, photos, keys) inside Bastion Enclave. When you drop a file into the Locker, 
                we encrypt it instantly. The file is turned into a <code>.bastion</code> file which looks like random noise to anyone else.
            </p>
            <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex gap-2"><CheckCircle size={16} className="text-emerald-500"/> AES-256-GCM Encryption</li>
                <li className="flex gap-2"><CheckCircle size={16} className="text-emerald-500"/> Unique 256-bit Key Per File</li>
                <li className="flex gap-2"><CheckCircle size={16} className="text-emerald-500"/> Authenticated Integrity Checks</li>
            </ul>
        </div>
    </div>
);

const AiContent = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <Header icon={<BrainCircuit size={32} className="text-pink-400"/>} title="Neural Auditor" />
        <div className="space-y-4">
            <p className="text-slate-300">
                Bastion Enclave includes a <strong>local Artificial Intelligence</strong> (TinyLlama 1.1B) that runs directly inside your web browser using WebGPU technology.
            </p>
            <p className="text-slate-400 text-sm">
                Normally, using AI requires sending your data to a server (like OpenAI). Bastion Enclave downloads the AI brain to your computer first. 
                When you ask it to analyze a password, the math happens on your graphics card. Your password is never sent to the cloud.
            </p>
        </div>
    </div>
);

const BreachContent = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <Header icon={<ShieldAlert size={32} className="text-red-400"/>} title="Vault Breach Scanner" />
        
        <div className="p-6 bg-slate-800/50 rounded-xl border border-white/5">
            <h3 className="font-bold text-white mb-4">Active Breach Defense</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Available exclusively within your secured vault, the Breach Scanner allows you to audit stored credentials against known data breaches (powered by HIBP). 
                If a compromise is detected, the affected login will be marked with a <span className="text-red-400 font-bold">RED ALERT</span> status inside your vault.
                This status persists until you rotate the password or update the login version.
            </p>
            
            <h3 className="font-bold text-white mb-4 mt-8">k-Anonymity Protocol</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-4 rounded-lg border border-white/5">
                    <div className="text-indigo-400 font-bold text-xs uppercase mb-2">Step 1</div>
                    <div className="text-white text-sm mb-1">Local Hashing</div>
                    <div className="text-slate-500 text-xs">Your browser computes the SHA-1 hash of your password.</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg border border-white/5">
                    <div className="text-indigo-400 font-bold text-xs uppercase mb-2">Step 2</div>
                    <div className="text-white text-sm mb-1">Prefix Query</div>
                    <div className="text-slate-500 text-xs">We send only the first 5 characters of the hash to the API.</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg border border-white/5">
                    <div className="text-indigo-400 font-bold text-xs uppercase mb-2">Step 3</div>
                    <div className="text-white text-sm mb-1">Local Match</div>
                    <div className="text-slate-500 text-xs">The API returns hundreds of partial matches. Your browser finds the needle in the haystack locally.</div>
                </div>
            </div>
        </div>

        <div className="p-4 border-l-2 border-emerald-500 bg-emerald-500/5">
            <h4 className="font-bold text-emerald-400 text-sm mb-1">Privacy Guarantee</h4>
            <p className="text-xs text-emerald-200/80">
                The server (HaveIBeenPwned) sees only the first 5 characters of a hash. This corresponds to approximately 50,000 different possible passwords. They cannot know which one is yours.
            </p>
        </div>
        
        <div className="p-4 border-l-2 border-amber-500 bg-amber-500/5">
            <h4 className="font-bold text-amber-400 text-sm mb-1">Why no Email Search?</h4>
            <p className="text-xs text-amber-200/80">
                Searching for breaches via Email Address requires a non-anonymous API lookup that usually requires an API Key or strict rate limiting. 
                To maintain our strict "Zero Knowledge" and "No Backend" policy, we do not support email lookups inside the app. 
                We recommend manually checking your email on the official <a href="https://haveibeenpwned.com" target="_blank" rel="noreferrer" className="underline">HIBP website</a>.
            </p>
        </div>
    </div>
);

const PythonContent = () => {
    const downloadPythonApp = () => {
        const zipData: Zippable = {};
        for (const [path, content] of Object.entries(PYTHON_APP_SOURCE)) {
            zipData[path] = [new TextEncoder().encode(content), { level: 9 }];
        }
        
        zip(zipData, (err, data) => {
            if (err) {
                console.error("Failed to zip python app", err);
                return;
            }
            // TS Fix for Blob: cast Uint8Array to any to bypass TS overload issue
            const blob = new Blob([data as any], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "bastion-installer-scripts.zip";
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start">
                <Header icon={<Code2 size={32} className="text-yellow-400"/>} title="Python Runtime" />
                <Button onClick={downloadPythonApp} variant="secondary" className="text-xs">
                    <Download size={14} /> Download Installer Script
                </Button>
            </div>
            
            <div className="space-y-4">
                <p className="text-slate-300">
                    Deploy the standalone Bastion Enclave Runtime to any macOS or Linux environment with a single command. 
                    This creates a local, offline-capable environment in <code>~/.bastion</code> with a global <code>bastion</code> executable.
                </p>

                <div className="bg-black rounded-xl border border-white/10 overflow-hidden font-mono text-sm shadow-xl">
                    <div className="bg-slate-900 px-4 py-2 border-b border-white/5 flex items-center gap-2 text-slate-500">
                        <Terminal size={14} /> bash
                    </div>
                    <div className="p-6 relative group">
                        <div className="text-emerald-400 break-all pr-8 leading-relaxed">
                            curl -fsSL https://raw.githubusercontent.com/imkevinchasse/bastion-enclave/main/install.sh | bash
                        </div>
                        <div className="absolute top-6 right-6">
                            <CopyButton text="curl -fsSL https://raw.githubusercontent.com/imkevinchasse/bastion-enclave/main/install.sh | bash" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5">
                        <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-2"><Wifi size={14}/> Offline Capable</h4>
                        <p className="text-xs text-slate-500">Core functions work without internet. Update requires connection.</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5">
                        <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-2"><Cpu size={14}/> Automatic Alias</h4>
                        <p className="text-xs text-slate-500">Adds 'bastion' to your path. Handles chmod +x automatically.</p>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-6 mt-6">
                    <h4 className="font-bold text-white text-sm mb-4">Command Reference</h4>
                    <ul className="space-y-3 font-mono text-xs">
                        <li className="flex items-center justify-between p-3 bg-slate-900 rounded border border-white/5">
                            <span className="text-emerald-400">bastion</span>
                            <span className="text-slate-500"># Launch Interactive Shell</span>
                        </li>
                        <li className="flex items-center justify-between p-3 bg-slate-900 rounded border border-white/5">
                            <span className="text-emerald-400">bastion update</span>
                            <span className="text-slate-500"># Self-Update via Git</span>
                        </li>
                        <li className="flex items-center justify-between p-3 bg-slate-900 rounded border border-white/5">
                            <span className="text-emerald-400">bastion --version</span>
                            <span className="text-slate-500"># Check Protocol Version</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

const ChangelogContent = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <Header icon={<History size={32} className="text-slate-400"/>} title="Protocol Changelog" />
        
        <div className="space-y-8">
            {/* V3.5 */}
            <div className="relative border-l-2 border-indigo-500 pl-6 pb-2">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-slate-950"></div>
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-3">
                    Bastion Protocol V3.5 <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">STABLE</span>
                </h3>
                <div className="text-xs text-slate-500 font-mono mb-4">Epoch: 2026-01-30 • Scope: Serialization & Format Discipline</div>

                <div className="space-y-6 text-sm text-slate-400">
                    
                    {/* Header Stats */}
                    <div className="flex gap-4 text-xs font-mono border-b border-white/5 pb-4 mb-4">
                        <span className="text-emerald-400">STATUS: STABLE</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-indigo-400">SCOPE: SERIALIZATION</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">CRYPTO: UNCHANGED</span>
                    </div>

                    {/* Feature 1 */}
                    <div className="space-y-2">
                        <h4 className="text-white font-bold flex items-center gap-2"><Binary size={14} className="text-blue-400"/> Canonical Serialization (New)</h4>
                        <ul className="list-disc list-outside ml-4 space-y-1 text-slate-400 marker:text-slate-600">
                            <li>Vault plaintext is now serialized using a strict, deterministic canonical format prior to encryption.</li>
                            <li>Field ordering is fixed and versioned.</li>
                            <li>Required metadata is always present, even when empty.</li>
                            <li>Serialization output is byte-for-byte reproducible.</li>
                        </ul>
                        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
                            <strong className="text-blue-300 block mb-1">Impact:</strong>
                            This eliminates ambiguity, prevents silent incompatibilities, and guarantees consistent vault structure across platforms and releases.
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="space-y-2">
                        <h4 className="text-white font-bold flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-400"/> Deterministic Payload Padding (New)</h4>
                        <ul className="list-disc list-outside ml-4 space-y-1 text-slate-400 marker:text-slate-600">
                            <li>All encrypted vault payloads are now padded deterministically to 64-byte alignment.</li>
                            <li>Padding is non-cryptographic and does not affect security assumptions.</li>
                            <li>Padding size is derived from vault structure and protocol version.</li>
                            <li>Padding is ignored on read and enforced on write.</li>
                        </ul>
                        <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs">
                            <strong className="text-emerald-300 block mb-1">Impact:</strong>
                            This removes plaintext length signaling, reduces traffic analysis surface area, and produces a stable, recognizable vault size profile.
                        </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="space-y-2">
                        <h4 className="text-white font-bold flex items-center gap-2"><AlertTriangle size={14} className="text-amber-400"/> Canonical Compatibility Enforcement (New)</h4>
                        <ul className="list-disc list-outside ml-4 space-y-1 text-slate-400 marker:text-slate-600">
                            <li>Bastion clients now enforce strict adherence to the canonical format.</li>
                            <li>Cryptographically valid data that does not conform to the Bastion serialization contract is rejected.</li>
                            <li>This applies regardless of encryption correctness.</li>
                        </ul>
                        <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs">
                            <strong className="text-amber-300 block mb-1">Impact:</strong>
                            Users are protected from unofficial or incompatible implementations that may encrypt correctly but serialize incorrectly, leading to silent data loss or long-term incompatibility.
                        </div>
                    </div>

                    {/* Backward Comp */}
                    <div className="space-y-2 pt-4 border-t border-white/5">
                        <h4 className="text-white font-bold">Backward Compatibility</h4>
                        <ul className="list-disc list-outside ml-4 space-y-1 text-slate-400 marker:text-slate-600">
                            <li>Vaults created under Protocol V1–V3 are fully supported.</li>
                            <li>Legacy vaults are upgraded automatically on open.</li>
                            <li>Users are notified of the upgrade and its implications.</li>
                        </ul>
                    </div>

                    {/* Invariants */}
                    <div className="space-y-2">
                        <h4 className="text-white font-bold">What Did Not Change</h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-slate-500">
                            <li className="flex items-center gap-2"><CheckCircle size={12} className="text-slate-600"/> Key derivation (Argon2id)</li>
                            <li className="flex items-center gap-2"><CheckCircle size={12} className="text-slate-600"/> Encryption (AES-256-GCM)</li>
                            <li className="flex items-center gap-2"><CheckCircle size={12} className="text-slate-600"/> Authentication (HMAC-SHA512)</li>
                            <li className="flex items-center gap-2"><CheckCircle size={12} className="text-slate-600"/> Entropy generation</li>
                            <li className="flex items-center gap-2"><CheckCircle size={12} className="text-slate-600"/> Trust model (Client-side)</li>
                            <li className="flex items-center gap-2"><CheckCircle size={12} className="text-slate-600"/> Zero knowledge</li>
                        </ul>
                        <p className="text-xs text-slate-600 italic mt-2">No cryptographic primitives were modified in this release.</p>
                    </div>

                </div>
            </div>

            {/* V3.0 */}
            <div className="relative border-l-2 border-slate-700 pl-6 pb-2">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-950"></div>
                <h3 className="text-xl font-bold text-slate-400 mb-1">Version 3.0.0</h3>
                <div className="text-xs text-slate-500 font-mono mb-4">Sovereign-V3 • Header: 0x03 • Epoch: 2026-01-01</div>
                
                <ul className="space-y-3">
                    <ChangeItem type="security">
                        <strong>Argon2id Upgrade:</strong> Replaced PBKDF2 with memory-hard Argon2id (64MB, 3 passes) for vault encryption.
                    </ChangeItem>
                    <ChangeItem type="feature">
                        <strong>Prime Field Sharding:</strong> Moved from GF(2^8) to GF(P-256) for Shamir Secret Sharing, enabling secure splitting of arbitrary length secrets.
                    </ChangeItem>
                </ul>
            </div>

            {/* V2.0 */}
            <div className="relative border-l-2 border-slate-700 pl-6 pb-2 opacity-60 hover:opacity-100 transition-opacity">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-950"></div>
                <h3 className="text-xl font-bold text-slate-400 mb-1">Version 2.0.0</h3>
                <div className="text-xs text-slate-500 font-mono mb-4">Sovereign-V2 • Header: 0x02 • Epoch: 2025-12-20</div>
                
                <ul className="space-y-3">
                    <ChangeItem type="feature">
                        <strong>Chaos Engine V2:</strong> Introduced HMAC-SHA512 and Rejection Sampling for unbiased password generation.
                    </ChangeItem>
                </ul>
            </div>
        </div>
    </div>
);

// --- HELPER COMPONENTS ---

const NavButton = ({active, onClick, icon, label}: {active: boolean, onClick: () => void, icon: React.ReactNode, label: string}) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 w-full rounded-lg text-sm font-medium transition-all ${active ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}>
        {icon} {label}
    </button>
);

const Header = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
    <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="p-3 bg-slate-900 rounded-xl border border-white/10">
            {icon}
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight">{title}</h2>
    </div>
);

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
        <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-800 rounded-lg">
                {icon}
            </div>
            <h3 className="font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
);

const Step = ({ number, title, children }: { number: number, title: string, children?: React.ReactNode }) => (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
                {number}
            </div>
            <div className="w-px h-full bg-indigo-500/20 my-2"></div>
        </div>
        <div className="pb-8">
            <h4 className="text-white font-bold mb-2 text-lg">{title}</h4>
            <div className="text-slate-400 text-sm leading-relaxed space-y-2">
                {children}
            </div>
        </div>
    </div>
);

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy}
            className="p-1.5 text-slate-500 hover:text-white transition-colors ml-auto bg-slate-900 rounded-lg border border-white/10"
            title="Copy to clipboard"
        >
            {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
    );
};

const ChangeItem = ({ type, children }: { type: 'feature' | 'security' | 'fix', children?: React.ReactNode }) => {
    const color = type === 'feature' ? 'text-blue-400' : type === 'security' ? 'text-emerald-400' : 'text-slate-400';
    const Icon = type === 'feature' ? Zap : type === 'security' ? ShieldCheck : Code2;
    
    return (
        <li className="text-sm text-slate-400 leading-relaxed flex items-start gap-3">
            <Icon size={16} className={`${color} mt-1 shrink-0`} />
            <div>{children}</div>
        </li>
    );
}