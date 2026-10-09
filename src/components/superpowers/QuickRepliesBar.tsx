import React, { useState } from 'react';
import { MessageSquarePlus, Plus, X } from 'lucide-react';
import type { QuickReply } from '../../types';
import { injectTextMessageIntoChatInput } from '../../utils/whatsapp';

interface QuickRepliesBarProps {
  quickReplies: QuickReply[];
  onAddQuickReply?: (reply: QuickReply) => void;
}

export const QuickRepliesBar: React.FC<QuickRepliesBarProps> = ({
  quickReplies,
  onAddQuickReply,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const handleSend = (text: string) => {
    injectTextMessageIntoChatInput(text);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    const created: QuickReply = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      message: newMessage.trim(),
      category: 'Personalizado',
    };

    onAddQuickReply?.(created);
    setNewTitle('');
    setNewMessage('');
    setShowAddModal(false);
  };

  return (
    <div className="w-full bg-[#111b21] border-t border-[#222d34] px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
      <div className="flex items-center gap-1 text-[#00a884] font-semibold shrink-0 pr-1 border-r border-[#222d34]">
        <MessageSquarePlus size={14} />
        <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Respostas Rápidas:</span>
      </div>

      {quickReplies.map(reply => (
        <button
          key={reply.id}
          onClick={() => handleSend(reply.message)}
          className="px-2.5 py-1 bg-[#202c33] hover:bg-[#00a884]/20 hover:border-[#00a884]/50 border border-transparent text-[#e9edef] rounded-lg whitespace-nowrap transition-all text-xs font-medium shrink-0 shadow-sm active:scale-95 flex items-center gap-1"
          title={reply.message}
        >
          <span>{reply.title}</span>
        </button>
      ))}

      <button
        onClick={() => setShowAddModal(true)}
        className="p-1 bg-[#2a3942] hover:bg-[#00a884] hover:text-[#111b21] text-[#8696a0] rounded-lg transition-colors shrink-0 ml-auto"
        title="Adicionar modelo de resposta rápida"
      >
        <Plus size={14} />
      </button>

      {/* Modal para adicionar nova resposta rápida */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2147483646] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#202c33] border border-[#313d45] rounded-xl w-full max-w-md p-4 text-[#e9edef] shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#313d45] mb-3">
              <h3 className="font-bold text-sm text-[#00a884]">Criar Resposta Rápida</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8696a0] hover:text-[#e9edef]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1">Título / Atalho</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: 👋 Saudação Inicial"
                  className="w-full bg-[#111b21] border border-[#313d45] rounded p-2 text-xs text-[#e9edef] outline-none focus:border-[#00a884]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8696a0] mb-1">Mensagem Completa</label>
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Escreva o texto padrão que será inserido na conversa..."
                  rows={4}
                  className="w-full bg-[#111b21] border border-[#313d45] rounded p-2 text-xs text-[#e9edef] outline-none focus:border-[#00a884] resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-[#2a3942] hover:bg-[#313d45] text-xs font-medium rounded text-[#e9edef]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#00a884] hover:bg-[#029071] text-xs font-bold rounded text-white"
                >
                  Salvar Resposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
