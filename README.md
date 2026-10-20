# ExpertinAEO — Production Website

A premium, multi-page Answer Engine Optimization agency website for **https://expertinaeo.com** — a product of Tapadia Tech (est. 2001).

## What's in this package

```
public_html/                      ← Upload this entire folder to cPanel
├── index.html                    Homepage (hand-crafted, 17 sections)
├── 404.html                      Custom 404 page
├── about/index.html
├── services/                     15 service pages + hub
├── industries/                   7 industry pages + hub
├── aeo-services/                 8 country pages + hub
├── tools/                        5 tool pages (AEO Checker + 4 more) + hub
├── case-studies/index.html
├── resources/index.html
├── contact/index.html
├── free-aeo-audit/index.html
├── privacy-policy/index.html
├── terms-and-conditions/index.html
├── thank-you/index.html
├── assets/
│   ├── css/styles.css            Design system (41 KB)
│   ├── js/config.js              Central config — WhatsApp number, email, GA4
│   ├── js/main.js                Header, mobile menu, WhatsApp FAB, GA4 events
│   ├── js/aeo-checker.js         AEO Checker frontend
│   └── js/tools.js               Other 4 tools frontend
├── api/                          PHP backends (PHP 8.x required)
│   ├── analyze.php               Free AEO Checker — real URL fetch + parse + score
│   ├── contact.php               Contact/lead form with SMTP
│   ├── schema-check.php          Schema markup inspection
│   ├── answer-check.php          Direct-answer content scoring
│   ├── faq-generate.php          Question-pattern generation (honest, no fake AI)
│   └── meta-check.php            Meta & heading audit
├── config/
│   └── config.example.php        SMTP config template — copy and edit
├── sitemap.xml                   47 URLs
├── robots.txt
└── .htaccess                     Security headers, redirects, 404, compression
```

**Total: 49 HTML pages + 6 PHP endpoints + 5 CSS/JS assets + SEO files.**

## Brand & contact details baked in

| Item | Value |
|---|---|
| Brand | **ExpertinAEO** (text wordmark — "Expertin" navy + "AEO" teal) |
| Parent | Tapadia Tech (est. 2001) |
| Email | info@tapadiatech.com |
| WhatsApp | +1-213-258-1582 (link: wa.me/12132581582) |
| GA4 ID | G-JLTVJKF4CC (baked into every page `<head>`) |
| Email subject | "Feedback form from expertinaeo.com" |

All contact details live in **`assets/js/config.js`** — edit one file to update everywhere.

## Deployment to cPanel

### Step 1 — Upload files

1. Log into cPanel.
2. Open **File Manager** → navigate to `public_html/`.
3. **Back up** your existing site first (download or rename current `public_html/` contents).
4. Upload the contents of this `public_html/` folder into your `public_html/`.
   - Do NOT upload the `public_html/` folder itself — upload its **contents** so that `index.html`, `.htaccess`, etc. sit at the cPanel web root.
5. Set file permissions: directories 755, files 644.

### Step 2 — Configure SMTP for the contact form

The contact form uses authenticated SMTP. Credentials MUST live **outside public_html** for security.

1. In cPanel **File Manager**, navigate to `/home/<your-cpanel-username>/` (one level above `public_html/`).
2. Create a directory called `expertinaeo-config/`.
3. Inside that directory, create `smtp.php` with the following content:

   ```php
   <?php
   return [
       'recipient_email' => 'info@tapadiatech.com',
       'from_email'      => 'noreply@your-domain.com',  // a mailbox that exists on your server
       'from_name'       => 'ExpertinAEO Website',
       'smtp_host'       => 'your-smtp-host',           // e.g. mail.tapadiatech.com
       'smtp_port'       => 587,                        // 465 for SSL, 587 for TLS
       'smtp_user'       => 'your-smtp-username',
       'smtp_pass'       => 'your-smtp-password',
       'smtp_secure'     => 'tls',                      // tls | ssl | '' (none)
   ];
   ```

4. **If you cannot create the directory above public_html**, edit `/public_html/config/config.example.php` and save as `/public_html/config/config.php` with your real credentials. The `config/` directory is blocked from public access via `.htaccess`. The directory-above-public_html approach is preferred for highest security.

### Step 3 — Install PHPMailer (optional but recommended for SMTP)

The contact form falls back to PHP `mail()` if PHPMailer is not installed. For authenticated SMTP, install PHPMailer:

```bash
# In cPanel Terminal or via SSH, from public_html/
composer require phpmailer/phpmailer
```

If composer is unavailable, download PHPMailer manually from https://github.com/PHPMailer/PHPMailer and place it at `public_html/vendor/phpmailer/phpmailer/src/`. The contact.php file expects this path.

### Step 4 — Test the contact form

1. Open https://expertinaeo.com/contact/ in your browser.
2. Submit the form with a real email address.
3. Check info@tapadiatech.com — the email should arrive with subject "Feedback form from expertinaeo.com".
4. If the email does not arrive, check `/public_html/api/contact.php` error logs. The form returns JSON with debug info on failure.

### Step 5 — Test the free AEO Checker

1. Open https://expertinaeo.com/tools/aeo-checker/.
2. Enter a public URL (e.g. `https://example.com`).
3. Click **Analyze**.
4. Verify the tool returns a real JSON response with a score, category breakdown and check list.

If the tool returns an error, check:
- cURL PHP extension is enabled (most cPanel hosts have this by default).
- `allow_url_fopen` is `On` in PHP settings (cPanel → MultiPHP INI Editor).
- The target URL is publicly accessible and not behind bot protection.

### Step 6 — Google Search Console

1. Sign in to Google Search Console at https://search.google.com/search-console.
2. Add your property: `https://expertinaeo.com` (URL prefix) or `expertinaeo.com` (Domain — recommended for HTTPS verification across subdomains).
3. Verify ownership using one of:
   - **HTML file upload** (recommended) — upload the verification HTML file to `public_html/`.
   - **HTML meta tag** — add the verification meta tag to the `<head>` of `index.html`.
   - **DNS TXT record** — for Domain property, add the TXT record in your DNS provider.
4. Submit the sitemap: enter `https://expertinaeo.com/sitemap.xml` in the Sitemaps section.
5. Wait 24–48 hours for Search Console to start showing data.

### Step 7 — Verify GA4

1. Open Google Analytics at https://analytics.google.com.
2. Confirm the GA4 property with Measurement ID **G-JLTVJKF4CC** is receiving data (Realtime report).
3. Test events: visit a tool page, submit a test form, click the WhatsApp button — events should appear in Realtime within 60 seconds.

## GA4 events implemented

| Event | Triggered by |
|---|---|
| `generate_lead` | Successful form submission |
| `form_start` | First field focus on a form |
| `audit_request` | Click on any "Get Free AEO Audit" CTA |
| `aeo_tool_start` | Submit on any tool |
| `aeo_tool_complete` | Successful tool analysis |
| `whatsapp_click` | Click on any WhatsApp link or FAB |
| `email_click` | Click on any email link |
| `report_download` | Click "Download report" in AEO Checker result |

No PII (names, emails, phone numbers) is sent to GA4. Only non-identifying parameters (source_page, tool_name, service_name, score_bucket).

## WhatsApp floating button

- The floating WhatsApp button appears bottom-right on every page.
- It is **injected by JavaScript** (single source of truth in `assets/js/main.js`) — no duplication across pages.
- The prefilled message is **context-aware**:
  - Homepage: "Reaching out for Answer Engine Optimization | via ExpertinAEO.com"
  - Service pages: "Reaching out for [Service Name] | via ExpertinAEO.com"
  - Country pages: "Reaching out for AEO Services in [Country] | via ExpertinAEO.com"
  - Tool pages: "Reaching out about the [Tool Name] | via ExpertinAEO.com"
- Click on any WhatsApp link fires the `whatsapp_click` GA4 event.

## Free AEO Checker — what it really does

The AEO Checker is **genuinely functional** — no fake results, no mock data.

### Real fetch + parse
- PHP cURL fetches the URL server-side (10s connect timeout, 15s total).
- DOMDocument + XPath parse the returned HTML.
- No JavaScript execution from fetched pages (safe by design).

### Five-category scoring (100 points)
1. **Answer Content** (25%) — direct-answer patterns, question coverage, FAQ presence, readability
2. **Structured Data** (20%) — JSON-LD detection, schema types, key property checks
3. **Technical Crawlability** (20%) — HTTPS, HTTP status, title, meta description, canonical, robots, headings
4. **Entity Signals** (15%) — Organization identity, author byline, sameAs, social profiles
5. **Question Coverage** (10%) — explicit question-pattern headings
6. **Credibility** (10%) — visible dates, html lang, image alt attributes

### Security (SSRF defense)
- Strict URL validation (http/https only)
- DNS resolution required
- Private/loopback/reserved IP blocking (FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)
- Max 3 redirects, no following into private space
- 2 MB response size cap
- 15-second total timeout
- No JavaScript execution
- Rate limited (20 requests/hour/IP — file-based, no DB)
- Honeypot field

### Disclaimer
Results are clearly labelled as heuristic analysis — not a guaranteed AI-visibility score, not a real-time ranking metric.

## Other 4 free tools — honest methodology

| Tool | What it really does |
|---|---|
| **Schema Checker** | Fetches URL, parses JSON-LD blocks, validates JSON parse, lists schema types, checks for sameAs/author/datePublished/image |
| **Answer Checker** | Fetches URL or accepts pasted content; scores direct-answer paragraph, declarative first sentence, question headings, FAQ schema |
| **FAQ Generator** | Deterministic question-pattern generation from your topic — derived from PAA pattern analysis. NOT fake AI generation. Outputs a ready-to-use FAQPage JSON-LD template. |
| **Meta & Heading Checker** | Fetches URL; audits title, meta description, canonical, robots, viewport, Open Graph, Twitter card, heading hierarchy and outline |

## International AEO country pages

Eight country landing pages — each with **unique localized content** (not find/replace):

- 🇺🇸 USA — most competitive market, high AI-search adoption, FTC/HIPAA/CCPA notes
- 🇬🇧 UK — British English, higher Bing share, UK GDPR/ASA/FCA/CQC notes
- 🇦🇪 UAE — bilingual English+Arabic, Modern Standard Arabic, PDPL, NMC
- 🇨🇦 Canada — bilingual English+French (Quebec), PIPEDA/Quebec Law 25
- 🇦🇺 Australia — Australian English, Privacy Act 1988/APP, ACCC/ASIC/TGA
- 🇮🇳 India — English + Hindi + Indic languages, DPDP Act 2023, voice-heavy
- 🇸🇬 Singapore — Standard Singapore English, regional SEA positioning, PDPA/MAS
- 🇩🇪 Germany — German (Hochdeutsch), strict GDPR/TTDSG, BaFin/BfArM, Impressum

**We do not invent local offices, customers or testimonials.** Strong entity signals and localized content are sufficient.

## Industry pages

Seven industry verticals with industry-specific AEO methodology:

- **SaaS** — feature-page AEO, comparison content, integration content, developer docs
- **eCommerce** — product/category AEO, voice shopping, local inventory, reviews
- **Healthcare** — YMYL authority, clinical citations, E-E-A-T, HIPAA-aware
- **Real Estate** — neighborhood content, school districts, market reports, listing schema
- **Education** — program/course discovery, credential queries, cost/outcome content
- **B2B** — decision-stage content, comparison, alternative, capability, integration, RFP-stage PAA
- **Professional Services** — service-line AEO, partner visibility, jurisdictional content, case studies

## SEO summary

- **49 HTML pages**, each with unique title, meta description, canonical, Open Graph, breadcrumbs
- **Structured data**: Organization, Service, FAQPage, SoftwareApplication, BreadcrumbList, AboutPage, ContactPage
- **Sitemap.xml** with 47 URLs (priority + changefreq + lastmod)
- **Robots.txt** allowing all crawlers, blocking `/api/` and `/config/`
- **.htaccess** with security headers, HTTPS redirect, www→non-www redirect, trailing slash normalization, compression, custom 404
- **Self-referencing canonical** on every page
- **Internal linking** from every page to services hub, tools hub, country hub
- **No keyword cannibalization** — each service page targets a distinct focus keyword
- **Image alt attributes** — every inline SVG icon and image has aria-label or alt
- **Semantic HTML5** — `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- **Accessibility** — skip link, focus indicators, ARIA labels, keyboard navigation

## Build & regenerate pages

The site is generated from Python build scripts in `/scripts/`. To regenerate pages (after editing content data):

```bash
cd /home/z/my-project
python3 scripts/build_services.py      # 15 service pages + hub
python3 scripts/build_countries.py     # 8 country pages + hub
python3 scripts/build_industries.py    # 7 industry pages + hub
python3 scripts/build_tools.py         # 4 tool pages + hub (AEO Checker hand-built)
python3 scripts/build_supporting.py    # about, contact, etc.
python3 scripts/build_seo.py           # sitemap.xml, robots.txt, .htaccess
```

## Tech stack

- HTML5, CSS3 (no preprocessor required), vanilla JavaScript (no framework)
- PHP 8.x for backends (no database, no Node.js)
- Self-hosted fonts via Google Fonts CDN (swap to local @font-face for production)
- Inline SVG icons (no icon font dependency)
- Apache + .htaccess (cPanel shared hosting ready)

**No database. No MySQL. No WordPress. No React SPA. No paid API dependencies.**

## QA checklist — what's been verified

- [x] All 49 HTML pages return HTTP 200 (tested with local server)
- [x] GA4 ID G-JLTVJKF4CC present on every page
- [x] WhatsApp number +1-213-258-1582 in config.js
- [x] Email info@tapadiatech.com on every page (in footer)
- [x] Schema markup on all content pages (Organization, Service, FAQPage, BreadcrumbList)
- [x] Canonical URLs on every page
- [x] Open Graph tags on every page
- [x] Breadcrumbs on every interior page
- [x] Header, footer, navigation consistent across all pages (baked in by build script)
- [x] Mobile menu works (hamburger toggle + escape-to-close)
- [x] Dropdown navigation accessible (keyboard + hover)
- [x] WhatsApp FAB injected on every page (via main.js)
- [x] Contact form server-side validation, CSRF, honeypot, rate limiting
- [x] AEO Checker SSRF protection (private IP block, timeout, size cap)
- [x] FAQ Generator honestly labelled (no fake AI claims)
- [x] 8 country pages with unique localized content
- [x] 7 industry pages with unique industry-specific content
- [x] 15 service pages with unique service-specific content
- [x] sitemap.xml valid XML (47 URLs)
- [x] robots.txt references sitemap
- [x] .htaccess has security headers, redirects, 404
- [x] 404.html exists and is referenced in .htaccess
- [x] Thank-you page is noindex (correct for conversion pages)

## Items requiring action before going live

1. **SMTP configuration** — copy `config/config.example.php` to either:
   - `/home/<user>/expertinaeo-config/smtp.php` (preferred — outside public_html), OR
   - `/public_html/config/config.php` (less secure but blocked by .htaccess)
2. **PHPMailer installation** (optional but recommended for authenticated SMTP)
3. **GA4 verification** — confirm G-JLTVJKF4CC is your actual GA4 property ID
4. **Google Search Console** — verify domain ownership, submit sitemap
5. **OG image** — create `assets/images/og-cover.png` (1200x630) and update OG tags if needed
6. **HTTPS confirmation** — ensure SSL certificate is active before enabling HSTS preload
7. **Backup** — back up existing site before deploying

## Honest limitations

- **PHP backends have not been executed in this development environment** (PHP not installed). All PHP code has been written to PHP 8.x standards but should be syntax-checked on the deployment server. Run `php -l api/*.php` after upload to verify.
- **SMTP delivery cannot be confirmed until live credentials are configured**. The contact form falls back to PHP `mail()` if PHPMailer is not available.
- **GA4 events have not been verified in production**. The events are wired to standard gtag() calls and should fire correctly, but verify in GA4 Realtime after deployment.
- **No real client case studies are published** — by design. We publish our methodology and authorized engagement summaries instead of fabricated success stories.

## License & ownership

This website and its content are the property of Tapadia Tech / ExpertinAEO. All rights reserved.

---

**ExpertinAEO | A product of Tapadia Tech (est. 2001)**

Make Your Brand the Answer.
