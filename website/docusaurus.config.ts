import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'Stash',
  tagline: 'macOS 剪切板管理 + 密码保险箱',
  favicon: 'img/favicon.ico',

  url: 'https://perseveringman.github.io',
  baseUrl: '/Stash/',

  organizationName: 'perseveringman',
  projectName: 'Stash',
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
      title: 'Stash',
      logo: {
        alt: 'Stash Logo',
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
          href: 'https://github.com/perseveringman/Stash',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://github.com/perseveringman/Stash/releases/latest',
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
            { label: 'GitHub', href: 'https://github.com/perseveringman/Stash' },
            { label: '反馈问题', href: 'https://github.com/perseveringman/Stash/issues' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Stash. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
