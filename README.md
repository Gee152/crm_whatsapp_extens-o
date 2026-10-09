# WhatsCRM Preview

Extensão de navegador (Chrome/Opera/Edge) que injeta um painel CRM diretamente no WhatsApp Web. Gerencie leads, funil de vendas, notas, tags e tarefas sem sair da conversa.

## Instalação Rápida

```bash
npm install
npm run build:ext
```

Carregue a pasta `dist` como extensão não compactada em `chrome://extensions` (modo desenvolvedor).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (simulador) |
| `npm run build:ext` | Build completo da extensão para `dist/` |
| `npm run lint` | Verificação de tipos TypeScript |

## Como Usar

1. Abra [web.whatsapp.com](https://web.whatsapp.com)
2. Selecione uma conversa
3. Clique no ícone **CRM** (clipboard ✓) no header do WhatsApp
4. Gerencie pipeline, notas, tags e tarefas do contato
5. Clique no ícone da extensão para ver o dashboard completo

## Estrutura

```
src/
├── components/crm/   # Componentes do painel CRM
├── hooks/            # Hook useCRMStorage (chrome.storage)
├── utils/            # Helpers de DOM do WhatsApp Web
├── content.ts        # Content script (injeção no WhatsApp)
├── crm.tsx           # Página do iframe no WhatsApp
├── popup.tsx         # Popup da extensão
└── App.tsx           # Simulador (dev mode)
```

## Tecnologias

React 19, TypeScript, Tailwind CSS v4, Vite, Manifest V3, chrome.storage
