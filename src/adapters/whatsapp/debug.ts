const NAMESPACE = 'WhatsCRM';

export interface DebugFn {
  (...args: unknown[]): void;
  namespace: string;
}

function makeDebug(namespace: string): DebugFn {
  const fn = ((...args: unknown[]) => {
    if (typeof console === 'undefined') return;
    try {
      // eslint-disable-next-line no-console
      console.log(`%c[${NAMESPACE}:${namespace}]`, 'color:#00a884;font-weight:bold', ...args);
    } catch (_e) {
      // eslint-disable-next-line no-console
      console.log(`[${NAMESPACE}:${namespace}]`, ...args);
    }
  }) as DebugFn;
  fn.namespace = namespace;
  return fn;
}

export const debug = {
  bridge: makeDebug('bridge'),
  ui: makeDebug('ui'),
  modules: makeDebug('modules'),
  scanner: makeDebug('scanner'),
  dom: makeDebug('dom'),
  sync: makeDebug('sync'),
};
