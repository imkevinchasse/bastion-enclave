
import React from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, Layers, Download, ArrowRight, X } from 'lucide-react';
import { Button } from './Button';

interface MigrationModalProps {
  onDismiss: () => void;
  onDownloadBackup: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ onDismiss, onDownloadBackup }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => {}} />
      
      <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl w-full max-w-2xl relative z-10 shadow-2xl shadow-indigo-500/20 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-indigo-900/20 px-8 py-6 border-b border-indigo-500/20 flex items-start gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/40 text-indigo-400">
                <RefreshCw size={32} className="animate-[spin_3s_linear_infinite]" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Vault Protocol Upgraded</h2>
                <p className="text-indigo-200 text-sm mt-1">Your data has been migrated to Sovereign-V3.</p>
            </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
            
            {/* The Benefit */}
            <div className="space-y-3">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-400" /> Security Enhancement
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                    We have automatically re-encrypted your vault using <strong>Argon2id</strong> (64MB Memory Hardness). 
                    This modern standard makes your vault exponentially more resistant to GPU brute-force attacks compared to the previous PBKDF2 standard.
                </p>
            </div>

            <hr className="border-white/5" />

            {/* Critical Action Items */}
            <div className="space-y-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-400" /> Required Actions
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Shard Warning */}
                    <div className="bg-amber-950/20 border border-amber-500/20 p-4 rounded-xl">
                        <div className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Layers size={14} /> Incompatible Shards
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed mb-3">
                            The secret sharing algorithm has been updated to use <strong>Prime Field Arithmetic</strong>. 
                            Old shards (v1) are <strong>mathematically invalid</strong> with the new engine.
                        </p>
                        <div className="text-xs font-bold text-amber-200">
                            Action: If you use shards, generate new ones immediately.
                        </div>
                    </div>

                    {/* Backup Warning */}
                    <div className="bg-slate-800/50 border border-white/10 p-4 rounded-xl">
                        <div className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Download size={14} /> Backup Rotation
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed mb-3">
                            Your previous backup file contains data in the old V1/V2 format. While we can still read it, 
                            you should save the new V3 format for long-term storage.
                        </p>
                        <div className="text-xs font-bold text-white">
                            Action: Download a fresh Backup Kit now.
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-3">
            <Button variant="secondary" onClick={onDownloadBackup} className="w-full sm:w-auto">
                <Download size={16} /> Download V3 Backup
            </Button>
            <Button onClick={onDismiss} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500">
                I Understand <ArrowRight size={16} />
            </Button>
        </div>

      </div>
    </div>
  );
};
