import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'installation',
      label: '安装指南',
    },
    {
      type: 'category',
      label: '功能指南',
      items: ['clipboard', 'vault'],
    },
    {
      type: 'doc',
      id: 'shortcuts',
      label: '快捷键参考',
    },
    {
      type: 'doc',
      id: 'faq',
      label: 'FAQ',
    },
    {
      type: 'doc',
      id: 'changelog',
      label: '更新日志',
    },
  ],
}

export default sidebars
