import { whatsappBridge } from './adapters/whatsapp/bridge';

// Entrada para o arquivo dist/bridge.js (injetado no main world como script
// externo via <script src="chrome-extension://…/bridge.js">). O WhatsApp bloqueia
// scripts inline via CSP, mas permite a origem chrome-extension:// — por isso o
// bridge é empacotado como arquivo próprio em vez de ser injetado inline.
whatsappBridge();
