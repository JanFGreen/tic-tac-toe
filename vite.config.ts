import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // node_modules is linked read-only into factory worktrees; keep caches inside the repo.
  cacheDir: '.vite-cache',
  resolve: { alias: [{ find: /^@\/(.*)$/, replacement: fileURLToPath(new URL('./src/$1', import.meta.url)) }] },
  // `npm run server` listens on 3001; the dev server forwards API calls to it.
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: { outDir: 'dist', emptyOutDir: true },
});
