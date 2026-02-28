# stash 文档静态站设计文档

日期：2026-02-28

## 背景

stash 是一个 macOS 剪切板管理 + 密码保险箱 Electron 应用（v1.0.1）。本文档描述其官方文档站的设计方案，目标是为普通用户提供中文使用说明，并通过 GitHub Pages 对外发布。

## 目标受众

普通 macOS 用户，非开发者，需要了解如何安装、使用剪切板管理和密码保险箱功能。

## 技术方案

**框架**：Docusaurus（React/Next.js 驱动，设计精美，适合产品展示类站点）

**目录结构**：

```
z-paste/
├── website/                      # Docusaurus 文档站根目录
│   ├── docs/                     # Markdown 文档页面
│   │   ├── installation.md       # 安装指南
│   │   ├── clipboard.md          # 剪切板管理功能指南
│   │   ├── vault.md              # 密码保险箱功能指南
│   │   ├── shortcuts.md          # 快捷键参考
│   │   ├── faq.md                # 常见问题
│   │   └── changelog.md          # 更新日志
│   ├── src/
│   │   └── pages/
│   │       └── index.tsx         # 产品首页（Hero + 功能亮点）
│   ├── static/                   # 截图、logo 等静态资源
│   ├── docusaurus.config.ts
│   ├── sidebars.ts
│   └── package.json
└── .github/
    └── workflows/
        └── docs.yml              # GitHub Actions 自动构建部署
```

## 页面结构

| 页面 | 路由 | 内容 |
|---|---|---|
| 产品首页 | `/` | Hero 区域 + 功能亮点卡片 + 下载按钮 |
| 安装指南 | `/docs/installation` | 系统要求、下载安装步骤、首次启动 |
| 剪切板管理 | `/docs/clipboard` | 基本操作、搜索、收藏、序列粘贴等 |
| 密码保险箱 | `/docs/vault` | 设置主密码、存储条目、TOTP、Touch ID |
| 快捷键参考 | `/docs/shortcuts` | 完整快捷键表格 |
| FAQ | `/docs/faq` | 常见问题与解答 |
| 更新日志 | `/docs/changelog` | 版本历史 |

## 部署方案

- **触发条件**：`website/` 目录有改动推送到 `main` 分支
- **构建步骤**：`npm install` → `docusaurus build`
- **部署目标**：推送构建产物到 `gh-pages` 分支根目录
- **GitHub Pages 配置**：从 `gh-pages` 分支读取

## 视觉风格

- 默认暗色主题（`colorMode.defaultMode: 'dark'`），与 macOS 深色模式呼应
- 使用 Docusaurus 默认 Classic 主题
- 首页使用 React 组件实现产品展示风格（Hero Banner + 特性卡片）
