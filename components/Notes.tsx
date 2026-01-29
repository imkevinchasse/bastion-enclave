
import React, { useState } from 'react';
import { Note } from '../types';
import { Button } from './Button';
import { ChaosLock } from '../services/cryptoService';
import { isModelReady, runTextTransformation, initLLM } from '../services/llmService';
import { Plus, Save, Trash2, Search, Book, Clock, AlertTriangle, FileText, Sparkles, ListChecks, Wand2, ArrowRight, X } from 'lucide-react';

interface NotesProps {
  notes: Note[];
  onSave: (note: Note) => void;
  onDelete: (id: string) => void;
}

export const Notes: React.FC<NotesProps> = ({ notes, onSave, onDelete }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  
  // AI State
  const [isAIReady, setIsAIReady] = useState(isModelReady());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<'summarize' | 'grammar' | 'todo' | null>(null);
  
  // Delete Safety State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredNotes = notes
    .filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const handleSelect = (note: Note) => {
    setSelectedId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsDirty(false);
    setConfirmDeleteId(null);
    setAiPreview(null);
  };

  const handleCreate = () => {
    const newNote: Note = {
      id: ChaosLock.getUUID(),
      title: 'New Note',
      content: '',
      updatedAt: Date.now()
    };
    onSave(newNote);
    handleSelect(newNote);
  };

  const handleSaveCurrent = () => {
    if (!selectedId) return;
    onSave({
      id: selectedId,
      title: editTitle,
      content: editContent,
      updatedAt: Date.now()
    });
    setIsDirty(false);
  };

  const executeDelete = (id: string) => {
    onDelete(id);
    if (selectedId === id) {
        setSelectedId(null);
        setEditTitle('');
        setEditContent('');
        setIsDirty(false);
    }
    setConfirmDeleteId(null);
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirmDeleteId === id) {
          executeDelete(id);
      } else {
          setConfirmDeleteId(id);
          setTimeout(() => {
              setConfirmDeleteId(prev => prev === id ? null : prev);
          }, 3000);
      }
  };

  // --- AI HANDLERS ---

  const handleInitEngine = async () => {
      setAiLoading(true);
      try {
          await initLLM((progress) => console.log(progress));
          setIsAIReady(true);
      } catch (e) {
          alert("Failed to load Neural Engine. Check WebGPU support.");
      } finally {
          setAiLoading(false);
      }
  };

  const runAI = async (mode: 'summarize' | 'grammar' | 'todo') => {
      if (!editContent.trim()) return;
      setAiMode(mode);
      setAiLoading(true);
      try {
          const result = await runTextTransformation(editContent, mode);
          setAiPreview(result);
      } catch (e: any) {
          alert(e.message);
      } finally {
          setAiLoading(false);
      }
  };

  const acceptAI = () => {
      if (!aiPreview) return;
      
      if (aiMode === 'grammar') {
          // Replace content
          setEditContent(aiPreview);
      } else {
          // Append content
          setEditContent(prev => prev + "\n\n--- NEURAL INSIGHTS ---\n" + aiPreview);
      }
      setIsDirty(true);
      setAiPreview(null);
      setAiMode(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Sidebar: Clean List */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                   <Book size={24} className="text-indigo-400"/>
                   My Notebook
                </h2>
                <p className="text-slate-500 text-sm">Encrypted notes</p>
            </div>
            <Button size="sm" onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-500 text-white"><Plus size={16}/></Button>
        </div>

        <div className="relative mb-2">
            <input 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-slate-200 placeholder-slate-600 shadow-inner"
                placeholder="Search notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-slate-900/30 rounded-xl border border-white/5 p-2 space-y-2">
            {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 opacity-60">
                   <Book size={32} strokeWidth={1.5} className="mb-2" />
                   <div className="text-sm font-medium">No entries</div>
                </div>
            ) : (
                filteredNotes.map(note => (
                    <div 
                        key={note.id}
                        onClick={() => handleSelect(note)}
                        className={`p-4 rounded-xl cursor-pointer group transition-all duration-200 border relative ${selectedId === note.id ? 'bg-white/10 border-white/10 shadow-lg' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="min-w-0">
                                <h4 className={`font-bold text-sm truncate mb-1 ${selectedId === note.id ? 'text-white' : 'text-slate-300'}`}>{note.title || 'Untitled'}</h4>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                    <Clock size={10} />
                                    {new Date(note.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                            
                            <button 
                                onClick={(e) => requestDelete(e, note.id)}
                                className={`ml-2 p-1.5 rounded-lg transition-all ${confirmDeleteId === note.id ? 'bg-red-500 text-white shadow-lg' : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100'}`}
                            >
                                {confirmDeleteId === note.id ? <AlertTriangle size={14} /> : <Trash2 size={14} />}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Editor: Paper Style */}
      <div className="w-full md:w-2/3 flex flex-col bg-slate-900 border border-white/10 shadow-2xl rounded-2xl relative overflow-hidden">
         {selectedId ? (
             <>
                {/* Editor Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-sm">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <FileText size={14} />
                        <span>Last edited: {new Date().toLocaleTimeString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold transition-opacity duration-300 ${isDirty ? 'opacity-100 text-amber-400' : 'opacity-0'}`}>
                            Unsaved Changes
                        </span>
                        <button 
                            onClick={handleSaveCurrent} 
                            disabled={!isDirty}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isDirty ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                        >
                            <Save size={16} /> Save
                        </button>
                    </div>
                </div>

                {/* Neural Toolbar */}
                <div className="px-6 py-2 border-b border-white/5 bg-slate-950/30 flex items-center gap-2">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 mr-2">
                        <Sparkles size={12} /> Neural Assist
                    </div>
                    
                    {!isAIReady ? (
                        <button 
                            onClick={handleInitEngine}
                            className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full hover:bg-indigo-500 hover:text-white transition-all"
                        >
                            {aiLoading ? 'Loading Engine...' : 'Initialize AI'}
                        </button>
                    ) : (
                        <>
                            <button onClick={() => runAI('summarize')} disabled={aiLoading} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors" title="Summarize Note">
                                <FileText size={14} />
                            </button>
                            <button onClick={() => runAI('grammar')} disabled={aiLoading} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-colors" title="Fix Grammar/Spelling">
                                <Wand2 size={14} />
                            </button>
                            <button onClick={() => runAI('todo')} disabled={aiLoading} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors" title="Extract Action Items">
                                <ListChecks size={14} />
                            </button>
                            {aiLoading && <span className="text-[10px] text-slate-500 animate-pulse ml-2">Processing...</span>}
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col p-6 md:p-8 overflow-hidden bg-[#0f172a] relative">
                    {/* Subtle lined paper pattern css */}
                    <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px)', backgroundSize: '100% 2rem', marginTop: '3.5rem' }}></div>

                    <input 
                        value={editTitle}
                        onChange={e => { setEditTitle(e.target.value); setIsDirty(true); }}
                        className="bg-transparent border-none text-2xl md:text-3xl font-bold text-white placeholder-slate-600 focus:ring-0 w-full p-0 mb-6"
                        placeholder="Note Title"
                    />
                    
                    <textarea 
                        value={editContent}
                        onChange={e => { setEditContent(e.target.value); setIsDirty(true); }}
                        className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-slate-300 text-base leading-8 placeholder-slate-700 custom-scrollbar"
                        placeholder="Start writing..."
                        style={{ lineHeight: '2rem' }} // Matches grid
                    />

                    {/* AI Preview Overlay */}
                    {aiPreview && (
                        <div className="absolute inset-x-6 bottom-6 bg-slate-900 border border-indigo-500/50 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 z-20 flex flex-col max-h-[50%]">
                            <div className="bg-indigo-900/20 px-4 py-2 flex justify-between items-center border-b border-indigo-500/20">
                                <span className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2">
                                    <Sparkles size={12} /> {aiMode === 'grammar' ? 'Grammar Correction' : 'Neural Insight'}
                                </span>
                                <button onClick={() => setAiPreview(null)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                            </div>
                            <div className="p-4 overflow-y-auto custom-scrollbar text-sm text-slate-300 font-mono">
                                {aiPreview}
                            </div>
                            <div className="p-3 bg-slate-950/50 flex justify-end gap-2 border-t border-white/5">
                                <Button size="sm" variant="secondary" onClick={() => setAiPreview(null)}>Discard</Button>
                                <Button size="sm" onClick={acceptAI} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                    {aiMode === 'grammar' ? 'Replace Content' : 'Append to Note'} <ArrowRight size={14} />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
             </>
         ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 bg-slate-900/50">
                 <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                     <Book size={40} className="text-slate-600 opacity-80" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-300">No entry selected</h3>
                 <p className="text-sm">Select a note from the list or create a new one.</p>
             </div>
         )}
      </div>
    </div>
  );
};
