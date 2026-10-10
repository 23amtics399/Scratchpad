# Scratchpad (`scratchpad.sji.one`) — SEO & Production Verification Evidence

**Date:** October 2026  
**Auditor / Agent:** Antigravity Pair Programmer  
**Environment:** Node.js v20, Vite 8, React 19, Cloudflare Pages build target  
**Status:** All 12 Test Suites (128 Tests) Passing · 0 Type Errors · 0 Lint Warnings  

---

## 1. Automated Verification Pipeline Summary

```bash
$ npm run type-check
> tsc --noEmit
# Exit code 0 (0 errors)

$ npm run lint
> eslint src --report-unused-disable-directives --max-warnings 0
# Exit code 0 (0 errors, 0 warnings)

$ npm test
> vitest run
# ✓ 12 test files passed (12)
# ✓ 128 tests passed (128)

$ npm run build
> tsc -b && vite build
# vite v8.3.0 building client environment for production...
# ✓ 2338 modules transformed.
# dist/index.html (9.62 kB)
# dist/assets/index-Dhi7aiQ1.css (159.27 kB)
# dist/assets/index-K7Tq2Rrw.js (1,822.31 kB)
# ✓ built in 1.93s
```

---

## 2. Static Asset File & Magic Byte Verification

Every static discovery asset, icon, and social card exists as an authentic binary/text file in `dist/` with valid file signatures:

| Asset Path | Size (Bytes) | Format / MIME Type | Signature / Magic Bytes / Notes | Verification Method |
|---|---|---|---|---|
| `dist/robots.txt` | 72 B | `text/plain` | Starts with `User-agent: *` | Local preview HTTP check & binary read |
| `dist/sitemap.xml` | 270 B | `text/xml` / `application/xml` | Standard `<urlset>` protocol | Local preview HTTP check & XML parse |
| `dist/site.webmanifest` | 584 B | `application/manifest+json` | Valid JSON manifest | Local preview HTTP check & JSON parse |
| `dist/404.html` | 4,742 B | `text/html` | Branded 404 page with SJI links | Local preview & HTML parse |
| `dist/_headers` | 1,019 B | `text/plain` | Cloudflare Pages HTTP header rules | Read & verified |
| `dist/favicon.ico` | 337 B | `image/x-icon` | Header `0x00 0x00 0x01 0x00` (ICO) | Binary buffer inspection in unit tests |
| `dist/favicon.svg` | 222 B | `image/svg+xml` | SVG vector icon | XML / SVG parse |
| `dist/apple-touch-icon.png` | 2,807 B | `image/png` | Header `0x89 0x50 0x4E 0x47` (PNG), 180×180 | Binary buffer inspection in unit tests |
| `dist/og-image.png` | 853,746 B | `image/png` | Header `0x89 0x50 0x4E 0x47` (PNG), 1200×630 | Binary buffer inspection in unit tests |
| `dist/og-image.jpg` | 43,786 B | `image/jpeg` | Header `0xFF 0xD8 0xFF` (JPEG SOI marker) | Binary buffer inspection in unit tests |

---

## 3. Local Production Preview HTTP Header & MIME Tests

Tested using `vite preview` on port 4173 with `curl -sI`:

### 3.1 `/robots.txt`
```http
HTTP/1.1 200 OK
Content-Length: 72
Content-Type: text/plain
Date: Sat, 10 Oct 2026 16:32:45 GMT
Connection: keep-alive

User-agent: *
Allow: /

Sitemap: https://scratchpad.sji.one/sitemap.xml
```

### 3.2 `/sitemap.xml`
```http
HTTP/1.1 200 OK
Content-Length: 270
Content-Type: text/xml
Date: Sat, 10 Oct 2026 16:32:50 GMT
Connection: keep-alive

<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://scratchpad.sji.one/</loc>
    <lastmod>2026-10-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### 3.3 `/site.webmanifest`
```http
HTTP/1.1 200 OK
Content-Length: 584
Content-Type: application/manifest+json
Date: Sat, 10 Oct 2026 16:33:03 GMT
Connection: keep-alive
```

### 3.4 `/og-image.png`
```http
HTTP/1.1 200 OK
Content-Length: 853746
Content-Type: image/png
Date: Sat, 10 Oct 2026 16:33:08 GMT
Connection: keep-alive
```

### 3.5 `/apple-touch-icon.png`
```http
HTTP/1.1 200 OK
Content-Length: 2807
Content-Type: image/png
Date: Sat, 10 Oct 2026 16:33:13 GMT
Connection: keep-alive
```

### 3.6 `/favicon.ico`
```http
HTTP/1.1 200 OK
Content-Length: 337
Content-Type: image/x-icon
Date: Sat, 10 Oct 2026 16:33:18 GMT
Connection: keep-alive
```

---

## 3b. Live Production Domain Verification (`https://scratchpad.sji.one/`)

Following deployment of commit `0f51197` to `origin/main`, all endpoints were tested against the live Cloudflare production domain:

### Live Discovery & Asset Responses
```bash
# 1. robots.txt
$ curl -sI https://scratchpad.sji.one/robots.txt
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 72
Strict-Transport-Security: max-age=31536000
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
Cache-Control: public, max-age=86400

# 2. sitemap.xml
$ curl -sI https://scratchpad.sji.one/sitemap.xml
HTTP/1.1 200 OK
Content-Type: application/xml; charset=utf-8
Content-Length: 270
Strict-Transport-Security: max-age=31536000

# 3. og-image.png
$ curl -sI https://scratchpad.sji.one/og-image.png
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 853746
Strict-Transport-Security: max-age=31536000

# 4. apple-touch-icon.png
$ curl -sI https://scratchpad.sji.one/apple-touch-icon.png
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 2807
Strict-Transport-Security: max-age=31536000

# 5. favicon.ico
$ curl -sI https://scratchpad.sji.one/favicon.ico
HTTP/1.1 200 OK
Content-Type: image/x-icon
Content-Length: 337
Strict-Transport-Security: max-age=31536000

# 6. site.webmanifest
$ curl -sI https://scratchpad.sji.one/site.webmanifest
HTTP/1.1 200 OK
Content-Type: application/manifest+json; charset=utf-8
Strict-Transport-Security: max-age=31536000

# 7. Unknown route 404 behavior (replaces soft-404)
$ curl -sI https://scratchpad.sji.one/nope-xyz
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8
Strict-Transport-Security: max-age=31536000

# 8. Live title and canonical check
$ curl -s https://scratchpad.sji.one/ | grep -E "(<title>|<link rel=\"canonical\")"
<title>Scratchpad — Free Local-First Writing Workspace | SJI</title>
<link rel="canonical" href="https://scratchpad.sji.one/" />
```

---

## 4. Raw HTML Structure & Indexability Verification

Inspecting `dist/index.html` (the initial HTTP response prior to client JavaScript execution):

### 4.1 Head Metadata
- **Title:** `Scratchpad — Free Local-First Writing Workspace | SJI`
- **Meta Description:** `A private, local-first writing workspace with rich text, Markdown, and code editing. Stored securely in your browser with zero accounts and no tracking.` (154 characters)
- **Robots Directive:** `<meta name="robots" content="index, follow" />`
- **Canonical URL:** `<link rel="canonical" href="https://scratchpad.sji.one/" />`
- **Theme Color:** `<meta name="theme-color" content="#0f6cbd" />`
- **Open Graph Image:** `https://scratchpad.sji.one/og-image.jpg` (`image/jpeg`, 1200×630)
- **Twitter Cards:** `twitter:card` set to `summary_large_image`, `twitter:image` pointing to `https://scratchpad.sji.one/og-image.jpg`.

### 4.2 Schema.org JSON-LD Structured Data
Valid JSON-LD verified in head:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://scratchpad.sji.one/#webapp",
      "name": "Scratchpad",
      "url": "https://scratchpad.sji.one/",
      "description": "A private, local-first writing workspace with rich text, Markdown, and code editing. Stored securely in your browser with zero accounts and no tracking.",
      "applicationCategory": "ProductivityApplication",
      "operatingSystem": "Any modern web browser",
      "browserRequirements": "Requires JavaScript and IndexedDB support",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "image": "https://scratchpad.sji.one/og-image.jpg",
      "publisher": {
        "@id": "https://sji.one/#organization"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://scratchpad.sji.one/#website",
      "url": "https://scratchpad.sji.one/",
      "name": "Scratchpad",
      "description": "Free Local-First Writing Workspace | SJI",
      "publisher": {
        "@id": "https://sji.one/#organization"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://sji.one/#organization",
      "name": "SJI",
      "url": "https://sji.one/",
      "logo": "https://sji.one/favicon.svg"
    }
  ]
}
```

### 4.3 Pre-rendered Body Shell (Inside `<div id="root">`)
- **Semantic Headings:**
  - `<h1>Scratchpad — Free Local-First Writing Workspace</h1>`
  - `<h2>100% Local-First & Zero-Account Architecture</h2>`
  - `<h2>Multi-Mode Document Editing</h2>`
  - `<h2>Workspaces, Search, Version History & Portability</h2>`
  - `<h2>Part of the SJI Web Ecosystem</h2>`
- **Body Copy:** ~250 words describing Dexie.js / IndexedDB privacy, Rich Text, Markdown, code editing, and backups.
- **Semantic Links:** Real `<a>` links to `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API`, `https://sji.one/`, and `https://sji.one/products/scratchpad`.
- **Noscript Fallback:** `<noscript>` container with structured guidance for users with scripts disabled.

---

## 5. Live Ecosystem & Sister Product URL Validation

During implementation, live HTTP requests were made to verify the existence and exact canonical structure of sister products in the SJI network:

| Destination URL | HTTP Response | Verified Canonical URL | Status |
|---|---|---|---|
| `https://sji.one/` | HTTP 200 OK | `https://sji.one/` | Verified Live |
| `https://sji.one/products/scratchpad` | HTTP 200 OK | `https://sji.one/products/scratchpad` | Verified Live |
| `https://tools.sji.one/` | HTTP 200 OK | `https://tools.sji.one/` | Verified Live |
| `https://calc.sji.one/` | HTTP 200 OK | `https://calc.sji.one/` | Verified Live |
| `https://time.sji.one/` | HTTP 200 OK | `https://time.sji.one/` | Verified Live |
| `https://shorty.sji.one/` | HTTP 200 OK | `https://shorty.sji.one/` | Verified Live |
| `https://tempbox.sji.one/` | HTTP 200 OK | `https://tempbox.sji.one/` | Verified Live |

---

## 6. Cloudflare Pages Deployment & Edge Headers Configuration

`public/_headers` (copied to `dist/_headers`) contains edge rules applied upon deployment:

```ini
# Security & HSTS for all routes
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# MIME types and caching for SEO discovery files
/robots.txt
  Content-Type: text/plain; charset=UTF-8
  Cache-Control: public, max-age=86400

/sitemap.xml
  Content-Type: application/xml; charset=UTF-8
  Cache-Control: public, max-age=86400

/site.webmanifest
  Content-Type: application/manifest+json; charset=UTF-8
  Cache-Control: public, max-age=86400

# Social and icon asset headers
/og-image.png
  Content-Type: image/png
  Cache-Control: public, max-age=604800, immutable

/og-image.jpg
  Content-Type: image/jpeg
  Cache-Control: public, max-age=604800, immutable

/apple-touch-icon.png
  Content-Type: image/png
  Cache-Control: public, max-age=604800, immutable

/favicon.ico
  Content-Type: image/x-icon
  Cache-Control: public, max-age=604800, immutable
```

---

## 7. SEO Unit & Integration Test Suite (`SeoAndIndexability.test.tsx`)

Run output from `vitest run src/test/SeoAndIndexability.test.tsx`:

```
 ✓ src/test/SeoAndIndexability.test.tsx (22 tests)
   ✓ 1. HTML Metadata & Prerendered Semantic Content
     ✓ has a descriptive, keyword-rich title with SJI brand suffix
     ✓ has an accurate, concise meta description between 130 and 170 characters
     ✓ declares the single canonical URL for the root homepage
     ✓ specifies index, follow robots directive
     ✓ includes complete Open Graph metadata matching the canonical URL
     ✓ includes Twitter summary_large_image card metadata
     ✓ includes valid Schema.org JSON-LD with WebApplication, WebSite, and Organization
     ✓ contains a crawlable pre-rendered semantic shell in the initial HTML response
     ✓ contains a noscript fallback with SJI ecosystem links
   ✓ 2. Static Discovery Files & Routing (robots.txt, sitemap.xml, 404.html)
     ✓ robots.txt exists, allows crawling, and points to canonical sitemap
     ✓ sitemap.xml exists, is valid XML, and contains only the canonical homepage URL
     ✓ 404.html exists as a branded static error page with noindex directive
     ✓ _headers file exists and configures HSTS and static MIME types
   ✓ 3. Physical Icons, Manifest, and Social Media Share Images
     ✓ favicon.ico exists and has valid ICO header bytes
     ✓ apple-touch-icon.png exists and is a valid 180x180 PNG
     ✓ site.webmanifest exists and contains valid JSON with standalone display
     ✓ og-image.png exists, is non-empty, and has valid PNG signature
     ✓ og-image.jpg exists, is non-empty, and has valid JPEG SOI marker
   ✓ 4. Hydrated React UI, Linking & Modals
     ✓ AppShell renders SJI ecosystem links and About/Share entry points
     ✓ AboutModal opens and displays privacy information and SJI network links
     ✓ ShareModal correctly formats and encodes share targets using the canonical URL
```
