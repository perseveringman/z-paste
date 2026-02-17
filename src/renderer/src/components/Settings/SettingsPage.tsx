import { useState, useCallback } from 'react'
import { useSettingsStore, ThemeMode } from '../../stores/settingsStore'
import SettingsItem, { SettingsToggle, SettingsSelect } from './SettingsItem'

type SettingsSection = 'general' | 'shortcuts' | 'sync' | 'privacy' | 'theme' | 'about'

const SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: 'general', label: '通用', icon: '⚙️' },
  { id: 'shortcuts', label: '快捷键', icon: '⌨️' },
  { id: 'sync', label: '同步', icon: '☁️' },
  { id: 'privacy', label: '隐私', icon: '🔒' },
  { id: 'theme', label: '主题', icon: '🎨' },
  { id: 'about', label: '关于', icon: 'ℹ️' }
]

interface Props {
  onClose: () => void
}

export default function SettingsPage({ onClose }: Props): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200">设置</h1>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          ✕ 关闭
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left nav */}
        <div className="w-[140px] shrink-0 border-r border-black/5 dark:border-white/5 py-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center gap-2 ${
                activeSection === section.id
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <SectionContent section={activeSection} onClose={onClose} />
        </div>
      </div>
    </div>
  )
}

function SectionContent({
  section,
  onClose: _onClose
}: {
  section: SettingsSection
  onClose: () => void
}): React.JSX.Element {
  switch (section) {
    case 'general':
      return <GeneralSection />
    case 'shortcuts':
      return <ShortcutsSection />
    case 'sync':
      return <SyncSection />
    case 'privacy':
      return <PrivacySection />
    case 'theme':
      return <ThemeSection />
    case 'about':
      return <AboutSection />
    default:
      return <GeneralSection />
  }
}

function SectionTitle({ title }: { title: string }): React.JSX.Element {
  return (
    <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
      {title}
    </h2>
  )
}

function Divider(): React.JSX.Element {
  return <div className="h-px bg-black/5 dark:bg-white/5 my-1" />
}

function GeneralSection(): React.JSX.Element {
  const {
    launchAtLogin,
    setLaunchAtLogin,
    historyRetention,
    setHistoryRetention,
    maxItems,
    setMaxItems
  } = useSettingsStore()

  return (
    <div>
      <SectionTitle title="通用设置" />
      <SettingsItem label="开机自启" description="登录 macOS 时自动启动 Z-Paste">
        <SettingsToggle
          value={launchAtLogin}
          onChange={(v) => {
            setLaunchAtLogin(v)
            window.api.setLaunchAtLogin?.(v)
          }}
        />
      </SettingsItem>
      <Divider />
      <SettingsItem label="历史保留时长" description="超过时间的非收藏/非置顶记录将自动清理">
        <SettingsSelect
          value={historyRetention}
          options={[
            { label: '1 天', value: 1 },
            { label: '7 天', value: 7 },
            { label: '30 天', value: 30 },
            { label: '永久', value: 0 }
          ]}
          onChange={setHistoryRetention}
        />
      </SettingsItem>
      <Divider />
      <SettingsItem label="最大记录数" description="超过限制时自动删除最旧的非收藏记录">
        <SettingsSelect
          value={maxItems}
          options={[
            { label: '500', value: 500 },
            { label: '1000', value: 1000 },
            { label: '2000', value: 2000 }
          ]}
          onChange={setMaxItems}
        />
      </SettingsItem>
    </div>
  )
}

function ShortcutsSection(): React.JSX.Element {
  const { customShortcut } = useSettingsStore()

  return (
    <div>
      <SectionTitle title="快捷键" />
      <SettingsItem label="唤起面板" description="全局快捷键，唤起/隐藏剪贴板面板">
        <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
          {customShortcut.replace('CommandOrControl', '⌘').replace('Shift', '⇧').replace('+', ' ')}
        </span>
      </SettingsItem>
      <p className="text-[10px] text-gray-400 mt-2">
        自定义快捷键功能将在后续版本中开放
      </p>
    </div>
  )
}

function SyncSection(): React.JSX.Element {
  const { iCloudSync, setICloudSync } = useSettingsStore()
  const [syncing, setSyncing] = useState(false)

  const handleSyncNow = useCallback(async () => {
    setSyncing(true)
    try {
      await window.api.syncNow?.()
    } catch {
      // ignore
    }
    setTimeout(() => setSyncing(false), 1500)
  }, [])

  return (
    <div>
      <SectionTitle title="iCloud 同步" />
      <SettingsItem label="启用 iCloud 同步" description="通过 iCloud Drive 在多台 Mac 间同步剪贴板数据">
        <SettingsToggle value={iCloudSync} onChange={setICloudSync} />
      </SettingsItem>
      <Divider />
      <SettingsItem label="立即同步" description="手动触发一次同步">
        <button
          onClick={handleSyncNow}
          disabled={!iCloudSync || syncing}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
            iCloudSync && !syncing
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {syncing ? '同步中...' : '同步'}
        </button>
      </SettingsItem>
    </div>
  )
}

function PrivacySection(): React.JSX.Element {
  const { encryptionEnabled, setEncryptionEnabled } = useSettingsStore()
  const [confirming, setConfirming] = useState(false)

  const handleClearAll = useCallback(async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    await window.api.clearAll()
    setConfirming(false)
  }, [confirming])

  return (
    <div>
      <SectionTitle title="隐私与安全" />
      <SettingsItem label="加密存储" description="使用 AES-256-GCM 加密剪贴板内容（需设置密码）">
        <SettingsToggle value={encryptionEnabled} onChange={setEncryptionEnabled} />
      </SettingsItem>
      <Divider />
      <SettingsItem label="清空所有数据" description="删除所有剪贴板记录（不可恢复）">
        <button
          onClick={handleClearAll}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
            confirming
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
          }`}
        >
          {confirming ? '确认清空？' : '清空'}
        </button>
      </SettingsItem>
    </div>
  )
}

function ThemeSection(): React.JSX.Element {
  const { theme, setTheme } = useSettingsStore()

  const themes: { value: ThemeMode; label: string; desc: string }[] = [
    { value: 'auto', label: '自动', desc: '跟随系统偏好' },
    { value: 'dark', label: '暗色', desc: '深色主题' },
    { value: 'light', label: '亮色', desc: '浅色主题' }
  ]

  return (
    <div>
      <SectionTitle title="主题" />
      <div className="flex gap-2">
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
              theme === t.value
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="text-lg">
              {t.value === 'auto' ? '🌗' : t.value === 'dark' ? '🌙' : '☀️'}
            </span>
            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{t.label}</span>
            <span className="text-[10px] text-gray-500">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function AboutSection(): React.JSX.Element {
  return (
    <div>
      <SectionTitle title="关于" />
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
            Z
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Z-Paste</p>
            <p className="text-xs text-gray-500">版本 1.0.0</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Mac 剪贴板管理器 — 让复制粘贴更高效
        </p>
        <a
          href="https://github.com/perseveringman/z-paste"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
        >
          GitHub →
        </a>
      </div>
    </div>
  )
}
