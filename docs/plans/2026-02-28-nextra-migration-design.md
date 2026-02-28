# Nextra 4 迁移设计文档

**日期**：2026-02-28
**状态**：已批准

## 背景

当前文档站基于 Docusaurus 3.9.2，部署到 GitHub Pages。迁移到 Nextra 4（Next.js App Router）以获得更简洁的架构和更好的开发体验。

## 目标

- 将 `website/` 目录从 Docusaurus 完整替换为 Nextra 4
- 保留 Landing Page（Hero + 功能卡片）
- 保留全部 6 篇文档内容
- 继续部署到 `https://perseveringman.github.io/z-paste/`
- CI workflow 最小改动

## 方案

**直接替换（方案 A）**：删除整个 Docusaurus 站点，在 `website/` 下重新搭 Nextra 4 项目。文档内容迁移到 `content/docs/`，Landing Page 改写为 `app/page.tsx`。

## 目录结构

```
website/
├── app/
│   ├── layout.tsx               # 根布局，包含 nextra-theme-docs Layout
│   ├── page.tsx                 # Landing Page（Hero + 功能卡片）
│   └── docs/
│       └── [[...slug]]/
│           └── page.tsx         # Nextra 动态文档路由
├── content/
│   └── docs/
│       ├── _meta.js             # 侧边栏配置
│       ├── installation.md
│       ├── clipboard.md
│       ├── vault.md
│       ├── shortcuts.md
│       ├── faq.md
│       └── changelog.md
├── mdx-components.tsx           # MDX 组件注册（Nextra 4 必须）
├── next.config.ts               # withNextra() + basePath + static export
├── theme.config.tsx             # 导航栏、Logo、Footer
├── public/
│   └── img/                     # 迁移自 static/img/
├── package.json
└── tsconfig.json
```

## 关键配置

### next.config.ts

```ts
const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

module.exports = withNextra({
  output: 'export',
  basePath: '/z-paste',
  images: { unoptimized: true },
})
```

### theme.config.tsx

- Logo：Z-Paste 文字 + logo 图片
- 导航栏：`使用文档`、`GitHub`、`下载`
- Footer：版权信息
- 默认暗色主题

### content/docs/_meta.js

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

### .md 文件改动

移除 frontmatter 中的 `id` 和 `sidebar_position` 字段，保留 `title`。内容不变。

## CI 变更

`.github/workflows/docs.yml` 只需修改一处：

```yaml
# 改前
publish_dir: ./website/build

# 改后
publish_dir: ./website/out
```

## 不保留内容

- `website/blog/`（Docusaurus 默认示例）
- `website/src/`（组件逻辑迁入 `app/page.tsx`）
- `website/docusaurus.config.ts`、`website/sidebars.ts`
- `website/.docusaurus/`
- `website/postcss.config.js`（Nextra 4 自带 Tailwind，无需手动配置）
