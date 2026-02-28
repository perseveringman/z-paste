import type { ReactNode } from 'react'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import styles from './index.module.css'

function Hero() {
  return (
    <div className={styles.hero}>
      <div className={styles.heroInner}>
        <h1 className={styles.heroTitle}>Z-Paste</h1>
        <p className={styles.heroSubtitle}>
          macOS 剪切板管理器 + 密码保险箱
          <br />
          本地存储，隐私优先，免订阅
        </p>
        <div className={styles.heroActions}>
          <Link
            className="button button--primary button--lg"
            to="https://github.com/perseveringman/z-paste/releases/latest"
          >
            免费下载
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/z-paste/docs/installation"
          >
            查看文档
          </Link>
        </div>
        <p className={styles.heroBadge}>仅支持 macOS · Apple Silicon 和 Intel 均可</p>
      </div>
    </div>
  )
}

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
    <div className={styles.featureCard}>
      <div className={styles.featureEmoji}>{emoji}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{description}</p>
    </div>
  )
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main>
        <Hero />
        <section className={styles.features}>
          <div className={styles.featuresInner}>
            <h2 className={styles.featuresTitle}>核心功能</h2>
            <div className={styles.featuresGrid}>
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}
