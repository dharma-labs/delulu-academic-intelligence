import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // Prefer TypeScript sources over stale compiled twins (src/lib/types.js shadows
    // src/lib/types.ts under the default extension order, and its grade tables diverge).
    extensions: ['.ts', '.tsx', '.mts', '.mjs', '.js', '.jsx', '.json'],
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'desktop/dist', 'examples', 'tests'],
    restoreMocks: true,
    clearMocks: true,
  },
});
