import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'Z-Paste',
  tagline: 'macOS 剪切板管理 + 密码保险箱',
  favicon: 'img/favicon.ico',

  url: 'https://perseveringman.github.io',
  baseUrl: '/z-paste/',

  organizationName: 'perseveringman',
  projectName: 'z-paste',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Z-Paste',
      logo: {
        alt: 'Z-Paste Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: '使用文档',
        },
        {
          href: 'https://github.com/perseveringman/z-paste',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://github.com/perseveringman/z-paste/releases/latest',
          label: '下载',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            { label: '安装指南', to: '/docs/installation' },
            { label: '剪切板管理', to: '/docs/clipboard' },
            { label: '密码保险箱', to: '/docs/vault' },
          ],
        },
        {
          title: '更多',
          items: [
            { label: 'GitHub', href: 'https://github.com/perseveringman/z-paste' },
            { label: '反馈问题', href: 'https://github.com/perseveringman/z-paste/issues' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Z-Paste. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
