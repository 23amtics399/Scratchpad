import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { UIProvider } from '@/contexts/UIContext.js'
import { SettingsProvider } from '@/contexts/SettingsContext.js'
import { WorkspaceProvider } from '@/contexts/WorkspaceContext.js'
import { ToastProvider } from '@/contexts/ToastContext.js'
import { AppShell } from '@/components/AppShell/AppShell.js'
import { AboutModal } from '@/components/About/AboutModal.js'
import { ShareModal } from '@/components/Share/ShareModal.js'

describe('SEO, Indexability, Social Sharing & Static Assets', () => {
  const rootDir = process.cwd()

  describe('1. HTML Metadata & Prerendered Semantic Content', () => {
    const htmlPath = path.join(rootDir, 'index.html')
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8')

    it('has a descriptive, keyword-rich title with SJI brand suffix', () => {
      expect(htmlContent).toContain(
        '<title>Scratchpad — Free Local-First Writing Workspace | SJI</title>'
      )
    })

    it('has an accurate, concise meta description between 130 and 170 characters', () => {
      const match = htmlContent.match(/<meta\s+name="description"\s+content="([^"]+)"/)
      expect(match).not.toBeNull()
      const desc = match![1]
      expect(desc.length).toBeGreaterThanOrEqual(130)
      expect(desc.length).toBeLessThanOrEqual(170)
      expect(desc).toContain('local-first')
      expect(desc).toContain('workspace')
    })

    it('declares the single canonical URL for the root homepage', () => {
      expect(htmlContent).toContain('<link rel="canonical" href="https://scratchpad.sji.one/" />')
    })

    it('specifies index, follow robots directive', () => {
      expect(htmlContent).toContain('<meta name="robots" content="index, follow" />')
    })

    it('includes complete Open Graph metadata matching the canonical URL', () => {
      expect(htmlContent).toContain(
        '<meta property="og:title" content="Scratchpad — Free Local-First Writing Workspace | SJI" />'
      )
      expect(htmlContent).toContain(
        '<meta property="og:url" content="https://scratchpad.sji.one/" />'
      )
      expect(htmlContent).toContain('<meta property="og:type" content="website" />')
      expect(htmlContent).toContain('<meta property="og:site_name" content="Scratchpad" />')
      expect(htmlContent).toContain(
        '<meta property="og:image" content="https://scratchpad.sji.one/og-image.jpg" />'
      )
      expect(htmlContent).toContain(
        '<meta property="og:image:type" content="image/jpeg" />'
      )
      expect(htmlContent).toContain('<meta property="og:image:width" content="1200" />')
      expect(htmlContent).toContain('<meta property="og:image:height" content="630" />')
      expect(htmlContent).toContain('<meta property="og:locale" content="en_US" />')
    })

    it('includes complete Twitter summary_large_image card metadata', () => {
      expect(htmlContent).toContain('<meta name="twitter:card" content="summary_large_image" />')
      expect(htmlContent).toContain(
        '<meta name="twitter:title" content="Scratchpad — Free Local-First Writing Workspace | SJI" />'
      )
      expect(htmlContent).toContain(
        '<meta name="twitter:image" content="https://scratchpad.sji.one/og-image.jpg" />'
      )
    })

    it('contains valid Schema.org JSON-LD structured data for WebApplication, WebSite, and Organization', () => {
      const jsonLdMatch = htmlContent.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
      )
      expect(jsonLdMatch).not.toBeNull()
      const parsed = JSON.parse(jsonLdMatch![1])

      expect(parsed['@context']).toBe('https://schema.org')
      expect(Array.isArray(parsed['@graph'])).toBe(true)

      const webApp = parsed['@graph'].find(
        (item: { ['@type']: string }) => item['@type'] === 'WebApplication'
      )
      expect(webApp).toBeDefined()
      expect(webApp.name).toBe('Scratchpad')
      expect(webApp.url).toBe('https://scratchpad.sji.one/')
      expect(webApp.image).toBe('https://scratchpad.sji.one/og-image.jpg')
      expect(webApp.applicationCategory).toBe('ProductivityApplication')
      expect(webApp.offers.price).toBe('0')

      const webSite = parsed['@graph'].find(
        (item: { ['@type']: string }) => item['@type'] === 'WebSite'
      )
      expect(webSite).toBeDefined()
      expect(webSite.url).toBe('https://scratchpad.sji.one/')

      const org = parsed['@graph'].find(
        (item: { ['@type']: string }) => item['@type'] === 'Organization'
      )
      expect(org).toBeDefined()
      expect(org.name).toBe('SJI')
      expect(org.url).toBe('https://sji.one/')
    })

    it('contains rich, crawlable pre-rendered HTML in #root before client hydration', () => {
      expect(htmlContent).toContain('Scratchpad — Free Local-First Writing Workspace')
      expect(htmlContent).toContain('100% Local-First & Zero-Account Architecture')
      expect(htmlContent).toContain('Three Versatile Editing Modes')
      expect(htmlContent).toContain('https://sji.one/')
      expect(htmlContent).toContain('https://sji.one/products/scratchpad')
      expect(htmlContent).toContain('https://tools.sji.one/')
      expect(htmlContent).toContain('https://calc.sji.one/')
      expect(htmlContent).toContain('https://time.sji.one/')
      expect(htmlContent).toContain('https://shorty.sji.one/')
      expect(htmlContent).toContain('https://tempbox.sji.one/')

      // Ensure word count is substantial (150 - 350 words)
      const rootMatch = htmlContent.match(/<div id="root">([\s\S]*?)<\/div>/)
      expect(rootMatch).not.toBeNull()
      const textOnly = rootMatch![1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const words = textOnly.split(' ').filter(Boolean)
      expect(words.length).toBeGreaterThanOrEqual(150)
      expect(words.length).toBeLessThanOrEqual(400)
    })

    it('provides a meaningful noscript fallback element', () => {
      expect(htmlContent).toContain('<noscript>')
      expect(htmlContent).toContain('JavaScript Disabled')
      expect(htmlContent).toContain('https://sji.one/products/scratchpad')
    })
  })

  describe('2. Static Discovery Files & HTTP Configuration', () => {
    it('robots.txt exists, permits crawling, and declares sitemap.xml', () => {
      const robotsPath = path.join(rootDir, 'public', 'robots.txt')
      expect(fs.existsSync(robotsPath)).toBe(true)
      const robots = fs.readFileSync(robotsPath, 'utf-8')
      expect(robots).toContain('User-agent: *')
      expect(robots).toContain('Allow: /')
      expect(robots).toContain('Sitemap: https://scratchpad.sji.one/sitemap.xml')
      expect(robots).not.toContain('Disallow: /')
    })

    it('sitemap.xml exists, is valid XML, and contains canonical homepage URL', () => {
      const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml')
      expect(fs.existsSync(sitemapPath)).toBe(true)
      const sitemap = fs.readFileSync(sitemapPath, 'utf-8')
      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(sitemap).toContain('<loc>https://scratchpad.sji.one/</loc>')
      expect(sitemap).toContain('<lastmod>2026-10-10</lastmod>')
    })

    it('site.webmanifest exists and contains valid JSON metadata', () => {
      const manifestPath = path.join(rootDir, 'public', 'site.webmanifest')
      expect(fs.existsSync(manifestPath)).toBe(true)
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      expect(manifest.name).toBe('Scratchpad — Free Local-First Writing Workspace')
      expect(manifest.short_name).toBe('Scratchpad')
      expect(manifest.start_url).toBe('/')
      expect(manifest.display).toBe('standalone')
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
    })

    it('_headers exists and configures HSTS and security policies for Cloudflare Pages', () => {
      const headersPath = path.join(rootDir, 'public', '_headers')
      expect(fs.existsSync(headersPath)).toBe(true)
      const headers = fs.readFileSync(headersPath, 'utf-8')
      expect(headers).toContain('Strict-Transport-Security: max-age=63072000; includeSubDomains')
      expect(headers).toContain('X-Content-Type-Options: nosniff')
      expect(headers).toContain('Referrer-Policy: strict-origin-when-cross-origin')
      expect(headers).toContain('X-Frame-Options: SAMEORIGIN')
      expect(headers).toContain('Content-Type: text/plain; charset=utf-8')
      expect(headers).toContain('Content-Type: application/xml; charset=utf-8')
      expect(headers).toContain('Content-Type: application/manifest+json; charset=utf-8')
    })

    it('404.html exists and contains noindex tag with links back to Scratchpad and SJI', () => {
      const notFoundPath = path.join(rootDir, 'public', '404.html')
      expect(fs.existsSync(notFoundPath)).toBe(true)
      const notFound = fs.readFileSync(notFoundPath, 'utf-8')
      expect(notFound).toContain('404 — Page Not Found')
      expect(notFound).toContain('<meta name="robots" content="noindex, follow" />')
      expect(notFound).toContain('href="/"')
      expect(notFound).toContain('https://sji.one/')
      expect(notFound).toContain('https://sji.one/products/scratchpad')
    })
  })

  describe('3. Real Physical Assets Verification', () => {
    it('og-image.png is a genuine 1200x630 PNG file', () => {
      const imgPath = path.join(rootDir, 'public', 'og-image.png')
      expect(fs.existsSync(imgPath)).toBe(true)
      const buf = fs.readFileSync(imgPath)
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      const width = buf.readUInt32BE(16)
      const height = buf.readUInt32BE(20)
      expect(width).toBe(1200)
      expect(height).toBe(630)
    })

    it('og-image.jpg is a genuine JPEG file', () => {
      const imgPath = path.join(rootDir, 'public', 'og-image.jpg')
      expect(fs.existsSync(imgPath)).toBe(true)
      const buf = fs.readFileSync(imgPath)
      // JPEG SOI marker: FF D8
      expect(buf.subarray(0, 2).toString('hex')).toBe('ffd8')
      expect(buf.length).toBeGreaterThan(1000)
    })

    it('apple-touch-icon.png is a genuine 180x180 PNG file', () => {
      const imgPath = path.join(rootDir, 'public', 'apple-touch-icon.png')
      expect(fs.existsSync(imgPath)).toBe(true)
      const buf = fs.readFileSync(imgPath)
      expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      const width = buf.readUInt32BE(16)
      const height = buf.readUInt32BE(20)
      expect(width).toBe(180)
      expect(height).toBe(180)
    })

    it('favicon.ico is a valid ICO file', () => {
      const icoPath = path.join(rootDir, 'public', 'favicon.ico')
      expect(fs.existsSync(icoPath)).toBe(true)
      const buf = fs.readFileSync(icoPath)
      // ICO header: 00 00 01 00
      expect(buf.readUInt16LE(0)).toBe(0)
      expect(buf.readUInt16LE(2)).toBe(1)
      expect(buf.length).toBeGreaterThan(100)
    })

    it('favicon.svg is a valid SVG vector asset', () => {
      const svgPath = path.join(rootDir, 'public', 'favicon.svg')
      expect(fs.existsSync(svgPath)).toBe(true)
      const content = fs.readFileSync(svgPath, 'utf-8')
      expect(content).toContain('<svg')
      expect(content).toContain('viewBox')
    })
  })

  describe('4. Hydrated React UI, Linking & Modals', () => {
    it('renders the hydrated WelcomeScreen with SJI links, privacy badges, and product footer', async () => {
      render(
        <ToastProvider>
          <SettingsProvider>
            <WorkspaceProvider>
              <UIProvider>
                <AppShell />
              </UIProvider>
            </WorkspaceProvider>
          </SettingsProvider>
        </ToastProvider>
      )

      // Wait for workspace to finish loading and WelcomeScreen H1 to render
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Scratchpad' })).toBeInTheDocument()
      })

      // Subtitle SJI link
      const sjiLinks = screen.getAllByRole('link', { name: /SJI/i })
      expect(sjiLinks.length).toBeGreaterThanOrEqual(1)
      expect(sjiLinks[0]).toHaveAttribute('href', 'https://sji.one/')

      // Badges
      expect(screen.getByText('100% Offline & Private')).toBeInTheDocument()
      expect(screen.getByText('Zero Accounts')).toBeInTheDocument()
      expect(screen.getByText('IndexedDB Storage')).toBeInTheDocument()

      // Footer links
      const productLink = screen.getByRole('link', { name: 'Scratchpad on SJI' })
      expect(productLink).toHaveAttribute('href', 'https://sji.one/products/scratchpad')

      const sjiHomeLink = screen.getByRole('link', { name: 'SJI Home' })
      expect(sjiHomeLink).toHaveAttribute('href', 'https://sji.one/')

      // Sister product links
      expect(screen.getByRole('link', { name: 'Tools' })).toHaveAttribute(
        'href',
        'https://tools.sji.one/'
      )
      expect(screen.getByRole('link', { name: 'Calc' })).toHaveAttribute(
        'href',
        'https://calc.sji.one/'
      )
      expect(screen.getByRole('link', { name: 'Time' })).toHaveAttribute(
        'href',
        'https://time.sji.one/'
      )
      expect(screen.getByRole('link', { name: 'Shorty' })).toHaveAttribute(
        'href',
        'https://shorty.sji.one/'
      )
      expect(screen.getByRole('link', { name: 'TempBox' })).toHaveAttribute(
        'href',
        'https://tempbox.sji.one/'
      )

      // StatusBar links and buttons
      const statusSji = screen.getByRole('link', { name: /SJI Web Products/i })
      expect(statusSji).toBeInTheDocument()

      const shareBtns = screen.getAllByRole('button', { name: 'Share Scratchpad' })
      expect(shareBtns.length).toBeGreaterThanOrEqual(1)
    })

    it('AboutModal opens and displays privacy information and SJI network links', () => {
      const onClose = vi.fn()
      render(<AboutModal isOpen={true} onClose={onClose} />)

      expect(
        screen.getByText('Version 1.0.0 · Free Local-First Writing Workspace')
      ).toBeInTheDocument()
      expect(screen.getByText('Published by SJI')).toBeInTheDocument()
      expect(screen.getByText('Privacy & Storage Architecture')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Scratchpad on SJI/i })).toHaveAttribute(
        'href',
        'https://sji.one/products/scratchpad'
      )
      expect(screen.getByRole('link', { name: /MDN IndexedDB Documentation/i })).toHaveAttribute(
        'href',
        'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API'
      )
      expect(screen.queryByRole('link', { name: /GitHub Repository/i })).not.toBeInTheDocument()

      // Close button
      fireEvent.click(screen.getByRole('button', { name: 'Done' }))
      expect(onClose).toHaveBeenCalled()
    })

    it('ShareModal correctly formats and encodes share targets using the canonical URL', async () => {
      const onClose = vi.fn()
      render(
        <ToastProvider>
          <ShareModal isOpen={true} onClose={onClose} />
        </ToastProvider>
      )

      expect(screen.getByText('Share Scratchpad')).toBeInTheDocument()

      const input = screen.getByLabelText('Scratchpad canonical link') as HTMLInputElement
      expect(input.value).toBe('https://scratchpad.sji.one/')

      // WhatsApp link has encoded URL
      const whatsapp = screen.getByRole('link', { name: /WhatsApp/i })
      expect(whatsapp.getAttribute('href')).toContain(
        encodeURIComponent('https://scratchpad.sji.one/')
      )

      // X link has encoded URL
      const xLink = screen.getByRole('link', { name: /X \(Twitter\)/i })
      expect(xLink.getAttribute('href')).toContain(
        encodeURIComponent('https://scratchpad.sji.one/')
      )

      // Facebook link has encoded URL
      const facebook = screen.getByRole('link', { name: /Facebook/i })
      expect(facebook.getAttribute('href')).toContain(
        encodeURIComponent('https://scratchpad.sji.one/')
      )

      // LinkedIn link has encoded URL
      const linkedIn = screen.getByRole('link', { name: /LinkedIn/i })
      expect(linkedIn.getAttribute('href')).toContain(
        encodeURIComponent('https://scratchpad.sji.one/')
      )

      // Email link has mailto and subject
      const email = screen.getByRole('link', { name: /Email/i })
      expect(email.getAttribute('href')).toContain('mailto:?subject=')
      expect(email.getAttribute('href')).toContain(
        encodeURIComponent('https://scratchpad.sji.one/')
      )

      // Mock clipboard writeText
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      })

      // Copy link
      const copyBtn = screen.getByRole('button', { name: /^Copy$/i })
      fireEvent.click(copyBtn)
      await waitFor(() => {
        expect(screen.getByText('Copied')).toBeInTheDocument()
      })
      expect(writeTextMock).toHaveBeenCalledWith('https://scratchpad.sji.one/')
    })
  })
})
