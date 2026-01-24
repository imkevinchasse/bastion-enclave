
import React from 'react';
import { TopNav } from './TopNav';
import { SecurityGame } from './SecurityGame';
import { PublicPage } from '../types';

interface GamePageProps {
  onNavigate: (page: PublicPage) => void;
}

export const GamePage: React.FC<GamePageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950 font-sans text-slate-200">
        
        {/* Shared Dynamic Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-grid opacity-20"></div>
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute top-[40%] right-[0%] w-[50%] h-[60%] bg-emerald-900/10 rounded-full blur-[100px]"></div>
            <div className="absolute inset-0 opacity-30" style={{background: 'radial-gradient(circle at center, transparent 0%, #020617 100%)'}}></div>
        </div>

        <TopNav active="game" onNavigate={onNavigate} />

        {/* Content */}
        <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto p-4 pt-32 pb-12 flex flex-col justify-center">
            <SecurityGame />
        </div>
    </div>
  );
};
