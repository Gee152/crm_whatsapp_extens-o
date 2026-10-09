import React, { memo, useState } from 'react';
import { CalendarCheck, CheckCircle2, Circle, Plus } from 'lucide-react';
import { Task } from '../../types';

interface TaskManagerProps {
  tasks: Task[];
  onAddTask: (description: string, dueDate?: string) => void;
  onToggleTask: (taskId: string) => void;
}

export const TaskManager = memo(({ tasks, onAddTask, onToggleTask }: TaskManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onAddTask(description.trim(), dueDate || undefined);
      setDescription('');
      setDueDate('');
      setIsAdding(false);
    }
  };

  return (
    <div className="p-6 bg-white/5 backdrop-blur-md">
      <div className="flex justify-between items-center mb-4">
        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">
          Next Action
        </label>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="text-xs text-emerald-400 font-medium hover:text-emerald-300 flex items-center gap-1"
          >
            <Plus size={14} /> Nova
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que precisa ser feito?"
            className="w-full text-xs bg-slate-900/50 border border-slate-700 rounded px-2.5 py-1.5 outline-none focus:border-emerald-500 mb-2 text-slate-200 placeholder-slate-500"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 text-xs bg-slate-900/50 border border-slate-700 rounded px-2.5 py-1.5 outline-none focus:border-emerald-500 text-slate-300"
            />
            <button type="submit" disabled={!description.trim()} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 hover:bg-emerald-500/30">
              Salvar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {tasks.length === 0 && !isAdding ? (
          <p className="text-xs text-slate-500 italic text-center py-2">Nenhuma tarefa pendente.</p>
        ) : (
          tasks.sort((a, b) => Number(a.completed) - Number(b.completed)).map(task => (
            <div key={task.id} className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors ${task.completed ? 'bg-white/5 border-transparent opacity-60' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'}`}>
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <button onClick={() => onToggleTask(task.id)} className="mt-0.5 text-slate-500 hover:text-emerald-400 flex-shrink-0">
                  {task.completed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} />}
                </button>
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-medium truncate ${task.completed ? 'line-through text-slate-500' : 'text-emerald-400'}`}>
                    {task.description}
                  </span>
                </div>
              </div>
              {task.due_date && (
                <div className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded shrink-0 self-center">
                  {new Date(task.due_date).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="mt-4">
        <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 text-sm">
          Save Interaction
        </button>
      </div>
    </div>
  );
});
