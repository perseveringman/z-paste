Z-Paste 剪贴板管理工具 - 技术架构与实现计划

技术栈

• 框架: Electron 33+ / electron-vite
• 前端: React 18 + TypeScript 5
• 样式: Tailwind CSS 3
• 状态管理: Zustand
• 数据库: better-sqlite3 (WAL mode)
• 搜索: Fuse.js (模糊搜索)
• 代码高亮: Shiki (VS Code 同款引擎)
• 动画: framer-motion (控制在 150ms 内)
• ID 生成: nanoid
• 打包: electron-builder

项目结构

z-paste/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 入口：窗口创建、快捷键、托盘
│   │   ├── clipboard/
│   │   │   ├── monitor.ts       # 剪贴板轮询监听 (500ms)
│   │   │   └── detector.ts      # 内容类型识别 (正则/启发式)
│   │   ├── database/
│   │   │   ├── connection.ts    # SQLite 连接 (WAL mode)
│   │   │   ├── schema.ts        # 建表 & 迁移
│   │   │   └── repository.ts    # CRUD 操作
│   │   ├── sync/
│   │   │   └── icloud.ts        # iCloud Drive 读写 & 冲突合并
│   │   ├── window.ts            # Panel 窗口管理
│   │   ├── shortcuts.ts         # 全局快捷键注册
│   │   └── tray.ts              # 系统托盘
│   ├── preload/
│   │   └── index.ts             # contextBridge API 暴露
│   └── renderer/                # React 应用
│       ├── App.tsx
│       ├── main.tsx
│       ├── components/
│       │   ├── Panel/           # 快捷面板
│       │   │   ├── PanelWindow.tsx
│       │   │   ├── SearchBar.tsx
│       │   │   ├── ClipboardList.tsx
│       │   │   └── ClipboardItem.tsx
│       │   ├── Preview/         # 内容预览
│       │   │   ├── CodePreview.tsx
│       │   │   ├── JsonPreview.tsx
│       │   │   ├── ColorPreview.tsx
│       │   │   └── ImagePreview.tsx
│       │   ├── Settings/        # 设置页
│       │   └── Templates/       # 模板管理
│       ├── stores/
│       │   ├── clipboardStore.ts
│       │   └── settingsStore.ts
│       ├── hooks/
│       │   ├── useKeyboard.ts   # 键盘导航
│       │   └── useSearch.ts     # 搜索逻辑
│       └── utils/
│           ├── formatters.ts    # JSON/Base64/URL 转换
│           └── transformers.ts  # 大小写/编码工具
├── resources/                   # 应用图标等静态资源
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
└── package.json

核心架构

mermaid graph

graph TB
    subgraph mainProcess [Main Process]
        ClipMonitor[ClipboardMonitor]
        Detector[ContentDetector]
        DB[SQLite_DB]
        ShortcutMgr[ShortcutManager]
        TrayMgr[TrayManager]
        iCloudSync[iCloudSync]
        WinMgr[WindowManager]
    end
    subgraph rendererProcess [Renderer Process]
        ReactApp[React_App]
        PanelUI[PanelUI]
        SearchEngine[Fuse_Search]
        PreviewEngine[Preview_Engine]
        ZustandStore[Zustand_Store]
    end
    SystemClipboard[macOS_Clipboard] -->|"poll 500ms"| ClipMonitor
    ClipMonitor --> Detector
    Detector -->|classified item| DB
    DB <-->|file export/import| iCloudSync
    iCloudSync <--> iCloudDrive[iCloud_Drive_Folder]
    ShortcutMgr -->|"Shift+Cmd+V"| WinMgr
    WinMgr -->|show/hide| ReactApp
    DB <-->|IPC| ZustandStore
    ZustandStore --> PanelUI
    PanelUI --> SearchEngine
    PanelUI --> PreviewEngine
    PanelUI -->|"paste action via IPC"| mainProcess

数据模型 (SQLite)

-- 剪贴板条目
CREATE TABLE clipboard_items (
  id            TEXT PRIMARY KEY,       -- nanoid
  content       TEXT NOT NULL,          -- 原始内容 (图片存 base64 或文件路径)
  content_type  TEXT NOT NULL,          -- text|code|url|color|image|json|base64|file_path
  content_hash  TEXT UNIQUE NOT NULL,   -- SHA-256 去重
  preview       TEXT,                   -- 截断预览文本
  metadata      TEXT,                   -- JSON: {language, formatted, ...}
  is_favorite   INTEGER DEFAULT 0,
  is_pinned     INTEGER DEFAULT 0,
  source_app    TEXT,                   -- 来源应用 bundle id
  tags          TEXT,                   -- JSON array
  category_id   TEXT,
  created_at    INTEGER NOT NULL,       -- Unix timestamp ms
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_items_created ON clipboard_items(created_at DESC);
CREATE INDEX idx_items_type ON clipboard_items(content_type);
CREATE INDEX idx_items_favorite ON clipboard_items(is_favorite);
-- 分类
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL
);
-- 模板片段
CREATE TABLE templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  content     TEXT NOT NULL,
  category_id TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

关键模块设计

1. 剪贴板监听 (`clipboard/monitor.ts`)

• 主进程使用 setInterval 每 500ms 轮询 electron.clipboard
• 同时检测 readText() 和 readImage()
• 通过 SHA-256 hash 比对去重，避免重复入库
• 检测到新内容 -> ContentDetector 分类 -> 写入 SQLite -> 通知 renderer

2. 内容类型识别 (`clipboard/detector.ts`)

• 基于正则的优先级链式判断：
  • URL: https?://...
  • Color: #[0-9a-f]{3,8}, rgb(a)?(), hsl(a)?()
  • JSON: 尝试 JSON.parse
  • Base64: /^[A-Za-z0-9+/=]{20,}$/ + 解码验证
  • Code: 启发式检测 (含 function, const, import, {, ; 等)
  • File path: /^(\/|~\/|\.\/)/
  • 默认: plain text

3. 快捷面板窗口 (`window.ts`)

• 创建 frameless、transparent、alwaysOnTop 的 BrowserWindow
• Shift+Cmd+V 触发时，获取鼠标位置，将窗口定位到屏幕中央
• 面板尺寸约 680x480，圆角 + 阴影模拟原生 Popover
• 失焦自动隐藏 (blur event)
• 面板内 Escape 关闭

4. 面板 UI 交互流

• 顶部搜索栏：实时输入触发 Fuse.js 模糊匹配
• 列表区：虚拟滚动 (react-window) 支持 2000+ 条目
• 键盘导航：上下箭头选中、Enter 粘贴、数字键 1-9 快速选择
• 右侧预览区：根据 content_type 切换 Preview 组件
• 右键菜单：收藏、删除、编辑、移至分组

5. 粘贴机制

• 用户选中条目 -> IPC 通知主进程 -> 写入系统剪贴板 -> 隐藏面板 -> 模拟 Cmd+V 键事件粘贴到目标应用

6. iCloud 同步 (`sync/icloud.ts`)

• 同步目录: ~/Library/Mobile Documents/com~apple~CloudDocs/ZPaste/
• 策略: 定时(每 5 分钟) + 数据变更触发，导出增量 JSON 变更日志
• 冲突检测: 基于 updated_at 时间戳，最新写入优先，冲突时保留双方并标记
• 首次同步: 全量导出/导入 + 按 content_hash 去重合并

7. 主题与样式

• Tailwind CSS 暗色/亮色主题，跟随 macOS 系统 prefers-color-scheme
• 毛玻璃效果: Electron vibrancy 或 backgroundMaterial 属性
• 动画 < 150ms，使用 framer-motion 的 spring 配置

分阶段实施

Phase 1: 项目脚手架 + 核心剪贴板功能 (2 周)

• electron-vite 项目初始化 + React + Tailwind 配置
• SQLite 数据库建表 + CRUD
• 剪贴板轮询监听 + 内容去重
• 内容类型自动识别
• 快捷面板窗口 (Shift+Cmd+V) + 基础列表 UI
• 搜索 (Fuse.js 模糊匹配) + 键盘导航
• 粘贴到目标应用
• 系统托盘 + 开机自启

Phase 2: 开发者功能 + 效率工具 (1.5 周)

• Shiki 代码高亮预览
• JSON 格式化/校验 + Base64 解码
• 颜色值预览 (色块渲染)
• URL/文本快速转换工具
• 收藏/置顶管理
• 分类/标签管理
• 序列粘贴 + 快速编辑
• 模板片段 CRUD

Phase 3: iCloud 同步 + 打磨 (1.5 周)

• iCloud Drive 文件同步 + 冲突合并
• 本地加密存储 (AES-256)
• 暗色/亮色主题自适应
• 引导页 + 设置页
• electron-builder 打包 + DMG 签名
• 性能优化 (虚拟滚动、图片懒加载、内存管控 < 120MB)