
import React from 'react';
import { TopNav } from './TopNav';
import { Button } from './Button';
import { FileText, ExternalLink, ShieldAlert, BookOpen, Fingerprint, Microscope, FileCheck, ArrowRight, Mail } from 'lucide-react';
import { PublicPage } from '../types';

interface DocumentsPageProps {
  onNavigate: (page: PublicPage) => void;
}

const DOCUMENTS = [
  {
    id: 'case-study-2024',
    type: 'Case Study',
    title: 'Password Manager Breaches and Security Failures 2015-2024',
    description: 'A comprehensive forensic analysis of major security incidents affecting centralized cloud-based password managers. This study highlights the systemic risks of hot-storage vaults and the necessity of client-side zero-knowledge architectures.',
    date: 'February 2024',
    readTime: '15 min read',
    link: 'https://www.academia.edu/150252055/Password_Manager_Breaches_and_Security_Failures_2015_2024?source=swp_share',
    icon: <ShieldAlert size={32} className="text-red-400" />,
    featured: true
  }
];

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ onNavigate }) => {
  
  const handleContact = () => {
      // Security: Email is base64 encoded to prevent automated scraping of the source code.
      // Decoded: research@bastion.os
      const encoded = "cmVzZWFyY2hAYmFzdGlvbi5vcw==";
      const email = atob(encoded);
      window.location.href = `mailto:${email}?subject=Security%20Research%20Submission`;
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950 font-sans text-slate-200">
        
        {/* Shared Dynamic Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-grid opacity-20"></div>
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute top-[40%] right-[0%] w-[50%] h-[60%] bg-indigo-900/10 rounded-full blur-[100px]"></div>
            <div className="absolute inset-0 opacity-30" style={{background: 'radial-gradient(circle at center, transparent 0%, #020617 100%)'}}></div>
        </div>

        <TopNav active="documents" onNavigate={onNavigate} />

        {/* Content */}
        <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto p-6 pt-32 pb-12">
            
            {/* Page Hero */}
            <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]">
                    <BookOpen size={32} className="text-blue-400" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                    Strategic Intelligence
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    Research, case studies, and technical specifications defining the future of sovereign identity and encryption.
                </p>
            </div>

            {/* Documents Grid */}
            <div className="space-y-8">
                {DOCUMENTS.map((doc, index) => (
                    <div 
                        key={doc.id}
                        className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 ${doc.featured ? 'bg-slate-900/60 border-indigo-500/30 shadow-2xl shadow-indigo-500/10' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}
                    >
                         {/* Featured Highlight */}
                         {doc.featured && (
                             <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                         )}

                         <div className="flex flex-col md:flex-row gap-8 p-8 md:p-10 relative z-10">
                             {/* Icon Column */}
                             <div className="shrink-0">
                                 <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border shadow-inner ${doc.featured ? 'bg-slate-800 border-white/10' : 'bg-slate-950 border-white/5'}`}>
                                     {doc.icon}
                                 </div>
                             </div>

                             {/* Content Column */}
                             <div className="flex-1 space-y-4">
                                 <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                                     <span className={`px-3 py-1 rounded-full ${doc.featured ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                         {doc.type}
                                     </span>
                                     <span className="text-slate-500">• {doc.date}</span>
                                     <span className="text-slate-500">• {doc.readTime}</span>
                                 </div>

                                 <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight group-hover:text-indigo-200 transition-colors">
                                     {doc.title}
                                 </h2>

                                 <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
                                     {doc.description}
                                 </p>

                                 <div className="pt-4">
                                     <a href={doc.link} target="_blank" rel="noreferrer">
                                         <Button variant={doc.featured ? 'primary' : 'secondary'} className="group/btn">
                                             Read Document <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                         </Button>
                                     </a>
                                 </div>
                             </div>
                         </div>
                    </div>
                ))}
            </div>

            {/* Submission CTA */}
            <div className="mt-16 p-8 rounded-3xl bg-slate-900/30 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-slate-800 rounded-full">
                        <Fingerprint size={24} className="text-slate-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Submit Research</h3>
                        <p className="text-slate-400 text-sm">Have a security finding? We participate in responsible disclosure.</p>
                    </div>
                </div>
                <Button variant="ghost" onClick={handleContact}>
                    <Mail size={18} /> Submit via Email
                </Button>
            </div>
        </div>
    </div>
  );
};
