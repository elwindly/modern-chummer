import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/app/core/rules/**/*.spec.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@rules': '/src/app/core/rules',
    },
  },
});
