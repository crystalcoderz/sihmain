import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error Local development middleware is implemented in JavaScript.
import { voiceApi } from './server/voice-api.mjs'

export default defineConfig({ plugins: [react(), voiceApi()] })
