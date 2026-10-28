import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite-cache',
  resolve: { alias: [{ find: /^@\/(.*)$/, replacement: fileURLToPath(new URL('./src/$1', import.meta.url)) }] },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node', // component tests opt in with `// @vitest-environment jsdom`
    restoreMocks: true,
    // Default is node_modules/.vitest-cache; node_modules is read-only in factory worktrees.
    fsModuleCachePath: '.vite-cache/vitest',
  },
});
