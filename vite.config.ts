/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vite'

export default defineConfig({
  root: './playground',
  plugins: [react()],
  test: {
    root: '.',
    browser: {
      enabled: false,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
  },
})
