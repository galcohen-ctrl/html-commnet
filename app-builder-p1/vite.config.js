import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const localCommentsPort = process.env.LOCAL_COMMENTS_PORT || '8791'
const localCommentsTarget = `http://127.0.0.1:${localCommentsPort}`
const pagesBase = '/html-commnet/app-builder-p1/'
const pagesBasePath = pagesBase.replace(/\/$/, '')

const localCommentsProxy = {
  '/api/local-comments': {
    target: localCommentsTarget,
  },
  '/local-comments': {
    target: localCommentsTarget,
  },
  [`${pagesBasePath}/api/local-comments`]: {
    target: localCommentsTarget,
    rewrite: (path) => path.replace(pagesBasePath, ''),
  },
  [`${pagesBasePath}/local-comments`]: {
    target: localCommentsTarget,
    rewrite: (path) => path.replace(pagesBasePath, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  base: pagesBase,
  server: {
    proxy: localCommentsProxy,
  },
  preview: {
    proxy: localCommentsProxy,
  },
})
