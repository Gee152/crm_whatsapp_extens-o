import React, { memo, useState } from 'react';
import { StickyNote, Send } from 'lucide-react';
import { Note } from '../../types';

interface NotesListProps {
  notes: Note[];
  onAddNote: (description: string) => void;
}

export const NotesList = memo(({ notes, onAddNote }: NotesListProps) => {
  const [newNote, setNewNote] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  return (
    <div className="px-6 py-4 flex-grow flex flex-col overflow-hidden">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Activity History</label>
      
      <div className="flex-grow space-y-4 overflow-hidden overflow-y-auto border-l border-slate-700/50 ml-1 pl-4 mb-4 scrollbar-thin scrollbar-thumb-slate-700">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4">Nenhuma nota registrada.</p>
        ) : (
          notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(note => (
            <div key={note.id} className="relative">
              <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-slate-600 bg-slate-900"></div>
              <div className="bg-white/5 border border-white/5 p-2 rounded-lg mt-1">
                <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">{note.description}</p>
                <span className="text-[10px] text-slate-500 mt-2 block">
                  {new Date(note.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="relative mt-auto">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Adicionar nota..."
          className="w-full text-xs bg-slate-800/50 border border-slate-700 rounded-lg pl-3 pr-10 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none text-slate-200 placeholder-slate-500"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAdd(e);
            }
          }}
        />
        <button 
          type="submit" 
          disabled={!newNote.trim()}
          className="absolute right-2 bottom-2 p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md disabled:opacity-50 hover:bg-emerald-500/30 transition-colors"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
});
