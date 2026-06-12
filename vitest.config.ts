import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    include: ['**/*.{test,spec,vitest}.?(c|m)[jt]s?(x)'],
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['app/**', 'node_modules/**'],
    },
  },
})
