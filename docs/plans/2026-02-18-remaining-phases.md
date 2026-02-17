# Z-Paste 剩余阶段实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 Phase 2（开发者功能 + 效率工具）和 Phase 3（iCloud 同步 + 打磨），将 Z-Paste 从 MVP 推进到完整产品。

**Architecture:** 在 Phase 1 已完成的 electron-vite + React 18 + Tailwind + SQLite 基础上，逐步添加预览组件、工具函数、模板系统、设置页、iCloud 同步层、主题和性能优化。

**Tech Stack:** Shiki（代码高亮）、framer-motion（动画）、react-window（虚拟滚动）、crypto（AES-256 加密）

---

## Phase 1 完成状态

以下模块已实现，后续任务基于此构建：

| 模块 | 文件 | 状态 |
|------|------|------|
| 项目脚手架 | package.json, electron.vite.config.ts, tsconfig.* | ✅ |
| SQLite 数据库 | src/main/database/{connection,schema,repository}.ts | ✅ |
| 剪贴板监听 + 去重 | src/main/clipboard/{monitor,detector}.ts | ✅ |
| 快捷面板窗口 | src/main/window.ts, src/main/shortcuts.ts | ✅ |
| 基础列表 UI | src/renderer/src/components/Panel/*.tsx | ✅ |
| 搜索 + 键盘导航 | src/renderer/src/hooks/{useSearch,useKeyboard}.ts | ✅ |
| 粘贴机制 | src/main/index.ts (IPC pasteItem) | ✅ |
| 系统托盘 | src/main/tray.ts | ✅ |
| Zustand 状态管理 | src/renderer/src/stores/clipboardStore.ts | ✅ |

---

## Phase 2: 开发者功能 + 效率工具（1.5 周）

### Task 1: 安装 Phase 2 依赖

**Files:**
- Modify: `package.json`
- Modify: `electron.vite.config.ts`

**Step 1: 安装新依赖**

```bash
npm install shiki framer-motion react-window
npm install -D @types/react-window
```

**Step 2: 更新 electron.vite.config.ts**

在 renderer 配置中确保 shiki 正常工作（可能需要处理 WASM 加载）。

**Step 3: 验证安装**

```bash
npx electron-vite build
```

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: add phase 2 dependencies (shiki, framer-motion, react-window)"
```

---

### Task 2: 代码高亮预览组件（Shiki）

**Files:**
- Create: `src/renderer/src/components/Preview/CodePreview.tsx`
- Create: `src/renderer/src/components/Preview/PreviewPanel.tsx`
- Modify: `src/renderer/src/components/Panel/PanelWindow.tsx` — 添加右侧预览区

**需求:**
- 使用 Shiki 引擎渲染代码高亮（支持 10+ 语言：TypeScript, JavaScript, Python, Rust, Go, Java, HTML, CSS, SQL, Shell, JSON）
- 根据 `metadata.language` 选择语言
- 暗色主题（vitesse-dark 或类似）
- 预览区在面板右侧，选中代码类型条目时展示

**实现要点:**
```tsx
// CodePreview.tsx
import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'

interface Props {
  code: string
  language: string
}

export default function CodePreview({ code, language }: Props) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    codeToHtml(code, { lang: language, theme: 'vitesse-dark' })
      .then(setHtml)
      .catch(() => setHtml(`<pre>${code}</pre>`))
  }, [code, language])

  return <div dangerouslySetInnerHTML={{ __html: html }} className="text-xs overflow-auto p-3" />
}
```

**PreviewPanel.tsx** 根据当前选中 item 的 `content_type` 切换渲染：
- `code` → CodePreview
- `json` → JsonPreview
- `color` → ColorPreview
- `image` → ImagePreview
- 其他 → 纯文本预览

**PanelWindow.tsx** 布局改为左右分栏：左侧列表（flex-1, max-w-[55%]），右侧预览（flex-1）。

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Shiki code highlight preview"
```

---

### Task 3: JSON 格式化/校验 + Base64 解码

**Files:**
- Create: `src/renderer/src/components/Preview/JsonPreview.tsx`
- Create: `src/renderer/src/utils/formatters.ts`

**需求:**
- JSON 自动格式化（2 空格缩进）+ 语法高亮
- JSON 校验：有效时显示格式化结果，无效时标红错误位置
- Base64 一键解码并显示解码后内容
- 工具栏按钮：复制格式化后的 JSON / 复制解码后的 Base64

**formatters.ts 核心函数:**
```typescript
export function formatJSON(input: string): { formatted: string; valid: boolean; error?: string }
export function decodeBase64(input: string): { decoded: string; valid: boolean }
export function encodeBase64(input: string): string
export function encodeURL(input: string): string
export function decodeURL(input: string): string
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add JSON formatter and Base64 decoder"
```

---

### Task 4: 颜色值预览

**Files:**
- Create: `src/renderer/src/components/Preview/ColorPreview.tsx`

**需求:**
- 解析颜色值：HEX (#RGB, #RRGGBB, #RRGGBBAA)、rgb()、rgba()、hsl()、hsla()
- 渲染色块 + 各格式互转显示
- 点击色值复制到剪贴板

**实现要点:**
```tsx
// 色块展示 + 格式互转
<div className="w-20 h-20 rounded-lg" style={{ backgroundColor: colorValue }} />
<div className="text-xs text-gray-400">
  <p>HEX: {hexValue}</p>
  <p>RGB: {rgbValue}</p>
  <p>HSL: {hslValue}</p>
</div>
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add color value preview with format conversion"
```

---

### Task 5: 图片预览

**Files:**
- Create: `src/renderer/src/components/Preview/ImagePreview.tsx`

**需求:**
- base64 图片渲染为 `<img>` 标签
- 显示尺寸信息（来自 metadata）
- 图片过大时仅显示缩略图 + "点击查看原图"

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add image preview component"
```

---

### Task 6: URL/文本快速转换工具

**Files:**
- Create: `src/renderer/src/utils/transformers.ts`
- Modify: `src/renderer/src/components/Preview/PreviewPanel.tsx` — 添加工具栏

**需求:**
- 大小写切换：UPPER / lower / Title Case / camelCase
- URL encode/decode
- 去除首尾空格 / 去除所有空格
- 工具栏按钮显示在预览区底部

**transformers.ts 核心函数:**
```typescript
export function toUpperCase(s: string): string
export function toLowerCase(s: string): string
export function toTitleCase(s: string): string
export function toCamelCase(s: string): string
export function trimWhitespace(s: string): string
export function removeAllWhitespace(s: string): string
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add text transformation utilities"
```

---

### Task 7: 收藏/置顶增强 + 右键菜单

**Files:**
- Modify: `src/renderer/src/components/Panel/ClipboardItem.tsx` — 添加右键菜单
- Modify: `src/renderer/src/components/Panel/ClipboardList.tsx` — 收藏/置顶筛选 Tab
- Modify: `src/renderer/src/stores/clipboardStore.ts` — 添加视图切换状态

**需求:**
- 列表顶部添加 Tab 切换：全部 / 收藏 / 按类型筛选
- 右键菜单：收藏 / 置顶 / 删除 / 编辑 / 移至分类
- 收藏项在列表中显示 ★ 标记

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add context menu and filter tabs"
```

---

### Task 8: 分类/标签管理

**Files:**
- Create: `src/renderer/src/components/Panel/CategoryFilter.tsx`
- Modify: `src/main/database/repository.ts` — 添加 categories CRUD
- Modify: `src/preload/index.ts` — 添加 categories IPC
- Modify: `src/main/index.ts` — 注册 categories IPC handlers

**需求:**
- 用户可创建自定义分类（名称 + 颜色）
- 将剪贴板条目移至分类
- 面板侧边栏或顶部可按分类筛选
- 分类 CRUD 通过 IPC 桥接

**数据库操作:**
```typescript
// repository.ts 新增
export function getCategories(): Category[]
export function createCategory(name: string, color: string): Category
export function deleteCategory(id: string): void
export function updateItemCategory(itemId: string, categoryId: string | null): void
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add category management"
```

---

### Task 9: 序列粘贴 + 快速编辑

**Files:**
- Modify: `src/renderer/src/stores/clipboardStore.ts` — 添加 queue 状态
- Modify: `src/renderer/src/hooks/useKeyboard.ts` — 支持多选
- Create: `src/renderer/src/components/Panel/QuickEdit.tsx`
- Modify: `src/main/index.ts` — 添加 pasteQueue IPC

**需求:**

**序列粘贴：**
- 用户可通过 Shift+Enter 或 Ctrl+Click 选中多个条目
- 按顺序逐个粘贴（每次粘贴后等待 300ms 再粘贴下一个）
- 状态栏显示当前队列：如"已选择 3 项"

**快速编辑：**
- 双击条目进入编辑模式
- 显示 textarea 覆盖预览区，可修改内容
- Enter 保存并粘贴，Esc 取消

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add sequential paste and quick edit"
```

---

### Task 10: 模板片段 CRUD

**Files:**
- Create: `src/renderer/src/components/Templates/TemplateList.tsx`
- Create: `src/renderer/src/components/Templates/TemplateEditor.tsx`
- Modify: `src/main/database/repository.ts` — 添加 templates CRUD
- Modify: `src/preload/index.ts` — 添加 templates IPC
- Modify: `src/main/index.ts` — 注册 templates IPC handlers
- Modify: `src/renderer/src/stores/clipboardStore.ts` — 或新建 `templateStore.ts`

**需求:**
- 模板列表视图（面板可切换到模板 Tab）
- 新建模板：名称 + 内容 + 可选分类
- 编辑 / 删除模板
- 点击模板直接粘贴
- 模板支持排序（拖拽或手动调序）

**数据库操作:**
```typescript
export function getTemplates(): Template[]
export function createTemplate(name: string, content: string, categoryId?: string): Template
export function updateTemplate(id: string, updates: Partial<Template>): void
export function deleteTemplate(id: string): void
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add template snippets CRUD"
```

---

## Phase 3: iCloud 同步 + 打磨（1.5 周）

### Task 11: iCloud Drive 文件同步

**Files:**
- Create: `src/main/sync/icloud.ts`
- Modify: `src/main/index.ts` — 启动同步服务

**需求:**

**同步目录:** `~/Library/Mobile Documents/com~apple~CloudDocs/ZPaste/`

**同步策略：**
- 定时同步（每 5 分钟） + 数据变更触发
- 导出增量 JSON 变更日志（不是直接同步 SQLite 文件）
- 每条变更记录包含：操作类型（add/update/delete）、item 数据、时间戳

**冲突检测与合并：**
- 基于 `updated_at` 时间戳，最新写入优先
- 冲突时保留双方，标记为 `conflict`
- 首次同步：全量导出 + 按 `content_hash` 去重合并

**核心类结构:**
```typescript
export class iCloudSync {
  private syncDir: string
  private syncInterval: ReturnType<typeof setInterval> | null

  start(): void          // 启动定时同步
  stop(): void           // 停止同步
  exportChanges(): void  // 导出本地变更到 JSON 文件
  importChanges(): void  // 读取远端变更并合并
  fullSync(): void       // 首次全量同步
  resolveConflict(localItem, remoteItem): ClipboardItem
}
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add iCloud Drive sync with conflict resolution"
```

---

### Task 12: 本地加密存储（AES-256）

**Files:**
- Create: `src/main/security/encryption.ts`
- Modify: `src/main/database/repository.ts` — 可选加密读写
- Modify: `src/main/sync/icloud.ts` — 同步数据加密

**需求:**
- 用户可在设置页开启加密
- 加密算法：AES-256-GCM
- 密钥由用户密码 + salt 通过 PBKDF2 派生
- 加密范围：clipboard_items.content 字段
- 同步文件也使用同一密钥加密

**核心函数:**
```typescript
export function deriveKey(password: string, salt: Buffer): Buffer
export function encrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string; tag: string }
export function decrypt(ciphertext: string, iv: string, tag: string, key: Buffer): string
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add AES-256-GCM encryption for local storage"
```

---

### Task 13: 暗色/亮色主题自适应

**Files:**
- Create: `src/renderer/src/stores/settingsStore.ts`
- Modify: `src/renderer/src/App.tsx` — 添加主题 provider
- Modify: `tailwind.config.js` — 确认 `darkMode: 'media'` 配置
- Modify: `src/renderer/src/assets/main.css` — 添加亮色主题变量
- Modify: `src/renderer/src/components/Panel/PanelWindow.tsx` — 使用主题 class

**需求:**
- 跟随 macOS 系统 `prefers-color-scheme` 自动切换
- 暗色：深灰背景 (#1e1e1e) + 白色文字
- 亮色：白色背景 + 深色文字
- Electron vibrancy 效果根据主题调整
- settingsStore 保存用户偏好（auto/dark/light）

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add dark/light theme with system preference detection"
```

---

### Task 14: 设置页

**Files:**
- Create: `src/renderer/src/components/Settings/SettingsPage.tsx`
- Create: `src/renderer/src/components/Settings/SettingsItem.tsx`
- Modify: `src/renderer/src/App.tsx` — 添加设置页路由/切换
- Modify: `src/main/index.ts` — 添加设置相关 IPC

**需求:**

**设置项：**
- 通用：开机自启开关、历史保留时长（1天/7天/30天/永久）、最大记录数（500/1000/2000）
- 快捷键：自定义面板唤起快捷键
- 同步：iCloud 同步开关、立即同步按钮、同步状态显示
- 隐私：加密开关、一键清空所有数据
- 主题：自动/暗色/亮色
- 关于：版本号、GitHub 链接

**UI：**
- 全屏设置页（替换面板内容）
- 左侧导航 + 右侧设置项
- 通过面板底部齿轮图标或 Cmd+, 打开

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add settings page"
```

---

### Task 15: 引导页（Onboarding）

**Files:**
- Create: `src/renderer/src/components/Onboarding/OnboardingPage.tsx`
- Modify: `src/renderer/src/stores/settingsStore.ts` — 添加 `hasCompletedOnboarding` 标志
- Modify: `src/renderer/src/App.tsx` — 首次启动显示引导页

**需求:**
- 3-4 步引导流程：
  1. 欢迎 + 功能介绍
  2. 核心快捷键 (Shift+Cmd+V) 动画演示
  3. 隐私说明 + iCloud 同步选择
  4. 完成 + 开始使用
- 底部进度点 + 下一步/跳过按钮
- 引导完成后设置 `hasCompletedOnboarding = true`，不再显示

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add onboarding flow"
```

---

### Task 16: electron-builder 打包 + DMG

**Files:**
- Modify: `electron-builder.yml` — 完善签名和公证配置
- Create: `build/entitlements.mac.plist`
- Create: `resources/icon.icns` — 应用图标
- Modify: `package.json` — 确认 build scripts

**需求:**
- 生成 DMG 安装包（arm64 + x64 universal）
- macOS entitlements：剪贴板访问、iCloud 容器
- 应用图标 1024x1024 icns
- LSUIElement = true（无 Dock 图标，仅托盘）

**entitlements.mac.plist:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
</dict>
</plist>
```

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: configure electron-builder for DMG packaging"
```

---

### Task 17: 性能优化

**Files:**
- Modify: `src/renderer/src/components/Panel/ClipboardList.tsx` — 使用 react-window 虚拟滚动
- Modify: `src/renderer/src/components/Preview/ImagePreview.tsx` — 图片懒加载
- Modify: `src/main/clipboard/monitor.ts` — 大图片仅存路径
- Modify: `src/main/database/repository.ts` — 自动清理超限记录

**需求:**

**虚拟滚动（react-window）：**
```tsx
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={400}
  itemCount={items.length}
  itemSize={60}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ClipboardItemRow item={items[index]} index={index} isSelected={index === selectedIndex} />
    </div>
  )}
</FixedSizeList>
```

**图片懒加载：**
- 列表中图片仅显示占位符 + 尺寸信息
- 选中时才加载完整预览

**内存管控：**
- 超过 2000 条时自动删除最旧的非收藏/非置顶记录
- 超大图片（> 5MB）仅保存文件路径，不存 base64
- 目标：内存占用 < 120MB

**自动清理：**
```typescript
// repository.ts
export function autoCleanup(maxItems: number = 2000): void {
  const count = getItemCount()
  if (count > maxItems) {
    db.prepare(`
      DELETE FROM clipboard_items
      WHERE id IN (
        SELECT id FROM clipboard_items
        WHERE is_favorite = 0 AND is_pinned = 0
        ORDER BY updated_at ASC
        LIMIT ?
      )
    `).run(count - maxItems)
  }
}
```

**Step 5: Commit**

```bash
git add -A && git commit -m "perf: add virtual scrolling, lazy loading, and auto-cleanup"
```

---

### Task 18: 动画优化（framer-motion）

**Files:**
- Modify: `src/renderer/src/components/Panel/PanelWindow.tsx` — 面板出入动画
- Modify: `src/renderer/src/components/Panel/ClipboardItem.tsx` — 列表项动画

**需求:**
- 面板弹出/收起动画：spring 配置，总时长 < 150ms
- 列表项新增时 slide-in 动画
- 删除时 fade-out 动画
- 使用 `framer-motion` 的 `AnimatePresence` + `motion.div`

```tsx
import { motion, AnimatePresence } from 'framer-motion'

// 面板动画
<motion.div
  initial={{ opacity: 0, scale: 0.95, y: 10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: 10 }}
  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
>
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add framer-motion animations (< 150ms)"
```

---

## 未创建文件清单（对照 README 目标结构）

| 文件路径 | 所属 Task | 状态 |
|----------|----------|------|
| `src/renderer/src/components/Preview/CodePreview.tsx` | Task 2 | ⬜ |
| `src/renderer/src/components/Preview/PreviewPanel.tsx` | Task 2 | ⬜ |
| `src/renderer/src/components/Preview/JsonPreview.tsx` | Task 3 | ⬜ |
| `src/renderer/src/components/Preview/ColorPreview.tsx` | Task 4 | ⬜ |
| `src/renderer/src/components/Preview/ImagePreview.tsx` | Task 5 | ⬜ |
| `src/renderer/src/utils/formatters.ts` | Task 3 | ⬜ |
| `src/renderer/src/utils/transformers.ts` | Task 6 | ⬜ |
| `src/renderer/src/components/Panel/CategoryFilter.tsx` | Task 8 | ⬜ |
| `src/renderer/src/components/Panel/QuickEdit.tsx` | Task 9 | ⬜ |
| `src/renderer/src/components/Templates/TemplateList.tsx` | Task 10 | ⬜ |
| `src/renderer/src/components/Templates/TemplateEditor.tsx` | Task 10 | ⬜ |
| `src/main/sync/icloud.ts` | Task 11 | ⬜ |
| `src/main/security/encryption.ts` | Task 12 | ⬜ |
| `src/renderer/src/stores/settingsStore.ts` | Task 13 | ⬜ |
| `src/renderer/src/components/Settings/SettingsPage.tsx` | Task 14 | ⬜ |
| `src/renderer/src/components/Settings/SettingsItem.tsx` | Task 14 | ⬜ |
| `src/renderer/src/components/Onboarding/OnboardingPage.tsx` | Task 15 | ⬜ |
| `build/entitlements.mac.plist` | Task 16 | ⬜ |
| `resources/icon.icns` | Task 16 | ⬜ |

---

## 执行顺序建议

```
Phase 2（按依赖关系排列）:
  Task 1  → 安装依赖（前置条件）
  Task 2  → 代码高亮（独立）
  Task 3  → JSON/Base64（独立）
  Task 4  → 颜色预览（独立）
  Task 5  → 图片预览（独立）
  ↑ Task 2-5 可并行开发 ↑
  Task 6  → 文本转换（依赖 PreviewPanel）
  Task 7  → 右键菜单 + 筛选（独立）
  Task 8  → 分类管理（独立）
  Task 9  → 序列粘贴 + 快速编辑（独立）
  Task 10 → 模板片段（独立）

Phase 3（按依赖关系排列）:
  Task 13 → 主题（前置，settingsStore 被后续依赖）
  Task 14 → 设置页（依赖 settingsStore）
  Task 15 → 引导页（依赖 settingsStore）
  Task 11 → iCloud 同步（独立，需要设置页联动）
  Task 12 → 加密存储（独立，需要设置页联动）
  Task 16 → 打包配置（独立）
  Task 17 → 性能优化（独立）
  Task 18 → 动画优化（独立）
```

---

## 验证命令

每个 Task 完成后运行：
```bash
# 类型检查
npm run typecheck

# 构建验证
npx electron-vite build

# 运行验证
npm run dev
```

最终交付验证：
```bash
# 打包 DMG
npm run build:mac
```
