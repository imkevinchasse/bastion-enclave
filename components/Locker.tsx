
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { ChaosLock, ResonanceEngine } from '../services/cryptoService';
import { CompressionService } from '../services/compressionService';
import { BlobStorage } from '../services/blobStorage';
import { Resonance } from '../types';
import { FileLock2, Upload, Download, Loader2, ShieldCheck, AlertTriangle, File as FileIcon, Trash2, Key, Fingerprint, Search, Ghost, X, CheckCircle, Archive, Link, HardDrive, Play, Database } from 'lucide-react';

const FileCheckIcon = ({size, className}: any) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="m9 15 2 2 4-4" />
    </svg>
);

interface LockerProps {
  entries: Resonance[];
  onLock: (entry: Resonance) => void;
  onDelete: (id: string) => void;
}

export const Locker: React.FC<LockerProps> = ({ entries, onLock, onDelete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'compressing' | 'binding' | 'resolving' | 'storing' | 'complete'>('idle');
  const [successFile, setSuccessFile] = useState<{name: string, url: string} | null>(null);
  const [search, setSearch] = useState('');
  const [persistFile, setPersistFile] = useState(true); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ghost Detection State
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- EFFECT: Check Local Storage Availability ---
  useEffect(() => {
      const checkAvailability = async () => {
          const statusMap: Record<string, boolean> = {};
          // Only check entries that claim to be embedded to save IO
          for (const entry of entries) {
              if (entry.embedded) {
                  const exists = await BlobStorage.exists(entry.id);
                  statusMap[entry.id] = exists;
              } else {
                  statusMap[entry.id] = false;
              }
          }
          setAvailability(statusMap);
      };
      
      checkAvailability();
  }, [entries]);

  const filteredEntries = entries
    .filter(e => e && typeof e.label === 'string' && e.label.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleReset = () => {
    setSuccessFile(null);
    setError('');
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFileOrFiles = async (fileList: FileList) => {
    setIsProcessing(true);
    setError('');
    setSuccessFile(null);
    
    try {
        let fileToProcess: File;

        // 1. Compression Handling
        if (fileList.length > 1) {
            setStatus('compressing');
            const files = Array.from(fileList);
            const { blob, name } = await CompressionService.compressFiles(files);
            // TS Fix: Cast BlobPart[] to any to avoid TS2322
            fileToProcess = new File([blob as any], name, { type: 'application/zip' });
        } else {
            fileToProcess = fileList[0];
        }

        // 2. Encryption/Decryption Handing
        const buffer = await fileToProcess.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        let isBastionFile = false;
        try {
            const header = bytes.slice(0, 8);
            const decoder = new TextDecoder();
            if (decoder.decode(header) === "BASTION1") {
                isBastionFile = true;
            }
        } catch(e) {}

        if (isBastionFile) {
            await unlockFromBytes(bytes);
        } else {
            setStatus('binding');
            
            const { artifact, resonance } = await ResonanceEngine.bind(
                bytes, 
                fileToProcess.name, 
                fileToProcess.type || 'application/octet-stream'
            );

            if (persistFile) {
                setStatus('storing');
                await BlobStorage.save(resonance.id, artifact);
                resonance.embedded = true; 
                // Update local availability state immediately
                setAvailability(prev => ({...prev, [resonance.id]: true}));
            }

            onLock(resonance);

            const blob = new Blob([artifact as any], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            setSuccessFile({ name: `${fileToProcess.name}.bastion`, url });
            setStatus('complete');
        }

    } catch (e: any) {
        console.error(e);
        setError(e.message || "Operation failed");
        setStatus('idle');
    } finally {
        setIsProcessing(false);
    }
  };

  const unlockFromBytes = async (bytes: Uint8Array) => {
      setStatus('resolving');
      const fileId = ChaosLock.getFileIdFromBlob(bytes);
      const resonance = entries.find(e => e.id === fileId);
      
      if (!resonance) {
          throw new Error("Resonance Broken: The key for this file is not in your current vault.");
      }

      const decryptedBytes = await ResonanceEngine.resolve(bytes, resonance);
      
      const currentHash = await ChaosLock.computeHash(decryptedBytes);
      if (currentHash !== resonance.hash) {
          console.warn("Integrity check mismatch", currentHash, resonance.hash);
      }

      const blob = new Blob([decryptedBytes as any], { type: resonance.mime });
      const url = URL.createObjectURL(blob);
      setSuccessFile({ name: resonance.label, url });
      setStatus('complete');
  }

  const handleUnlockStored = async (entry: Resonance) => {
      setIsProcessing(true);
      setError('');
      setSuccessFile(null);
      setStatus('resolving');

      try {
          const artifact = await BlobStorage.load(entry.id);
          if (!artifact) {
              setAvailability(prev => ({...prev, [entry.id]: false}));
              throw new Error("GHOST_FILE: Payload missing from this device.");
          }
          await unlockFromBytes(artifact);
      } catch (e: any) {
          setError(e.message);
          setStatus('idle');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        processFileOrFiles(e.target.files);
    }
  };

  const handleDeleteRequest = async (id: string) => {
      if (confirmDeleteId === id) {
          await BlobStorage.delete(id);
          onDelete(id);
          setConfirmDeleteId(null);
      } else {
          setConfirmDeleteId(id);
          setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000);
      }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* LEFT: Phantom Registry */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
             <div className="flex justify-between items-end mb-2">
                 <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Ghost size={24} className="text-indigo-400" /> Resonance Registry
                    </h2>
                    <p className="text-slate-400 text-xs">Active Cryptographic Bindings</p>
                 </div>
                 <div className="text-[10px] font-mono text-slate-500 uppercase">{entries.length} Keys Active</div>
             </div>

             <div className="relative">
                <input 
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all outline-none"
                    placeholder="Search bindings..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar bg-slate-900/20 rounded-xl border border-white/5 p-2">
                {filteredEntries.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <Fingerprint className="mx-auto text-slate-600 mb-2" size={32} />
                        <p className="text-slate-500 text-xs">No active resonances.</p>
                    </div>
                ) : (
                    filteredEntries.map(entry => {
                        const isAvailable = availability[entry.id];
                        const isGhost = entry.embedded && !isAvailable;

                        return (
                            <div 
                                key={entry.id} 
                                className={`p-3 rounded-xl flex justify-between items-center group transition-all relative overflow-hidden ${confirmDeleteId === entry.id ? 'bg-red-900/20 border border-red-500/50' : isGhost ? 'bg-slate-900/40 border border-slate-800 opacity-70' : 'bg-slate-900/80 border border-white/5 hover:border-indigo-500/30'}`}
                            >
                                <div className="min-w-0 z-10 flex-1">
                                    <div className={`font-bold text-sm truncate flex items-center gap-2 ${confirmDeleteId === entry.id ? 'text-red-300' : isGhost ? 'text-slate-500' : 'text-slate-200'}`}>
                                        {entry.label.endsWith('.zip') ? <Archive size={12} className="text-amber-500 shrink-0"/> : <Link size={12} className={confirmDeleteId === entry.id ? 'text-red-500' : 'text-emerald-500 shrink-0'} />}
                                        {entry.label}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex gap-2 items-center">
                                        <span>{formatSize(entry.size)}</span>
                                        <span>•</span>
                                        {isAvailable ? (
                                            <span className="text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-1 rounded"><HardDrive size={8}/> LOCAL</span>
                                        ) : isGhost ? (
                                            <span className="text-slate-500 flex items-center gap-1 border border-slate-700 px-1 rounded" title="File payload is on another device. Key is available."><Ghost size={8}/> GHOST</span>
                                        ) : (
                                            <span className="text-amber-500 flex items-center gap-1"><Key size={8}/> KEY ONLY</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 z-10">
                                    {isAvailable && (
                                        <button 
                                            onClick={() => handleUnlockStored(entry)}
                                            className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                            title="Decrypt from Local Storage"
                                        >
                                            <Play size={14} fill="currentColor" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDeleteRequest(entry.id)}
                                        className={`p-2 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${confirmDeleteId === entry.id ? 'bg-red-500 text-white w-20 justify-center shadow-lg' : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100'}`}
                                        title={isGhost ? "Clean Up Ghost Key" : "Sever Resonance"}
                                    >
                                        {confirmDeleteId === entry.id ? (
                                            <>CONFIRM</>
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                    </button>
                                </div>

                                {confirmDeleteId === entry.id && (
                                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.05)_10px,rgba(220,38,38,0.05)_20px)] pointer-events-none" />
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>

        {/* RIGHT: Processing Core */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-2xl flex-1 relative overflow-hidden flex flex-col p-8">
                
                {/* Status Overlay */}
                <div className="flex justify-between items-start mb-8">
                     <div>
                        <h3 className="text-xl font-bold text-white mb-1">Cryptographic Core</h3>
                        <p className="text-sm text-slate-400">Drag & Drop assets to Bind or Resolve. <span className="text-amber-400/80">Keys are unique per file.</span></p>
                     </div>
                     {status !== 'idle' && (
                         <div className={`bg-slate-950 border border-white/10 px-3 py-1 rounded-full text-[10px] font-mono uppercase animate-pulse flex items-center gap-2 ${status === 'compressing' || status === 'storing' ? 'text-amber-400' : 'text-indigo-400'}`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${status === 'compressing' || status === 'storing' ? 'bg-amber-500' : 'bg-indigo-500'}`} /> {status}
                         </div>
                     )}
                </div>

                {successFile ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                            <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-emerald-500/50 flex items-center justify-center relative z-10 shadow-2xl">
                                <FileCheckIcon size={48} className="text-emerald-400" />
                            </div>
                        </div>
                        
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">{status === 'complete' ? 'Operation Successful' : 'Ready'}</h2>
                            <p className="text-slate-400 text-sm font-mono">{successFile.name}</p>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="secondary" onClick={handleReset}>Process Another</Button>
                            <a href={successFile.url} download={successFile.name}>
                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20">
                                    <Download size={18} /> Download
                                </Button>
                            </a>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-300">
                         <div className="w-24 h-24 rounded-2xl bg-red-900/10 border border-red-500/30 flex items-center justify-center text-red-400">
                             <AlertTriangle size={48} />
                         </div>
                         <div className="text-center max-w-md">
                             <h2 className="text-xl font-bold text-white mb-2">Process Failed</h2>
                             <p className="text-red-400 text-sm">{error}</p>
                             {error.includes("GHOST") && (
                                 <p className="text-xs text-slate-500 mt-2">
                                     This file exists on the device where it was encrypted. 
                                     The cloud vault only syncs the Key, not the File Payload.
                                 </p>
                             )}
                         </div>
                         <Button variant="secondary" onClick={handleReset}>Reset Core</Button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <div className="relative group w-full max-w-md">
                            <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-lg group-hover:bg-indigo-500/10 transition-all"></div>
                            <div className="border-2 border-dashed border-slate-700/50 rounded-xl flex flex-col items-center justify-center gap-4 p-12 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5 transition-all relative z-10">
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    multiple
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                    {isProcessing ? (
                                        <Loader2 className="animate-spin text-indigo-400" size={32} />
                                    ) : (
                                        <Upload className="text-slate-400 group-hover:text-indigo-400" size={32} />
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-300 group-hover:text-white transition-colors">Drop file(s) here</p>
                                    <p className="text-xs text-slate-500 mt-1">Files are encrypted instantly via WebCrypto</p>
                                </div>
                            </div>
                        </div>

                        {/* Persistence Toggle */}
                        <div 
                            className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-slate-950/50 cursor-pointer hover:border-white/10"
                            onClick={() => setPersistFile(!persistFile)}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${persistFile ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 bg-slate-900'}`}>
                                {persistFile && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-bold text-white">Save to Vault (This Device Only)</div>
                                <div className="text-[10px] text-slate-500">Encrypted blob stays in this browser's storage.</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
