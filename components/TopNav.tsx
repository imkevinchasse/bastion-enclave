import React from 'react';
import { BrandLogo } from './BrandLogo';
import { Signal, Lock, Hexagon, Home, FileText } from 'lucide-react';

interface TopNavProps {
  active: 'landing' | 'auth' | 'news' | 'documents';
  onNavigate: (page: 'landing' | 'auth' | 'news' | 'documents') => void;
}

export const TopNav: React.FC<TopNavProps> = ({ active, onNavigate }) => {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center w-full max-w-[1600px] mx-auto">
      {/* Logo Area */}
      <div 
        className="flex items-center gap-3 cursor-pointer group" 
        onClick={() => onNavigate('landing')}
      >
          <BrandLogo size={32} className="drop-shadow-lg group-hover:scale-105 transition-transform" />
          <div className="hidden md:block">
             <div className="font-bold text-lg text-white leading-none tracking-tight">Bastion</div>
             <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Secure Enclave</div>
          </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-950/80 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-2xl overflow-x-auto">
          <button 
            onClick={() => onNavigate('landing')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${active === 'landing' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
             <Home size={14} /> <span className="hidden sm:inline">Overview</span>
          </button>
          <button 
            onClick={() => onNavigate('auth')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${active === 'auth' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
             <Lock size={14} /> <span>Vault Access</span>
          </button>
          <button 
            onClick={() => onNavigate('news')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${active === 'news' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
             <Signal size={14} /> <span className="hidden sm:inline">Iron Ledger</span>
          </button>
          <button 
            onClick={() => onNavigate('documents')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${active === 'documents' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
             <FileText size={14} /> <span>Research</span>
          </button>
      </div>
    </nav>
  );
};