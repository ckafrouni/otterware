import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/index.ts',
  platform: 'node',
  output: {
    banner: '#!/usr/bin/env node',
    cleanDir: true,
    file: 'dist/index.mjs',
    format: 'esm',
  },
})
