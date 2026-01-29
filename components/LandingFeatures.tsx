
import React, { useState } from 'react';
import { Archive, Network, Cpu, Atom, Activity, Lock, FileCode2, Zap, X, Terminal, ShieldCheck, Database, FileKey, Share2 } from 'lucide-react';

// --- DATA STRUCTURES ---

const FEATURES = [
  {
    id: 'chaos',
    icon: <Atom size={28} className="text-indigo-400" />,
    title: "Chaos Engine™",
    short: "Generate high-entropy, deterministic passwords instantly.",
    specs: ["PBKDF2-HMAC", "REJECTION SAMPLING", "STATELESS"]
  },
  {
    id: 'locker',
    icon: <Archive size={28} className="text-amber-400" />,
    title: "Bastion Locker",
    short: "Encrypt and persistently store files in your browser.",
    specs: ["AES-256-GCM", "INDEXEDDB STORAGE", "ZERO-KNOWLEDGE"]
  },
  {
    id: 'rolodex',
    icon: <Network size={28} className="text-emerald-400" />,
    title: "Shadow Rolodex",
    short: "Securely manage sensitive contacts in an encrypted graph.",
    specs: ["GRAPH DB", "IN-MEMORY", "OPAQUE BLOB"]
  },
  {
    id: 'neural',
    icon: <Cpu size={28} className="text-violet-400" />,
    title: "Neural Auditor",
    short: "Run AI security checks offline on your own hardware.",
    specs: ["TINYLLAMA 1.1B", "WEBGPU", "AIR-GAPPED LOGIC"]
  }
];

const GLOSSARY: Record<string, { title: string, body: string }> = {
    "PBKDF2-HMAC": {
        title: "Password-Based Key Derivation Function 2",
        body: "A cryptographic standard used to prevent brute-force attacks. We run 210,000 iterations of SHA-256/512 hashing on your master password. This makes the derivation computationally expensive, slowing down attackers."
    },
    "REJECTION SAMPLING": {
        title: "Unbiased Rejection Sampling",
        body: "Standard modulo arithmetic introduces bias when generating passwords. We implement Rejection Sampling to discard any random bytes that would cause uneven distribution, ensuring every character in your password has a mathematically equal probability of selection."
    },
    "STATELESS": {
        title: "Stateless Architecture",
        body: "Bastion does not maintain a database connection. Your vault exists only in your device's RAM while open. When you close the tab, the data evaporates completely, leaving only the encrypted blob on your disk."
    },
    "AES-256-GCM": {
        title: "Advanced Encryption Standard (GCM)",
        body: "The gold standard for symmetric encryption. We use Galois/Counter Mode (GCM) with unique random 12-byte IVs for every operation, providing both confidentiality (they can't read it) and integrity (they can't modify it without us knowing)."
    },
    "INDEXEDDB STORAGE": {
        title: "Encrypted Object Store",
        body: "Large files are encrypted and stored in the browser's IndexedDB database. This allows you to store gigabytes of encrypted data securely on your device, persisting across sessions without bloating the main vault file."
    },
    "ZERO-KNOWLEDGE": {
        title: "Zero-Knowledge Architecture",
        body: "A security model where the service provider (us) knows nothing about your data. We do not have your password, your keys, or your unencrypted files. We cannot recover your account if you lose your password."
    },
    "GRAPH DB": {
        title: "Graph Database Structure",
        body: "Instead of a simple list, contacts are stored as nodes with edges representing relationships. This allows for complex querying while keeping the data structure flexible and encrypted as a single blob."
    },
    "IN-MEMORY": {
        title: "In-Memory Execution",
        body: "Decrypted data never touches your hard drive. It lives in the Protected RAM of the browser process. If the computer is powered off, the data is instantly lost, preventing cold-boot attacks."
    },
    "OPAQUE BLOB": {
        title: "Opaque Binary Large Object",
        body: "To the outside world (and the filesystem), your vault looks like a random string of nonsense characters. There is no file structure, no metadata, and no headers visible without the decryption key."
    },
    "TINYLLAMA 1.1B": {
        title: "TinyLlama 1.1B Model",
        body: "A compact Large Language Model with 1.1 billion parameters. We optimized it to run entirely within the web browser using WebAssembly and WebGPU, allowing for AI analysis without sending data to a server."
    },
    "WEBGPU": {
        title: "Web Graphics Processing Unit",
        body: "A modern web API that gives the browser direct access to your computer's graphics card. This allows Bastion to perform billions of parallel calculations for AI inference and encryption acceleration locally."
    },
    "AIR-GAPPED LOGIC": {
        title: "Offline-Capable Logic",
        body: "While Bastion is delivered via the web (HTTPS), the application logic is designed to function without further network requests. You can disconnect your internet after loading the page and the vault will function perfectly."
    }
};

const DEEP_DIVES: Record<string, { title: string, subtitle: string, desc: string, technical: string[] }> = {
    "chaos": {
        title: "Chaos Engine™",
        subtitle: "Deterministic Entropy Generator",
        desc: "The Chaos Engine removes the need to store passwords entirely. Instead of retrieving a password from a database, it mathematically computes it on-the-fly using your Master Key and the Service Name as inputs. Because the result is deterministic, you get the same password every time without ever saving it.",
        technical: ["HMAC-SHA512 Flux", "Domain Separated Salts", "Context-Aware Salting"]
    },
    "locker": {
        title: "Bastion Locker",
        subtitle: "Client-Side Encrypted File System",
        desc: "Traditional cloud storage uploads your file, then encrypts it. Bastion Locker encrypts the file inside your browser first. The encrypted payload is then stored in the browser's persistent database. We use a unique 256-bit key for every single file, wrapped by your master key.",
        technical: ["Stream Cipher Chaining", "Split-Horizon Storage", "Integrity Hashing"]
    },
    "rolodex": {
        title: "Shadow Rolodex",
        subtitle: "Private Identity Graph",
        desc: "Your contacts and connections are often more sensitive than your passwords. Shadow Rolodex encrypts this social graph into a single monolithic block. Accessing one contact does not expose the others, thanks to memory partitioning.",
        technical: ["Serialized JSON Graph", "Node-Level Encryption", "Ephemeral Search Index"]
    },
    "neural": {
        title: "Neural Auditor",
        subtitle: "Local Large Language Model",
        desc: "We ported a neural network to run inside Chrome. This AI audits your passwords for semantic weaknesses (like using pet names or dates) that standard entropy checkers miss. It thinks like a hacker, but works for you.",
        technical: ["ONNX Runtime / TVM", "4-bit Quantization", "Zero Data Egress"]
    }
};

export const LandingFeatures: React.FC = () => {
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const glossaryItem = selectedSpec ? GLOSSARY[selectedSpec] : null;
  const featureItem = selectedFeature ? DEEP_DIVES[selectedFeature] : null;

  return (
    <div className="space-y-16">
      
      {/* Introduction Block */}
      <div className="relative pl-8 border-l-2 border-indigo-500/30">
         <h2 className="text-2xl font-bold text-white mb-4">Core Value Proposition</h2>
         <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
            Bastion is built on a modular, offline-first architecture. We prioritize user sovereignty, ensuring you maintain complete control and ownership of your encrypted data at all times.
         </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {FEATURES.map((feature) => (
            <div 
                key={feature.id}
                onClick={() => setSelectedFeature(feature.id)}
                className="group relative bg-slate-900/40 border border-white/5 rounded-2xl p-8 hover:bg-slate-900/60 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer"
            >
                {/* Hover Glow */}
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
                
                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-slate-950 border border-white/10 rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                            {feature.icon}
                        </div>
                        <Activity size={20} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-200 mb-3 group-hover:text-white flex items-center gap-2">
                        {feature.title}
                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-500 group-hover:text-indigo-400">INFO</span>
                    </h3>
                    <p className="text-lg text-slate-400 leading-relaxed mb-6 flex-1">
                        {feature.short}
                    </p>

                    {/* Tech Specs */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                        {feature.specs.map((spec, sIdx) => (
                            <button 
                                key={sIdx} 
                                onClick={(e) => { e.stopPropagation(); setSelectedSpec(spec); }}
                                className="text-[10px] uppercase font-bold px-2.5 py-1.5 rounded bg-slate-950/50 border border-white/5 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            >
                                {spec}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* GLOSSARY MODAL */}
      {glossaryItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedSpec(null)}></div>
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-8 max-w-lg w-full relative z-10 shadow-2xl shadow-indigo-500/20 animate-in zoom-in-95 duration-200">
                  <button onClick={() => setSelectedSpec(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                      <X size={20} />
                  </button>
                  <div className="flex items-center gap-3 mb-4 text-indigo-400">
                      <Terminal size={24} />
                      <span className="text-xs font-bold uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">{selectedSpec}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{glossaryItem.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{glossaryItem.body}</p>
              </div>
          </div>
      )}

      {/* FEATURE DEEP DIVE MODAL */}
      {featureItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedFeature(null)}></div>
              <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 flex flex-col">
                  {/* Header Graphic */}
                  <div className="h-32 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 relative border-b border-white/5">
                        <div className="absolute inset-0 bg-grid opacity-30"></div>
                        <div className="absolute bottom-0 left-0 p-8">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-500/40">
                                    <Zap size={20} />
                                </div>
                                <h2 className="text-3xl font-black text-white tracking-tight">{featureItem.title}</h2>
                             </div>
                             <p className="text-indigo-400 font-mono text-xs uppercase tracking-widest">{featureItem.subtitle}</p>
                        </div>
                        <button onClick={() => setSelectedFeature(null)} className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-white/10 rounded-full text-white transition-colors backdrop-blur">
                            <X size={20} />
                        </button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                      <div>
                          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
                              <FileCode2 size={16} /> System Logic
                          </h4>
                          <p className="text-lg text-slate-300 leading-relaxed">
                              {featureItem.desc}
                          </p>
                      </div>

                      <div className="bg-black/30 rounded-xl p-6 border border-white/5">
                          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
                              <Database size={16} /> Technical Stack
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {featureItem.technical.map((tech, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm text-emerald-400 font-mono bg-emerald-900/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                                      <ShieldCheck size={14} /> {tech}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
