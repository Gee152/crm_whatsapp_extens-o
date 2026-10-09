# Guia de Instalação (Modo Desenvolvedor)

## Pré-requisitos

- [Node.js](https://nodejs.org/) (v18+)
- Git (opcional)

## Passo a Passo

### 1. Preparar o Código

```bash
git clone https://github.com/seu-usuario/whatscrm-preview.git
cd whatscrm-preview
npm install
```

### 2. Build da Extensão

```bash
npm run build:ext
```

Isso gera a pasta `dist/` com todos os arquivos necessários.

### 3. Instalar no Chrome / OperaGX / Edge

1. Abra `chrome://extensions` (ou `opera://extensions`, `edge://extensions`)
2. Ative **"Modo do desenvolvedor"** (cantos superior direito)
3. Clique **"Carregar sem compactação"** (Load unpacked)
4. Selecione a pasta **`dist`** do projeto

### 4. Usar

1. Acesse [web.whatsapp.com](https://web.whatsapp.com)
2. Selecione uma conversa
3. Clique no ícone **CRM** (clipboard ✓) no header do WhatsApp
4. O painel CRM será exibido na lateral direita

> O popup da extensão (ícone na barra de ferramentas) mostra um dashboard com todos os contatos e dados do CRM.

## Scripts Úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com simulador |
| `npm run build:ext` | Build completo da extensão |
| `npm run lint` | Verificação de tipos |

## Solução de Problemas

**"Manifest file is missing"** — Certifique-se de rodar `npm run build:ext` antes de carregar. A pasta `dist/` deve conter `manifest.json`.

**Erro "Cannot load extension"** — Verifique se selecionou a pasta `dist`, não a raiz do projeto.

**Dados não persistem** — A extensão usa `chrome.storage.local`. Dados são por navegador/perfil — não sincronizam entre dispositivos.
