# Nextra 4 Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Docusaurus website with Nextra 4 (Next.js App Router), preserving all 6 docs pages and the Landing Page, deploying to GitHub Pages at `/z-paste/`.

**Architecture:** Nextra 4 docs theme on Next.js App Router with static export (`output: 'export'`). Docs live in `content/docs/`, Landing Page in `app/page.tsx`. `basePath: '/z-paste'` handles the GitHub Pages subdirectory.

**Tech Stack:** Next.js 15, Nextra 4, nextra-theme-docs, TypeScript, Tailwind CSS (bundled with Nextra)

---

## Pre-flight

Before starting, read the existing files you'll be migrating FROM:
- `website/src/pages/index.tsx` — Landing Page JSX
- `website/src/pages/index.module.css` — Landing Page styles
- `website/docs/*.md` — all 6 doc files
- `website/docusaurus.config.ts` — navbar/footer config to port
- `.github/workflows/docs.yml` — CI to update

---

### Task 1: Delete Docusaurus files and scaffold Nextra 4 project

**Files:**
- Delete: `website/` (entire directory, then recreate scaffold)

**Step 1: Remove Docusaurus directory**

```bash
rm -rf website
mkdir website
```

**Step 2: Initialize package.json**

Create `website/package.json`:

```json
{
  "name": "website",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "nextra": "^4.0.0",
    "nextra-theme-docs": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "~5.6.0"
  }
}
```

**Step 3: Install dependencies**

```bash
cd website && npm install
```

Expected: `node_modules/` created, `package-lock.json` generated, no errors.

**Step 4: Create tsconfig.json**

Create `website/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 5: Create next.config.ts**

Create `website/next.config.ts`:

```ts
import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

export default withNextra({
  output: 'export',
  basePath: '/z-paste',
  images: { unoptimized: true },
})
```

**Step 6: Commit**

```bash
cd website && git add package.json package-lock.json tsconfig.json next.config.ts
git commit -m "chore(docs): scaffold Nextra 4 project"
```

---

### Task 2: Create mdx-components and theme config

**Files:**
- Create: `website/mdx-components.tsx`
- Create: `website/theme.config.tsx`

**Step 1: Create mdx-components.tsx**

Nextra 4 requires this file at the project root.

Create `website/mdx-components.tsx`:

```tsx
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'

export function useMDXComponents(components: Record<string, React.ComponentType>) {
  return {
    ...getDocsMDXComponents(),
    ...components,
  }
}
```

**Step 2: Create theme.config.tsx**

This replaces `docusaurus.config.ts`. Port the navbar/footer values.

Create `website/theme.config.tsx`:

```tsx
import type { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>Z-Paste</span>,
  project: {
    link: 'https://github.com/perseveringman/z-paste',
  },
  docsRepositoryBase: 'https://github.com/perseveringman/z-paste',
  navbar: {
    extraContent: (
      <a
        href="https://github.com/perseveringman/z-paste/releases/latest"
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: '6px',
          background: 'var(--nextra-primary-hue)',
          color: 'white',
          fontSize: '0.85rem',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        下载
      </a>
    ),
  },
  footer: {
    content: (
      <span>
        Copyright © {new Date().getFullYear()} Z-Paste. Built with{' '}
        <a href="https://nextra.site" target="_blank" rel="noreferrer">
          Nextra
        </a>
        .
      </span>
    ),
  },
  darkMode: true,
  nextThemes: {
    defaultTheme: 'dark',
  },
  i18n: [],
}

export default config
```

**Step 3: Commit**

```bash
git add website/mdx-components.tsx website/theme.config.tsx
git commit -m "chore(docs): add Nextra theme config and mdx-components"
```

---

### Task 3: Create app layout and docs route

**Files:**
- Create: `website/app/layout.tsx`
- Create: `website/app/docs/[[...slug]]/page.tsx`

**Step 1: Create app/layout.tsx**

Create `website/app/layout.tsx`:

```tsx
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Z-Paste',
  description: 'macOS 剪切板管理器 + 密码保险箱',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hans" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
```

**Step 2: Create docs catch-all route**

Create `website/app/docs/[[...slug]]/page.tsx`:

```tsx
import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents } from '../../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('docs')

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const params = await props.params
  const { metadata } = await importPage(params.slug, 'docs')
  return metadata
}

const Nextra = importPage

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const params = await props.params
  const result = await importPage(params.slug, 'docs')
  const { default: MDXContent, toc, metadata } = result
  const components = useMDXComponents({})
  return <MDXContent components={components} params={params} />
}
```

**Step 3: Commit**

```bash
git add website/app/
git commit -m "chore(docs): add Next.js app layout and docs dynamic route"
```

---

### Task 4: Migrate docs content

**Files:**
- Create: `website/content/docs/_meta.js`
- Create: `website/content/docs/installation.md` (from `website/docs/installation.md`)
- Create: `website/content/docs/clipboard.md`
- Create: `website/content/docs/vault.md`
- Create: `website/content/docs/shortcuts.md`
- Create: `website/content/docs/faq.md`
- Create: `website/content/docs/changelog.md`

**Step 1: Create content/docs/_meta.js**

This controls sidebar order and labels (replaces `sidebars.ts`).

Create `website/content/docs/_meta.js`:

```js
export default {
  installation: '安装指南',
  clipboard: '剪切板管理',
  vault: '密码保险箱',
  shortcuts: '快捷键',
  faq: '常见问题',
  changelog: '更新日志',
}
```

**Step 2: Copy and clean each doc file**

For each of the 6 `.md` files, copy the content and remove the `id` and `sidebar_position` frontmatter fields. Keep `title`. Content body stays exactly the same.

Example — `website/content/docs/installation.md` frontmatter becomes:

```md
---
title: 安装指南
---
```

Do the same for all 6 files: `installation.md`, `clipboard.md`, `vault.md`, `shortcuts.md`, `faq.md`, `changelog.md`.

Note: The `:::note` admonition syntax in `clipboard.md` is supported by Nextra natively — no changes needed.

**Step 3: Commit**

```bash
git add website/content/
git commit -m "feat(docs): migrate all 6 doc pages to Nextra content directory"
```

---

### Task 5: Migrate Landing Page

**Files:**
- Create: `website/app/page.tsx`
- Create: `website/public/img/favicon.ico` (copy from old `static/img/favicon.ico`)
- Create: `website/public/img/logo.svg` (copy from old `static/img/logo.svg`)

**Step 1: Copy static assets**

```bash
mkdir -p website/public/img
cp website-old/static/img/favicon.ico website/public/img/  # adjust path if needed
cp website-old/static/img/logo.svg website/public/img/
```

Or if working directly in the repository after deletion, these files are gone — recreate `favicon.ico` by placing any valid `.ico` file, or omit for now and add later.

**Step 2: Create app/page.tsx**

Port `src/pages/index.tsx` to Tailwind classes (Nextra 4 bundles Tailwind). The logic and data (features array) are identical — only styling changes from CSS Modules to Tailwind.

Create `website/app/page.tsx`:

```tsx
import Link from 'next/link'

type FeatureItem = {
  title: string
  emoji: string
  description: string
}

const features: FeatureItem[] = [
  {
    title: '剪切板历史',
    emoji: '📋',
    description: '自动记录所有复制内容，支持文本、图片、代码、颜色、URL 等类型，随时找回历史记录。',
  },
  {
    title: '智能搜索',
    emoji: '🔍',
    description: '模糊搜索快速定位历史内容，支持按类型、来源应用、标签筛选，键盘全程操作。',
  },
  {
    title: '密码保险箱',
    emoji: '🔐',
    description: 'AES-256 加密存储密码和敏感信息，支持 Touch ID 解锁、TOTP 两步验证码生成。',
  },
  {
    title: '快捷键召唤',
    emoji: '⚡',
    description: '按 Shift+Cmd+V 即可唤起剪切板面板，不打断工作流，数字键 1-9 快速粘贴。',
  },
  {
    title: '代码高亮预览',
    emoji: '✨',
    description: '使用 VS Code 引擎（Shiki）对代码片段语法高亮，JSON 自动格式化，颜色可视化预览。',
  },
  {
    title: '本地隐私优先',
    emoji: '🛡️',
    description: '所有数据存储在本机 SQLite，不上传任何内容。支持可选的 iCloud Drive 多设备同步。',
  },
]

function FeatureCard({ title, emoji, description }: FeatureItem) {
  return (
    <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{description}</p>
    </div>
  )
}

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="py-24 px-8 text-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-6xl font-extrabold mb-4 bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Z-Paste
          </h1>
          <p className="text-xl text-slate-300 mb-8 leading-relaxed">
            macOS 剪切板管理器 + 密码保险箱
            <br />
            本地存储，隐私优先，免订阅
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-6">
            <Link
              href="https://github.com/perseveringman/z-paste/releases/latest"
              className="px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors no-underline"
            >
              免费下载
            </Link>
            <Link
              href="/docs/installation"
              className="px-6 py-3 rounded-lg border border-slate-500 hover:border-slate-300 text-slate-300 hover:text-white font-semibold transition-colors no-underline"
            >
              查看文档
            </Link>
          </div>
          <p className="text-sm text-slate-400">仅支持 macOS · Apple Silicon 和 Intel 均可</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">核心功能</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
```

**Step 3: Commit**

```bash
git add website/app/page.tsx website/public/
git commit -m "feat(docs): migrate Landing Page to Nextra app/page.tsx"
```

---

### Task 6: Verify local build

**Step 1: Run build**

```bash
cd website && npm run build
```

Expected: Build completes successfully, `out/` directory created with static HTML files including `out/index.html` and `out/docs/` pages.

**Step 2: Check output structure**

```bash
ls website/out/
ls website/out/docs/
```

Expected: `index.html`, `docs/` directory with `installation/index.html`, `clipboard/index.html`, etc.

**Step 3: Fix any build errors**

Common issues:
- Missing `'use client'` if using hooks in `page.tsx` — the Landing Page above is a Server Component so this shouldn't apply
- Import errors in `app/docs/[[...slug]]/page.tsx` — Nextra 4 API may differ slightly; check `node_modules/nextra/pages` exports if needed
- If `importPage` API has changed, check Nextra 4 docs at https://nextra.site/docs/file-conventions/page

**Step 4: Commit if no changes needed, otherwise fix and commit**

```bash
git add -A && git commit -m "fix(docs): resolve build errors after Nextra migration"
```

---

### Task 7: Update GitHub Actions CI

**Files:**
- Modify: `.github/workflows/docs.yml`

**Step 1: Update publish_dir and step name**

Edit `.github/workflows/docs.yml`. Change two things:
1. Step name `Build Docusaurus site` → `Build Nextra site`
2. `publish_dir: ./website/build` → `publish_dir: ./website/out`

The final file should look like:

```yaml
name: Deploy Docs to GitHub Pages

on:
  push:
    branches:
      - main
    paths:
      - 'website/**'

  workflow_dispatch:

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: website/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: website

      - name: Build Nextra site
        run: npm run build
        working-directory: website

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./website/out
          publish_branch: gh-pages
```

**Step 2: Commit and push**

```bash
git add .github/workflows/docs.yml
git commit -m "ci: update docs workflow for Nextra static export output dir"
git push origin main
```

**Step 3: Verify CI passes**

```bash
gh run list --workflow=docs.yml --limit=3
```

Wait for the run to complete, then:

```bash
gh run view <run-id>
```

Expected: All steps pass, `Deploy to GitHub Pages` step shows success.

---

### Task 8: Smoke test the deployed site

**Step 1: Wait for GitHub Pages to update (usually ~1 minute after CI passes)**

**Step 2: Check key pages**

Open in browser:
- `https://perseveringman.github.io/z-paste/` — Landing Page with Hero and 6 feature cards
- `https://perseveringman.github.io/z-paste/docs/installation` — Installation doc with sidebar
- `https://perseveringman.github.io/z-paste/docs/clipboard` — Clipboard doc, verify `:::note` admonition renders

**Step 3: If site shows 404 or blank**

Check that `website/public/.nojekyll` file exists (prevents GitHub Pages from ignoring `_next/` folder):

```bash
touch website/public/.nojekyll
git add website/public/.nojekyll
git commit -m "fix(docs): add .nojekyll to prevent GitHub Pages from ignoring _next assets"
git push origin main
```

Wait for CI to redeploy and check again.
