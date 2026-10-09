import React, { useState } from 'react';
import { Search, MoreVertical, MessageSquare, Phone, Video } from 'lucide-react';
import { CRMApp } from './crm/CRMApp';

// Mock data for WhatsApp simulator
const mockChats = [
  { id: '1', name: 'João Silva', phone: '5511999999991', lastMessage: 'Podemos fechar hoje?', time: '10:45', unread: 2 },
  { id: '2', name: 'Maria Souza', phone: '5511999999992', lastMessage: 'Olá, gostaria de saber mais.', time: 'Ontem', unread: 0 },
  { id: '3', name: '+55 11 98888-7777', phone: '5511988887777', lastMessage: 'Qual o valor do serviço?', time: 'Terça', unread: 1 },
];

export const WhatsAppSimulator = () => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showCRM, setShowCRM] = useState(true);

  const activeChat = mockChats.find(c => c.id === activeChatId);

  return (
    <div className="flex w-full max-w-[1600px] h-[calc(100vh-40px)] m-auto mt-5 bg-[#111b21] shadow-2xl overflow-hidden rounded-xl border border-slate-700/50">
      
      {/* WhatsApp Sidebar */}
      <div className="w-[30%] min-w-[300px] max-w-[400px] flex flex-col border-r border-slate-700/30 z-10 relative">
        <div className="bg-[#202c33] h-16 flex items-center justify-between px-4 border-b border-slate-700/30 shrink-0">
          <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
          <div className="flex gap-4 text-slate-400">
            <MessageSquare size={20} />
            <MoreVertical size={20} />
          </div>
        </div>
        <div className="p-2 border-b border-slate-700/30 bg-[#111b21] shrink-0">
          <div className="bg-[#202c33] rounded-lg flex items-center px-3 py-1.5 gap-3">
            <Search size={18} className="text-slate-400" />
            <input type="text" placeholder="Pesquisar ou começar uma nova conversa" className="bg-transparent border-none outline-none text-sm w-full text-slate-200 placeholder-slate-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mockChats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChatId(chat.id)}
              className={`flex items-center px-3 py-3 cursor-pointer hover:bg-[#202c33] transition-colors border-b border-slate-700/30 ${activeChatId === chat.id ? 'bg-[#2a3942]' : ''}`}
            >
              <div className="w-12 h-12 bg-emerald-900/40 rounded-full flex-shrink-0 flex items-center justify-center text-emerald-500 font-bold text-lg">
                {chat.name[0]}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="text-base font-normal text-slate-200 truncate">{chat.name}</h4>
                  <span className={`text-xs ${chat.unread ? 'text-emerald-500 font-medium' : 'text-slate-500'}`}>{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-400 truncate pr-2">{chat.lastMessage}</p>
                  {chat.unread > 0 && (
                    <span className="bg-emerald-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0b141a] relative min-w-0">
        {/* Chat Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/yl/r/r-v2-bg.png")' }}></div>
        
        {activeChat ? (
          <>
            <div className="bg-[#202c33] h-16 flex items-center justify-between px-4 border-b border-slate-700/30 z-10 shrink-0">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-500 font-bold">
                  {activeChat.name[0]}
                </div>
                <div>
                  <h3 className="font-normal text-slate-200 text-base leading-tight">{activeChat.name}</h3>
                  <p className="text-xs text-slate-400">{activeChat.phone}</p>
                </div>
              </div>
              <div className="flex gap-4 text-slate-400 items-center">
                <Video size={20} />
                <Phone size={20} />
                <div className="w-px h-5 bg-slate-700/50 mx-1"></div>
                {!showCRM && (
                  <button 
                    onClick={() => setShowCRM(true)}
                    className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 rounded-md hover:bg-emerald-500/30 shadow-sm flex items-center gap-1"
                  >
                    Abrir CRM
                  </button>
                )}
                <MoreVertical size={20} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 z-10 flex flex-col gap-2">
               {/* Mock Messages */}
               <div className="bg-[#202c33] p-2 rounded-lg rounded-tl-none w-fit max-w-[70%] shadow-sm text-sm text-slate-200 self-start">
                  Olá, bom dia!
                  <span className="text-[10px] text-slate-400 float-right mt-2 ml-4">10:40</span>
               </div>
               <div className="bg-[#005c4b] p-2 rounded-lg rounded-tr-none w-fit max-w-[70%] shadow-sm text-sm text-slate-100 self-end">
                  Bom dia! Como posso ajudar?
                  <span className="text-[10px] text-emerald-200/70 float-right mt-2 ml-4">10:42</span>
               </div>
               <div className="bg-[#202c33] p-2 rounded-lg rounded-tl-none w-fit max-w-[70%] shadow-sm text-sm text-slate-200 self-start">
                  {activeChat.lastMessage}
                  <span className="text-[10px] text-slate-400 float-right mt-2 ml-4">{activeChat.time}</span>
               </div>
            </div>
            <div className="bg-[#202c33] min-h-[60px] flex items-center px-4 py-2 gap-3 z-10 shrink-0">
              <div className="w-full bg-[#2a3942] rounded-lg px-4 py-3 text-sm text-slate-300 shadow-sm border border-slate-700/30">
                Digite uma mensagem
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center z-10 text-center px-10">
            <h2 className="text-3xl font-light text-slate-300 mb-4">WhatsApp Web CRM</h2>
            <p className="text-slate-500 text-sm max-w-md leading-relaxed">
              Envie e receba mensagens sem precisar manter seu celular conectado ao servidor. <br/>
              Simulador do ambiente com a extensão <b>WhatsCRM</b> injetada na lateral.
            </p>
          </div>
        )}
      </div>

      {/* Injected CRM Panel */}
      {showCRM && (
        <CRMApp 
          activePhone={activeChat?.phone || ''} 
          activeName={activeChat?.name || ''} 
          onClose={() => setShowCRM(false)}
        />
      )}

    </div>
  );
};
