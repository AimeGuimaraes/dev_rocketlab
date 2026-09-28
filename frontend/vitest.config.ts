import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

// Fuso fixo (UTC-3) para os testes de data serem determinísticos e reproduzirem o Brasil.
// Definido antes dos workers subirem, que herdam o ambiente.
process.env.TZ = 'America/Sao_Paulo';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/api/schema.d.ts', 'src/main.tsx'],
        reporter: ['text', 'html'],
      },
    },
  }),
);
