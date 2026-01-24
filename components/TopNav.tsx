
import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { Signal, Lock, Home, FileText, Gamepad2, Menu, X } from 'lucide-react';
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

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6 w-full max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center relative z-50">
        {/* Logo Area */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => handleNav('landing')}
        >
            <BrandLogo size={32} className="drop-shadow-lg group-hover:scale-105 transition-transform" />
            <div className="block">
              <div className="font-bold text-lg text-white leading-none tracking-tight">Bastion</div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5 hidden sm:block">Secure Enclave</div>
            </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex bg-slate-950/80 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-2xl">
            <NavButton 
              active={active === 'landing'} 
              onClick={() => onNavigate('landing')} 
              icon={<Home size={14} />} 
              label="Overview" 
            />
            <NavButton 
              active={active === 'auth'} 
              onClick={() => onNavigate('auth')} 
              icon={<Lock size={14} />} 
              label="Vault Access" 
              activeColor="bg-indigo-600"
              shadowColor="shadow-indigo-500/20"
            />
            <NavButton 
              active={active === 'news'} 
              onClick={() => onNavigate('news')} 
              icon={<Signal size={14} />} 
              label="Iron Ledger" 
              activeColor="bg-emerald-600"
              shadowColor="shadow-emerald-500/20"
            />
            <NavButton 
              active={active === 'documents'} 
              onClick={() => onNavigate('documents')} 
              icon={<FileText size={14} />} 
              label="Research" 
              activeColor="bg-blue-600"
              shadowColor="shadow-blue-500/20"
            />
            <NavButton 
              active={active === 'game'} 
              onClick={() => onNavigate('game')} 
              icon={<Gamepad2 size={14} />} 
              label="Challenge" 
              activeColor="bg-amber-600"
              shadowColor="shadow-amber-500/20"
            />
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-3 text-slate-300 bg-slate-900/80 border border-white/10 rounded-full hover:text-white transition-colors backdrop-blur-md active:scale-95"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-4 right-4 mt-2 p-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-1 md:hidden animate-mobile-menu origin-top z-40 overflow-hidden">
           <MobileNavButton 
              index={0}
              active={active === 'landing'} 
              onClick={() => handleNav('landing')} 
              icon={<Home size={18} />} 
              label="Overview" 
              desc="Home & Features"
           />
           <MobileNavButton 
              index={1}
              active={active === 'auth'} 
              onClick={() => handleNav('auth')} 
              icon={<Lock size={18} />} 
              label="Vault Access" 
              desc="Login or Recover"
              activeColor="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
           />
           <MobileNavButton 
              index={2}
              active={active === 'news'} 
              onClick={() => handleNav('news')} 
              icon={<Signal size={18} />} 
              label="Iron Ledger" 
              desc="System Status & Logs"
              activeColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
           />
           <MobileNavButton 
              index={3}
              active={active === 'documents'} 
              onClick={() => handleNav('documents')} 
              icon={<FileText size={18} />} 
              label="Research" 
              desc="Security Whitepapers"
              activeColor="text-blue-400 bg-blue-500/10 border-blue-500/20"
           />
           <MobileNavButton 
              index={4}
              active={active === 'game'} 
              onClick={() => handleNav('game')} 
              icon={<Gamepad2 size={18} />} 
              label="Challenge" 
              desc="Security Training"
              activeColor="text-amber-400 bg-amber-500/10 border-amber-500/20"
           />
        </div>
      )}
    </nav>
  );
};

const NavButton = ({ active, onClick, icon, label, activeColor = 'bg-slate-700', shadowColor = 'shadow-lg' }: any) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${active ? `${activeColor} text-white shadow-lg ${shadowColor}` : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
  >
     {icon} <span className="hidden lg:inline">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label, desc, index, activeColor = 'text-white bg-slate-800 border-white/10' }: any) => (
  <button 
      onClick={onClick}
      style={{ animationDelay: `${index * 50}ms` }}
      className={`p-4 rounded-xl flex items-center gap-4 transition-all border animate-mobile-item ${active ? activeColor : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
  >
      <div className={`p-2 rounded-lg ${active ? 'bg-black/20' : 'bg-slate-950 border border-white/5'}`}>
        {icon}
      </div>
      <div className="text-left">
        <div className={`font-bold text-sm ${active ? '' : 'text-slate-200'}`}>{label}</div>
        <div className="text-[10px] opacity-60 font-mono uppercase tracking-wider">{desc}</div>
      </div>
  </button>
);
