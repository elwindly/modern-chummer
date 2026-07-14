import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/app/core/rules/**/*.ts', 'src/app/core/utils/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@rules': '/src/app/core/rules',
    },
  },
});
