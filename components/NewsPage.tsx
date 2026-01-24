
import React from 'react';
import { NewsFeed } from './NewsFeed';
import { TopNav } from './TopNav';
import { Signal, Rss } from 'lucide-react';
import { PublicPage } from '../types';

interface NewsPageProps {
  onNavigate: (page: PublicPage) => void;
}

export const NewsPage: React.FC<NewsPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950 font-sans text-slate-200">
        
        {/* Shared Dynamic Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-grid opacity-20"></div>
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-emerald-900/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute top-[40%] right-[0%] w-[50%] h-[60%] bg-indigo-900/10 rounded-full blur-[100px]"></div>
            <div className="absolute inset-0 opacity-30" style={{background: 'radial-gradient(circle at center, transparent 0%, #020617 100%)'}}></div>
        </div>

        <TopNav active="news" onNavigate={onNavigate} />

        {/* Content */}
        <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto p-4 pt-32 pb-12">
            
            {/* Page Hero */}
            <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
                    <Signal size={32} className="text-emerald-400" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                    The Iron Ledger
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    Security advisories, protocol updates, and system logs from the Bastion High Command.
                </p>
            </div>

            {/* Feed Container */}
            <div className="relative">
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800"></div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Rss size={14} /> Live Feed
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                </div>

                <div className="relative p-2 md:p-6">
                     <NewsFeed compact={false} />
                </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-12 text-slate-600 text-xs font-mono uppercase tracking-widest">
                End of Transmission stream
            </div>
        </div>
    </div>
  );
};
