import { useState, useCallback } from 'react'
import { useSettingsStore, ThemeMode } from '../../stores/settingsStore'
import { Switch } from '../ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import {
  Settings,
  Keyboard,
  Cloud,
  Lock,
  Palette,
  Info,
  Moon,
  Sun,
  Monitor,
  Trash2,
  RefreshCw
} from 'lucide-react'

type SettingsSection = 'general' | 'shortcuts' | 'sync' | 'privacy' | 'theme' | 'about'

const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: '通用', icon: Settings },
  { id: 'shortcuts', label: '快捷键', icon: Keyboard },
  { id: 'sync', label: '同步', icon: Cloud },
  { id: 'privacy', label: '隐私', icon: Lock },
  { id: 'theme', label: '主题', icon: Palette },
  { id: 'about', label: '关于', icon: Info }
]

interface Props {
  onClose: () => void
}

export default function SettingsPage({ onClose }: Props): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-lg font-semibold">设置</h1>
        <Button variant="ghost" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left nav */}
        <div className="w-48 shrink-0 border-r py-4">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-6 py-2 text-sm transition-colors flex items-center gap-3 ${
                activeSection === section.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <SectionContent section={activeSection} />
        </div>
      </div>
    </div>
  )
}

function SectionContent({ section }: { section: SettingsSection }): React.JSX.Element {
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
    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
      {title}
    </h2>
  )
}

function SettingsItem({
  label,
  description,
  children
}: {
  label: string
  description?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
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
        <Switch
          checked={launchAtLogin}
          onCheckedChange={(v) => {
            setLaunchAtLogin(v)
            window.api.setLaunchAtLogin?.(v)
          }}
        />
      </SettingsItem>
      <Separator />
      <SettingsItem label="历史保留时长" description="超过时间的非收藏/非置顶记录将自动清理">
        <Select
          value={String(historyRetention)}
          onValueChange={(v) => setHistoryRetention(Number(v))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 天</SelectItem>
            <SelectItem value="7">7 天</SelectItem>
            <SelectItem value="30">30 天</SelectItem>
            <SelectItem value="0">永久</SelectItem>
          </SelectContent>
        </Select>
      </SettingsItem>
      <Separator />
      <SettingsItem label="最大记录数" description="超过限制时自动删除最旧的非收藏记录">
        <Select value={String(maxItems)} onValueChange={(v) => setMaxItems(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="500">500</SelectItem>
            <SelectItem value="1000">1000</SelectItem>
            <SelectItem value="2000">2000</SelectItem>
          </SelectContent>
        </Select>
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
        <div className="bg-muted px-3 py-1.5 rounded-md text-sm font-mono border">
          {customShortcut.replace('CommandOrControl', '⌘').replace('Shift', '⇧').replace('+', ' ')}
        </div>
      </SettingsItem>
      <p className="text-xs text-muted-foreground mt-4">
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
        <Switch checked={iCloudSync} onCheckedChange={setICloudSync} />
      </SettingsItem>
      <Separator />
      <SettingsItem label="立即同步" description="手动触发一次同步">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncNow}
          disabled={!iCloudSync || syncing}
        >
          {syncing ? (
            <>
              <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              同步中...
            </>
          ) : (
            '同步'
          )}
        </Button>
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
        <Switch checked={encryptionEnabled} onCheckedChange={setEncryptionEnabled} />
      </SettingsItem>
      <Separator />
      <SettingsItem label="清空所有数据" description="删除所有剪贴板记录（不可恢复）">
        <Button
          variant={confirming ? 'destructive' : 'outline'}
          size="sm"
          onClick={handleClearAll}
          className={confirming ? '' : 'text-destructive hover:text-destructive'}
        >
          {confirming ? (
            '确认清空？'
          ) : (
            <>
              <Trash2 className="w-3 h-3 mr-2" />
              清空
            </>
          )}
        </Button>
      </SettingsItem>
    </div>
  )
}

function ThemeSection(): React.JSX.Element {
  const { theme, setTheme } = useSettingsStore()

  const themes: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
    { value: 'auto', label: '自动', icon: Monitor },
    { value: 'dark', label: '暗色', icon: Moon },
    { value: 'light', label: '亮色', icon: Sun }
  ]

  return (
    <div>
      <SectionTitle title="主题" />
      <div className="grid grid-cols-3 gap-4">
        {themes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              theme === t.value
                ? 'border-primary bg-primary/5'
                : 'border-transparent bg-muted hover:bg-muted/80'
            }`}
          >
            <t.icon className={`w-6 h-6 ${theme === t.value ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${theme === t.value ? 'text-primary' : 'text-muted-foreground'}`}>
              {t.label}
            </span>
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
      <div className="flex flex-col items-center py-8 text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          Z
        </div>
        <div>
          <h3 className="text-lg font-semibold">Z-Paste</h3>
          <p className="text-sm text-muted-foreground">版本 1.0.0</p>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">
          Mac 剪贴板管理器 — 让复制粘贴更高效
        </p>
        <Button variant="link" asChild>
          <a
            href="https://github.com/perseveringman/z-paste"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub →
          </a>
        </Button>
      </div>
    </div>
  )
}
