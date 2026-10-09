import * as esbuild from 'esbuild';
import { copyFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, '..', 'dist');

await esbuild.build({
  entryPoints: [
    resolve(__dirname, '..', 'src/background.ts'),
    resolve(__dirname, '..', 'src/content.tsx'),
    resolve(__dirname, '..', 'src/bridge.ts'),
  ],
  outdir: dist,
  bundle: true,
  format: 'iife',
  minify: false,
  sourcemap: false,
  loader: {
    '.css': 'empty',
  },
});

// Copia o CSS gerado pelo Vite para dist/content.css para injeção nativa no manifest
const assetsDir = resolve(dist, 'assets');
try {
  const files = readdirSync(assetsDir);
  const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
  if (cssFile) {
    copyFileSync(resolve(assetsDir, cssFile), resolve(dist, 'content.css'));
    console.log(`Copied ${cssFile} -> dist/content.css`);
  }
} catch (e) {
  console.warn('CSS asset copy warning:', e);
}

console.log('Content & background scripts built successfully');
