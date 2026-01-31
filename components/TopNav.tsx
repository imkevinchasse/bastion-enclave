
import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { Signal, Lock, Home, Menu, X, ArrowRight, BookOpen, FileText, ShieldAlert, CheckCircle } from 'lucide-react';
import { PublicPage } from '../types';

interface TopNavProps {
  active: PublicPage;
  onNavigate: (page: PublicPage) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ active, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNav = (page: PublicPage) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  // Z-Index lowered to 30 to avoid conflicting with dev tool overlays
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-30 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center relative">
          
          {/* Logo Area */}
          <div 
            className="flex items-center gap-3 cursor-pointer group select-none" 
            onClick={() => handleNav('landing')}
          >
              <BrandLogo size={32} className="drop-shadow-lg group-hover:brightness-125 transition-all" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-white tracking-tight leading-none group-hover:text-indigo-100 transition-colors">Bastion Enclave</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-none mt-1">Sovereign-V3.5</span>
              </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
              <NavButton 
                active={active === 'landing'} 
                onClick={() => onNavigate('landing')} 
                label="Overview" 
              />
              <NavButton 
                active={active === 'docs'} 
                onClick={() => onNavigate('docs')} 
                label="Documentation" 
              />
              <NavButton 
                active={active === 'news'} 
                onClick={() => onNavigate('news')} 
                label="Iron Ledger" 
              />
              <NavButton 
                active={active === 'documents'} 
                onClick={() => onNavigate('documents')} 
                label="Research" 
              />
              <NavButton 
                active={active === 'breach'} 
                onClick={() => onNavigate('breach')} 
                label="Breach Check" 
              />
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-4">
              <div className="h-4 w-px bg-white/10"></div>
              <button 
                onClick={() => onNavigate('auth')}
                className="group relative px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <Lock size={14} className="group-hover:scale-110 transition-transform" />
                <span>Vault Access</span>
              </button>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-slate-950 pt-24 px-6 animate-in slide-in-from-top-10 duration-200">
           <div className="flex flex-col gap-2">
             <MobileNavButton 
                active={active === 'landing'} 
                onClick={() => handleNav('landing')} 
                icon={<Home size={20} />} 
                label="Overview" 
                desc="Platform Features"
             />
             <MobileNavButton 
                active={active === 'docs'} 
                onClick={() => handleNav('docs')} 
                icon={<FileText size={20} />} 
                label="Documentation" 
                desc="User Manual & Specs"
             />
             <MobileNavButton 
                active={active === 'news'} 
                onClick={() => handleNav('news')} 
                icon={<Signal size={20} />} 
                label="Iron Ledger" 
                desc="System Updates"
             />
             <MobileNavButton 
                active={active === 'documents'} 
                onClick={() => handleNav('documents')} 
                icon={<BookOpen size={20} />} 
                label="Research" 
                desc="Technical Papers"
             />
             <MobileNavButton 
                active={active === 'breach'} 
                onClick={() => handleNav('breach')} 
                icon={<ShieldAlert size={20} />} 
                label="Breach Check" 
                desc="Password Analysis"
             />
             
             <div className="h-px bg-white/10 my-4"></div>

             <button 
                onClick={() => handleNav('auth')} 
                className="w-full p-4 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-between"
             >
                <span className="flex items-center gap-3">
                  <Lock size={20} /> Vault Access
                </span>
                <ArrowRight size={20} />
             </button>
           </div>
        </div>
      )}
    </>
  );
};

const NavButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      active 
        ? 'text-white bg-white/5' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
     {label}
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label, desc }: any) => (
  <button 
      onClick={onClick}
      className={`p-4 rounded-xl flex items-center gap-4 transition-all border ${active ? 'bg-slate-900 border-indigo-500/30' : 'bg-transparent border-transparent hover:bg-slate-900'}`}
  >
      <div className={`text-slate-400 ${active ? 'text-indigo-400' : ''}`}>
        {icon}
      </div>
      <div className="text-left">
        <div className={`font-bold text-lg ${active ? 'text-white' : 'text-slate-200'}`}>{label}</div>
        <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">{desc}</div>
      </div>
  </button>
);
