import React, { useState } from 'react';
import { Contact } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { ChaosLock } from '../services/cryptoService';
import { Plus, Save, Trash2, Search, Mail, Phone, MapPin, X, Users, User, Check, Edit2 } from 'lucide-react';

interface ContactsProps {
  contacts: Contact[];
  onSave: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

export const Contacts: React.FC<ContactsProps> = ({ contacts, onSave, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Contact>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    updatedAt: 0
  });

  const filtered = contacts
    .filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setFormData(contact);
  };

  const handleCreate = () => {
    const newContact: Contact = {
      id: ChaosLock.getUUID(),
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      updatedAt: Date.now()
    };
    setFormData(newContact);
    setEditingId(newContact.id); // Triggers modal for new contact
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave({ ...formData, updatedAt: Date.now() });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
      if (confirm("Are you sure you want to delete this person?")) {
        onDelete(id);
        setEditingId(null);
      }
  };

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[600px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Users size={24} className="text-indigo-400"/> People
              </h2>
              <p className="text-slate-500 text-sm">Private address book</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-slate-200 placeholder-slate-600"
                    placeholder="Search people..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              </div>
              <Button onClick={handleCreate} className="shrink-0"><Plus size={18} /> Add Person</Button>
          </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
          {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 opacity-60 border-2 border-dashed border-slate-800 rounded-2xl">
                  <Users size={48} strokeWidth={1.5} className="mb-4" />
                  <div className="text-lg font-medium">No people</div>
                  <p className="text-sm">Add your first contact to get started.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map(contact => (
                      <div 
                          key={contact.id}
                          onClick={() => handleEdit(contact)}
                          className="bg-slate-900 border border-white/5 rounded-2xl p-6 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer group relative overflow-hidden"
                      >
                          {/* Top Decoration */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/50 to-violet-500/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                          <div className="flex items-start justify-between mb-4">
                              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-indigo-400 border border-white/5 shadow-inner">
                                  {contact.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="p-2 rounded-lg bg-white/5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit2 size={14} />
                              </div>
                          </div>
                          
                          <h3 className="text-lg font-bold text-white mb-1 truncate">{contact.name}</h3>
                          
                          <div className="space-y-2 mt-4">
                              {contact.email && (
                                  <div className="flex items-center gap-2 text-sm text-slate-400 truncate">
                                      <Mail size={14} className="text-slate-600 shrink-0" />
                                      {contact.email}
                                  </div>
                              )}
                              {contact.phone && (
                                  <div className="flex items-center gap-2 text-sm text-slate-400 truncate">
                                      <Phone size={14} className="text-slate-600 shrink-0" />
                                      {contact.phone}
                                  </div>
                              )}
                              {!contact.email && !contact.phone && (
                                  <div className="text-sm text-slate-600 italic">No contact info</div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Edit Modal (Overlay) */}
      {editingId && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setEditingId(null)}></div>
              
              <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
                      <h3 className="font-bold text-white text-lg">{formData.id && contacts.find(c => c.id === formData.id) ? 'Edit Person' : 'Add Person'}</h3>
                      <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-white transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-6 space-y-4">
                      <div className="flex items-center gap-4 mb-6">
                           <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-indigo-400 border border-white/10 shadow-inner">
                                {formData.name ? formData.name.charAt(0).toUpperCase() : <User size={24} />}
                           </div>
                           <div className="flex-1">
                               <Input 
                                    placeholder="Full Name" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required
                                    className="text-lg font-bold"
                                    autoFocus
                               />
                           </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input 
                              icon={<Mail size={16} />} 
                              placeholder="Email Address" 
                              value={formData.email} 
                              onChange={e => setFormData({...formData, email: e.target.value})} 
                              type="email"
                          />
                          <Input 
                              icon={<Phone size={16} />} 
                              placeholder="Phone Number" 
                              value={formData.phone} 
                              onChange={e => setFormData({...formData, phone: e.target.value})} 
                              type="tel"
                          />
                      </div>
                      
                      <Input 
                          icon={<MapPin size={16} />} 
                          placeholder="Address / Location" 
                          value={formData.address} 
                          onChange={e => setFormData({...formData, address: e.target.value})} 
                      />

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Notes</label>
                          <textarea 
                              className="w-full h-32 bg-slate-950/50 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none placeholder-slate-600"
                              placeholder="Add notes about this person..."
                              value={formData.notes}
                              onChange={e => setFormData({...formData, notes: e.target.value})}
                          />
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-white/5 mt-4">
                          {formData.id && contacts.find(c => c.id === formData.id) && (
                              <Button type="button" variant="danger" onClick={() => handleDelete(formData.id)} className="px-4">
                                  <Trash2 size={18} />
                              </Button>
                          )}
                          <Button type="button" variant="ghost" onClick={() => setEditingId(null)} className="ml-auto">Cancel</Button>
                          <Button type="submit" className="min-w-[120px]">Save Person</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
