import nextra from 'nextra'

const withNextra = nextra({})

export default withNextra({
  output: 'export',
  basePath: '/z-paste',
  images: { unoptimized: true },
})
