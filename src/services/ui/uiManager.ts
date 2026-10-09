/**
 * Gerenciador de UI e Ciclo de Vida dos React Roots
 * Garante unmount explícito de raízes React e criação segura de elementos DOM sem innerHTML.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { createSafeElement } from '../../utils/security';

export class UIManager {
  private roots = new Map<string, { root: Root; container: HTMLElement }>();
  private toastElement: HTMLElement | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private loadingToastEl: HTMLElement | null = null;
  private fullScanOverlayEl: HTMLElement | null = null;

  /**
   * Monta ou atualiza um React Root de forma segura.
   * Se o container no DOM mudou ou foi removido, desmonta a raiz anterior para evitar memory leak.
   */
  safeMountRoot(containerId: string, container: HTMLElement, element: React.ReactNode): Root {
    const existing = this.roots.get(containerId);

    if (existing) {
      if (existing.container === container && document.contains(container)) {
        existing.root.render(element);
        return existing.root;
      }
      // Container foi substituído ou desconectado da DOM: desmonta com segurança
      try {
        existing.root.unmount();
      } catch (err) {
        console.warn(`[WhatsCRM UIManager] Aviso ao desmontar root ${containerId}:`, err);
      }
      this.roots.delete(containerId);
    }

    const root = createRoot(container);
    root.render(element);
    this.roots.set(containerId, { root, container });
    return root;
  }

  /**
   * Desmonta explicitamente um React Root.
   */
  safeUnmountRoot(containerId: string): void {
    const existing = this.roots.get(containerId);
    if (existing) {
      try {
        existing.root.unmount();
      } catch (err) {
        console.warn(`[WhatsCRM UIManager] Falha ao desmontar ${containerId}:`, err);
      }
      this.roots.delete(containerId);
    }
  }

  /**
   * Desmonta todas as raízes registradas (usado em reload ou desmontagem da extensão).
   */
  cleanupAllRoots(): void {
    for (const [id, item] of this.roots.entries()) {
      try {
        item.root.unmount();
      } catch (_e) {}
    }
    this.roots.clear();
  }

  /**
   * Exibe um Toast temporário seguro (sem innerHTML).
   */
  showToast(message: string, type: 'success' | 'info' | 'error' = 'info'): void {
    const colors: Record<string, string> = {
      success: '#00a884',
      info: '#17a2b8',
      error: '#e74c3c',
    };

    if (!this.toastElement) {
      this.toastElement = createSafeElement('div', {
        id: 'whatscrm-toast',
        style: {
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%) translateY(10px)',
          zIndex: '2147483647',
          padding: '8px 18px',
          borderRadius: '10px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '13px',
          fontWeight: '600',
          color: '#e9edef',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: '0',
          pointerEvents: 'none',
        },
      });
      document.body.appendChild(this.toastElement);
    }

    this.toastElement.style.backgroundColor = colors[type] || '#17a2b8';
    this.toastElement.textContent = message;
    this.toastElement.style.opacity = '1';
    this.toastElement.style.transform = 'translateX(-50%) translateY(0)';

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      if (this.toastElement) {
        this.toastElement.style.opacity = '0';
        this.toastElement.style.transform = 'translateX(-50%) translateY(10px)';
      }
    }, 3000);
  }

  /**
   * Exibe Toast de Carregamento Seguro (sem innerHTML).
   */
  showLoadingToast(msg: string): void {
    if (!this.loadingToastEl) {
      this.loadingToastEl = createSafeElement('div', {
        id: 'whatscrm-loading',
        style: {
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: '2147483647',
          padding: '10px 22px',
          borderRadius: '10px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          fontWeight: '600',
          color: '#e9edef',
          backgroundColor: '#1f2c33',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'none',
        },
      });

      const spinner = createSafeElement('span', {
        text: '⟳',
        style: { display: 'inline-block', animation: 'spin 1s linear infinite' },
      });
      const textSpan = createSafeElement('span', { id: 'whatscrm-loading-text', text: msg });

      this.loadingToastEl.appendChild(spinner);
      this.loadingToastEl.appendChild(textSpan);
      document.body.appendChild(this.loadingToastEl);
      this.injectSpinnerStyle();
    } else {
      const textSpan = this.loadingToastEl.querySelector('#whatscrm-loading-text');
      if (textSpan) textSpan.textContent = msg;
      this.loadingToastEl.style.display = 'flex';
    }
  }

  hideLoadingToast(): void {
    if (this.loadingToastEl) {
      this.loadingToastEl.style.display = 'none';
    }
  }

  /**
   * Overlay de Varredura Completa com Atualização Segura.
   */
  showFullScanLoading(): void {
    if (this.fullScanOverlayEl) return;

    this.fullScanOverlayEl = createSafeElement('div', {
      id: 'whatscrm-full-scan-loading',
      style: {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#e9edef',
      },
    });

    const card = createSafeElement('div', {
      style: { textAlign: 'center', maxWidth: '90%' },
    });

    const spinner = createSafeElement('div', {
      text: '⟳',
      style: { fontSize: '48px', marginBottom: '20px', animation: 'spin 1s linear infinite' },
    });

    const stepEl = createSafeElement('div', {
      id: 'whatscrm-scan-step',
      text: 'Iniciando varredura completa...',
      style: { fontSize: '18px', fontWeight: '600', marginBottom: '8px' },
    });

    const detailEl = createSafeElement('div', {
      id: 'whatscrm-scan-detail',
      text: 'Aguarde enquanto escaneamos suas conversas',
      style: { fontSize: '14px', color: '#8696a0' },
    });

    const progressTrack = createSafeElement('div', {
      style: {
        marginTop: '24px',
        width: '200px',
        height: '4px',
        backgroundColor: '#2a3a44',
        borderRadius: '2px',
        overflow: 'hidden',
      },
    });

    const progressBar = createSafeElement('div', {
      id: 'whatscrm-scan-progress',
      style: {
        width: '0%',
        height: '100%',
        backgroundColor: '#00a884',
        borderRadius: '2px',
        transition: 'width 0.3s',
      },
    });

    progressTrack.appendChild(progressBar);
    card.appendChild(spinner);
    card.appendChild(stepEl);
    card.appendChild(detailEl);
    card.appendChild(progressTrack);

    this.fullScanOverlayEl.appendChild(card);
    document.body.appendChild(this.fullScanOverlayEl);
    this.injectSpinnerStyle();
  }

  updateFullScanLoading(step: string, detail: string, progress: number): void {
    if (!this.fullScanOverlayEl) return;
    const stepEl = document.getElementById('whatscrm-scan-step');
    const detailEl = document.getElementById('whatscrm-scan-detail');
    const progressEl = document.getElementById('whatscrm-scan-progress');
    if (stepEl) stepEl.textContent = step;
    if (detailEl) detailEl.textContent = detail;
    if (progressEl) progressEl.style.width = `${progress}%`;
  }

  hideFullScanLoading(): void {
    if (this.fullScanOverlayEl) {
      this.fullScanOverlayEl.remove();
      this.fullScanOverlayEl = null;
    }
  }

  private injectSpinnerStyle(): void {
    if (!document.getElementById('whatscrm-spinner-style')) {
      const style = document.createElement('style');
      style.id = 'whatscrm-spinner-style';
      style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
  }
}

export const uiManager = new UIManager();
