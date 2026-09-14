import { defineConfig } from 'tsdown'

export default defineConfig({
  platform: 'browser',
  dts: false,
  format: ['esm'],
  deps: {
    external: ['react', 'react-dom', '@xyflow/react'],
  },
  // disabled clean - types run after build
})