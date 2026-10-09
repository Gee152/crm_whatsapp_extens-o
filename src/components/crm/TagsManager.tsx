import React, { memo, useState } from 'react';
import { Tag as TagIcon, X, Plus } from 'lucide-react';
import { Tag } from '../../types';

interface TagsManagerProps {
  contactTags: Tag[];
  allTags: Tag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (name: string) => void;
}

export const TagsManager = memo(({ contactTags, allTags, onAddTag, onRemoveTag, onCreateTag }: TagsManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const availableTags = allTags.filter(t => !contactTags.find(ct => ct.id === t.id));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim());
      setNewTagName('');
    }
  };

  return (
    <div className="px-6 py-4">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Tags</label>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {contactTags.map((tag, i) => (
          <span key={tag.id} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-medium border ${i % 2 === 0 ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
            {tag.name}
            <button onClick={() => onRemoveTag(tag.id)} className="hover:opacity-75 focus:outline-none">
              <X size={10} />
            </button>
          </span>
        ))}
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 text-slate-400 border border-white/10 rounded-full text-[10px] font-medium hover:bg-white/10"
          >
            <Plus size={10} /> Adicionar
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white/5 p-3 rounded-lg border border-white/10 mt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-medium text-slate-400">Adicionar Tag</span>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-200"><X size={12}/></button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
             {availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => onAddTag(tag.id)}
                  className="px-2 py-1 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  {tag.name}
                </button>
             ))}
          </div>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nova tag..."
              className="flex-1 text-xs bg-slate-800/50 border border-slate-700 rounded px-2 py-1.5 outline-none focus:border-emerald-500 text-slate-200 placeholder-slate-500"
            />
            <button type="submit" disabled={!newTagName.trim()} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1.5 rounded text-xs font-medium disabled:opacity-50 hover:bg-emerald-500/30 transition-colors">
              Criar
            </button>
          </form>
        </div>
      )}
    </div>
  );
});
