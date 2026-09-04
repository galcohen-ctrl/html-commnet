import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const localCommentsPort = process.env.LOCAL_COMMENTS_PORT || '8791'
const localCommentsTarget = `http://127.0.0.1:${localCommentsPort}`

const localCommentsProxy = {
  '/api/local-comments': {
    target: localCommentsTarget,
  },
  '/local-comments': {
    target: localCommentsTarget,
  },
  '/html-commnet/api/local-comments': {
    target: localCommentsTarget,
    rewrite: (path) => path.replace(/^\/html-commnet/, ''),
  },
  '/html-commnet/local-comments': {
    target: localCommentsTarget,
    rewrite: (path) => path.replace(/^\/html-commnet/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  base: '/html-commnet/app-builder-p1/',
  server: {
    proxy: localCommentsProxy,
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io', '.ngrok.dev'],
  },
  preview: {
    proxy: localCommentsProxy,
  },
})
