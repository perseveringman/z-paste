import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  title: {
    template: '%s – Z-Paste',
    default: 'Z-Paste',
  },
  description: 'Z-Paste documentation',
}

const YEAR = new Date().getFullYear()

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pageMap = await getPageMap()

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Layout
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/perseveringman/z-paste"
          nextThemes={{
            defaultTheme: 'dark',
          }}
          navbar={
            <Navbar
              logo={<b>Z-Paste</b>}
              projectLink="https://github.com/perseveringman/z-paste"
            >
              <a
                href="https://github.com/perseveringman/z-paste/releases/latest"
                target="_blank"
                rel="noreferrer"
                style={{ fontWeight: 500 }}
              >
                Download
              </a>
            </Navbar>
          }
          footer={
            <Footer>
              <span>Copyright © {YEAR} Z-Paste</span>
            </Footer>
          }
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
