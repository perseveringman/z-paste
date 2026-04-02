import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync, renameSync } from 'fs'

function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(src)) return
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = resolve(src, entry.name)
    const destPath = resolve(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'chrome-extension-assets',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist')

        // Copy manifest.json
        copyFileSync(resolve(__dirname, 'manifest.json'), resolve(distDir, 'manifest.json'))

        // Copy icons
        const iconsDir = resolve(distDir, 'icons')
        if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true })
        const srcIcons = resolve(__dirname, 'public', 'icons')
        if (existsSync(srcIcons)) {
          for (const file of readdirSync(srcIcons)) {
            copyFileSync(resolve(srcIcons, file), resolve(iconsDir, file))
          }
        }

        // Copy _locales for i18n
        copyDirRecursive(
          resolve(__dirname, 'public', '_locales'),
          resolve(distDir, '_locales')
        )

        // Copy content.css
        copyFileSync(
          resolve(__dirname, 'src/content/styles.css'),
          resolve(distDir, 'content.css')
        )

        // Move popup HTML from nested path to root, fix asset paths to relative
        const nestedHtml = resolve(distDir, 'src/popup/index.html')
        if (existsSync(nestedHtml)) {
          const { readFileSync, writeFileSync } = require('fs')
          let html = readFileSync(nestedHtml, 'utf-8')
          html = html.replace(/src="\/popup/g, 'src="./popup')
          html = html.replace(/href="\/popup/g, 'href="./popup')
          writeFileSync(resolve(distDir, 'popup.html'), html)
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
