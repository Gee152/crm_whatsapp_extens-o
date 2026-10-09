# WhatsCRM — Documentação Funcional e Estrutural

Extensão de navegador (Chrome/Edge/Opera) que injeta um painel de CRM diretamente na interface do WhatsApp Web.

---

## 1. Visão Geral

O **WhatsCRM** permite que vendedores e atendentes gerenciem leads, acompanhem funis de vendas, adicionem tags, criem notas de histórico e agendem próximas ações, tudo dentro do WhatsApp Web.

A extensão opera em duas superfícies:
- **Sidebar injetada no WhatsApp Web** — painel CRM lateral para o contato ativo
- **Popup da extensão** — dashboard completo com busca e gestão de todos os contatos

---

## 2. Funcionalidades

### 2.1. Core

- **Detecção automática de contato**: ao trocar de chat no WhatsApp, o painel CRM é atualizado automaticamente com os dados do lead
- **Cadastro automático**: contatos sem registro são criados na primeira interação
- **Pipeline**: Lead → Contato → Negociação → Fechado → Perdido
- **Tags**: categorização com suporte a criação e remoção
- **Notas**: feed cronológico de atividades por contato
- **Tarefas**: gestão de próximas ações com data de vencimento e check

### 2.2. Persistência

Todos os dados são salvos no `chrome.storage.local`. Não há mais dependência de dados mockados em produção.

### 2.3. Injeção no WhatsApp Web

O `content script` (`src/content.ts`) é executado automaticamente ao acessar `web.whatsapp.com`:
1. Detecta o header da conversa ativa
2. Injeta um botão CRM (clipboard ✓) no header, ao lado do menu
3. Cria uma sidebar fixa à direita com um iframe carregando `crm.html`
4. Observa mudanças de chat via `MutationObserver`
5. Extrai nome e telefone do contato do DOM e envia para o iframe via `postMessage`

---

## 3. Estrutura do Projeto

```
/
├── public/
│   └── manifest.json          # Manifest V3
├── src/
│   ├── components/
│   │   ├── crm/
│   │   │   ├── CRMApp.tsx      # Container principal do CRM
│   │   │   ├── Header.tsx      # Nome, telefone, empresa
│   │   │   ├── PipelineSelector.tsx
│   │   │   ├── TagsManager.tsx
│   │   │   ├── NotesList.tsx
│   │   │   └── TaskManager.tsx
│   │   └── WhatsAppSimulator.tsx  # Simulador (dev mode)
│   ├── hooks/
│   │   └── useStorage.ts       # Hook chrome.storage
│   ├── utils/
│   │   └── whatsapp.ts         # Helpers de DOM do WhatsApp Web
│   ├── data/
│   │   └── mockData.ts         # Dados mockados (dev mode)
│   ├── types.ts                # Interfaces dos modelos
│   ├── content.ts              # Content script (injeção)
│   ├── crm.tsx                 # Entry point do iframe
│   ├── popup.tsx               # Entry point do popup
│   ├── App.tsx                 # Dev mode (simulador)
│   ├── main.tsx                # Montagem React (dev)
│   └── index.css               # Tailwind
├── crm.html                    # HTML do iframe
├── popup.html                  # HTML do popup
├── index.html                  # HTML do dev mode
├── scripts/
│   └── build-extension.mjs     # Build pós-Vite (esbuild)
├── vite.config.ts              # Multi-entry config
└── package.json
```

### 3.1. Arquivos de Build

| Saída (`dist/`) | Origem | Função |
|---|---|---|
| `manifest.json` | `public/` | Manifest V3 |
| `popup.html` + `assets/popup-*.js` | `popup.html` + `src/popup.tsx` | Popup da extensão |
| `crm.html` + `assets/crm-*.js` | `crm.html` + `src/crm.tsx` | Iframe injetado no WhatsApp |
| `content.js` | `src/content.ts` (esbuild) | Content script |
| `background.js` | `src/background.ts` (esbuild) | Service worker |
| `index.html` + `assets/index-*.js` | `index.html` + `src/main.tsx` | Dev mode |

### 3.2. Modelagem de Dados (`types.ts`)

- `Contact`: id, phone, name, company?, pipeline, created_at
- `Note`: id, contact_id, description, created_at
- `Tag`: id, name
- `ContactTag`: contact_id, tag_id
- `Task`: id, contact_id, description, due_date?, completed

### 3.3. Fluxo de Estado

CRMApp aceita dados via `external*` props. Quando usada na extensão (`crm.tsx` / `popup.tsx`), os dados vêm do `useCRMStorage` hook que lê e escreve no `chrome.storage.local`. No dev mode (`App.tsx`), usa `mockData` como fallback.

---

## 4. Design

A interface do CRM segue o sistema de design do próprio WhatsApp Web:

| Elemento | Cor |
|---|---|
| Fundo | `#111b21` |
| Header | `#202c33` |
| Hover | `#2a3942` |
| Acerto | `#00a884` |
| Texto primário | `#e9edef` |
| Texto secundário | `#8696a0` |
| Bordas | `#313d45` |

---

## 5. Build e Deploy

```bash
npm run build:ext    # Gera dist/ completo
```

Carregar em `chrome://extensions` → "Carregar sem compactação" → selecionar `dist/`.

---

## 6. Próximos Passos

- Sincronizar dados com API remota (REST ou WebSocket)
- Detecção mais robusta do contato ativo via `document.title`
- Interface de configuração (página de opções da extensão)
- Notificações de tarefas vencidas via alarms API
- Publicação na Chrome Web Store
