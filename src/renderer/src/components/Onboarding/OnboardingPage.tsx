import { useState, useCallback } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'

interface Step {
  title: string
  description: string
  icon: string
  content: React.ReactNode
}

interface Props {
  onComplete: () => void
}

export default function OnboardingPage({ onComplete }: Props): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState(0)
  const { setICloudSync, setHasCompletedOnboarding } = useSettingsStore()
  const [syncChoice, setSyncChoice] = useState(false)

  const steps: Step[] = [
    {
      title: '欢迎使用 Z-Paste',
      description: '强大的 Mac 剪贴板管理器，让你的复制粘贴更高效',
      icon: '🚀',
      content: (
        <div className="space-y-4">
          <Feature icon="📋" title="智能历史" desc="自动记录剪贴板，智能分类文本、代码、链接、颜色" />
          <Feature icon="🔍" title="即时搜索" desc="全文搜索，快速找到任何历史内容" />
          <Feature icon="📝" title="模板片段" desc="保存常用文本片段，一键粘贴" />
          <Feature icon="🎨" title="丰富预览" desc="代码高亮、JSON 格式化、颜色预览" />
        </div>
      )
    },
    {
      title: '快捷键',
      description: '用一个快捷键唤起 Z-Paste',
      icon: '⌨️',
      content: (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <KeyCap label="⇧" />
            <span className="text-gray-400">+</span>
            <KeyCap label="⌘" />
            <span className="text-gray-400">+</span>
            <KeyCap label="V" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            按下 ⇧⌘V 即可随时唤起剪贴板面板
            <br />
            选择条目后自动粘贴到当前应用
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mt-2 w-full">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">更多快捷键</p>
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>数字 1-9</span>
                <span className="text-gray-400">快速粘贴对应条目</span>
              </div>
              <div className="flex justify-between">
                <span>⌘ ,</span>
                <span className="text-gray-400">打开设置</span>
              </div>
              <div className="flex justify-between">
                <span>Esc</span>
                <span className="text-gray-400">关闭面板</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '隐私与同步',
      description: '你的数据安全是第一位的',
      icon: '🔒',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-2 font-medium">数据存储</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              所有剪贴板数据存储在本地 SQLite 数据库中。
              可选开启 AES-256 加密保护敏感内容。
            </p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">iCloud 同步</p>
              <button
                onClick={() => setSyncChoice(!syncChoice)}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  syncChoice ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    syncChoice ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              在多台 Mac 之间通过 iCloud Drive 同步剪贴板数据。
              可随时在设置中更改。
            </p>
          </div>
        </div>
      )
    },
    {
      title: '准备就绪！',
      description: '开始使用 Z-Paste 提升你的效率',
      icon: '✨',
      content: (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            Z
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            一切准备就绪！
            <br />
            复制任何内容后，按 ⇧⌘V 即可开始使用
          </p>
        </div>
      )
    }
  ]

  const isLastStep = currentStep === steps.length - 1

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setICloudSync(syncChoice)
      setHasCompletedOnboarding(true)
      onComplete()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }, [isLastStep, syncChoice, setICloudSync, setHasCompletedOnboarding, onComplete])

  const handleSkip = useCallback(() => {
    setHasCompletedOnboarding(true)
    onComplete()
  }, [setHasCompletedOnboarding, onComplete])

  const step = steps[currentStep]

  return (
    <div className="w-full h-full flex flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
        <span className="text-4xl mb-3">{step.icon}</span>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
          {step.title}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 text-center">
          {step.description}
        </p>
        <div className="w-full max-w-sm">{step.content}</div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-black/5 dark:border-white/5">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentStep
                  ? 'bg-blue-500'
                  : i < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              跳过
            </button>
          )}
          <button
            onClick={handleNext}
            className="text-xs bg-blue-500 text-white px-4 py-1.5 rounded-md hover:bg-blue-600 transition-colors"
          >
            {isLastStep ? '开始使用' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Feature({
  icon,
  title,
  desc
}: {
  icon: string
  title: string
  desc: string
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{title}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
    </div>
  )
}

function KeyCap({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm font-mono shadow-sm">
      {label}
    </span>
  )
}
