# Launch checklist — Ochre Studio

A list of the "behind the scenes" things a website needs before it goes live, written for a static site built with AI help.

**This project:** a portfolio concept piece (Ochre Studio is fictional), hosted on Vercel at `https://ochre-studio.vercel.app`, no custom domain.

- [x] = done in this project
- [ ] = still to do (most of these need a decision from you, a domain, or a host)

---

## 1. Security

This is a static site: no server code, no database, no logins, no forms. That removes most attack surface. What's left is about how the files are delivered and what the page is allowed to load.

- [x] **No third-party scripts or styles.** Everything (fonts included) loads from your own domain.
- [x] **Content-Security-Policy.** Each page tells the browser to load scripts, styles, fonts and images only from your own site. If someone managed to inject code, the browser would refuse to run it. Set in each page's `<head>` and, more completely, as HTTP headers in `vercel.json`.
- [x] **No inline scripts or inline styles** (needed for the strict policy above to work).
- [x] **Security headers** in `vercel.json`: HTTPS-only (HSTS), no MIME sniffing, no framing (clickjacking protection), referrer policy, permissions policy.
- [x] **HTTPS.** Vercel provides it automatically on `*.vercel.app`.
- [ ] **After deploying, check the headers** at securityheaders.com (paste your Vercel URL). You should get an A or A+.
- [ ] **Turn on 2-factor login** for GitHub and Vercel. These accounts *are* your website's security.
- [ ] **Never commit secrets.** No API keys, passwords or `.env` files in the repo, ever. Anything in a public repo or in a web page's code is public. (Nothing like that is in this project.)
- [ ] **If you add a contact form later:** use a form service with spam protection (Formspree, Basin) or a Vercel function, validate on the server side, and add a privacy note.
- [ ] **The contact details belong to real people.** `ochre.com` is a real, registered domain with a working mail server, so `studio@ochre.com` emails a stranger. The original phone number had a valid Norwegian mobile format, and Akersbakken 12 is a real Oslo address. For a concept piece, make the details non-clickable or obviously fictional, or use your own.
  - [x] Email and phone are plain text now (no `mailto:`/`tel:` links), and phones are told not to auto-link them.
  - [x] Phone number replaced with `+47 012 34 567`. Norwegian 8-digit numbers start with 2–9, so this shouldn't reach anyone (worth a quick check against Nkom's numbering plan).
- [ ] *Optional:* `/.well-known/security.txt` with a contact address for people reporting vulnerabilities.

## 2. Privacy & legal (Norway / EU)

- [x] **Fonts self-hosted.** Loading Google Fonts/Fontshare from their CDN sends each visitor's IP address to a third party, which European data-protection authorities have objected to. Now nothing leaves your domain.
- [x] **No cookies, no tracking.** So no cookie banner is needed. If you add analytics, prefer a cookieless one (Plausible, Fathom, Simple Analytics) and you still won't need a banner.
- [x] **AI imagery labelled** in each project's details ("Imagery: AI-generated"), and Kaya marked as concept visuals.
- [x] **Business information / org. number:** not needed. Ochre Studio isn't a real business.
- [x] **No structured business data.** The homepage no longer tells search engines that a business exists at that address and phone number.
- [ ] **Label it as a concept.** A small "Concept project by …" credit (footer or project pages) stops visitors and search engines from mistaking it for a real studio, and credits you.
- [x] **Privacy policy:** not needed while the site collects nothing. Vercel Analytics, if you turn it on, is cookieless.
- [ ] **Photo licences.** Three photos come from Unsplash/Pexels (homepage Huset Eik card, contact interior, contact stone). Their licences allow this use; credit is appreciated but not required. Check the source of every other image too.
- [ ] **Font licences.** Satoshi and General Sans are under the ITF Free Font License, which allows commercial and web use. Keep a copy of the licence with the fonts.

## 3. Search engines & sharing

- [x] **Unique `<title>` and meta description on every page.**
- [x] **One `<h1>` per page**, logical headings below it.
- [x] **Alt text on every meaningful image.**
- [x] **`lang="en"`** on every page.
- [x] **Open Graph + X/Twitter tags** with a 1200×630 share image per page (`assets/og/`).
- [x] **Structured data** (JSON-LD) on the homepage describing the studio, address and contact.
- [x] **`robots.txt`** allowing all crawlers.
- [x] **Custom 404 page** (`404.html`).
- [x] **Absolute share-image URLs** (`og:image`, `og:url`) on `https://ochre-studio.vercel.app`.
- [x] **Canonical URLs** on every page, so Vercel preview URLs never compete with the real one in search results.
- [x] **`sitemap.xml`** with all 5 pages, referenced from `robots.txt`.
- [x] **404 page works from any URL** (its links are root-absolute; Vercel serves `404.html` automatically).
- [ ] **Name the Vercel project `ochre-studio`** so the URL matches. If that name is taken, Vercel gives you a different `*.vercel.app` address, and every `ochre-studio.vercel.app` in the HTML, `robots.txt` and `sitemap.xml` needs a find-and-replace.
- [ ] *Optional:* register in Google Search Console and submit the sitemap, if you want the portfolio piece findable.
- [ ] **Test link previews** with opengraph.xyz or by pasting a link into Slack/iMessage.

## 4. Icons & app metadata

- [x] `favicon.ico` (32px, for older browsers and the default `/favicon.ico` request)
- [x] `favicon.svg` (sharp at any size)
- [x] `apple-touch-icon.png` (180px, iOS home screen)
- [x] `icon-192.png`, `icon-512.png` + `site.webmanifest` (Android / "Add to home screen")
- [x] `theme-color` and `color-scheme`
- [ ] **Replace the placeholder mark.** The current icon is a simple white "O" on black. Swap in your own logo mark: replace `favicon.svg` and regenerate the PNGs from it.

## 5. Performance

- [x] Images below the first screen load lazily.
- [x] Hero image and main fonts are preloaded, so the first screen appears faster.
- [x] The three 8–10MB photos replaced with web-sized versions (originals kept in `assets/source/`, not in git).
- [x] Fonts are small (≈100KB total), self-hosted, `font-display: swap`.
- [x] Caching headers for images and fonts in `vercel.json`.
- [ ] **`footer-coast.png` is 1.5MB** for a 279px-wide image. Convert to JPEG/WebP at about 600px wide.
- [ ] **Modern formats + responsive images.** Serving WebP/AVIF with `srcset` (smaller files for phones) would roughly halve page weight.
- [ ] **Run Lighthouse** (Chrome DevTools → Lighthouse) on the live site; aim for 90+ in every category.

## 6. Accessibility

- [x] "Skip to content" link for keyboard users (press Tab on page load).
- [x] Visible focus outlines.
- [x] Menu opens/closes with keyboard, Escape closes it, focus returns to the burger button.
- [x] Reduced-motion setting respected. This matters for the upcoming motion work: animations should be disabled or calmer for people who've asked their OS for less motion.
- [ ] **Text that's too small on mobile.** The mobile footer and the mobile contact details use 8px text (from the Figma design). That's below what most people can read comfortably; 12px is a practical minimum.
- [ ] **White text on photos.** Check contrast on the project cards, especially pale images (Casa Marna, Kaya). A subtle dark gradient (like Casa Marna's desktop card) helps.
- [ ] **Trap focus inside the open mobile menu,** so Tab can't wander to the page behind it.
- [ ] **Test with a screen reader:** VoiceOver on Mac/iPhone (Cmd+F5 to toggle on Mac).

## 7. Content & QA

- [ ] **Instagram link** points nowhere (`#`). Add the real profile URL.
- [ ] **Proofread** all copy once more (British spelling is used consistently: "colour").
- [ ] **Test on real devices:** iPhone Safari, an Android phone, and Firefox on desktop. Firefox doesn't support the cap-height text trimming yet, so spacing there is slightly looser; it still works.
- [ ] **Click every link and button** on every page, including footer and mobile menu.
- [ ] **Check the browser console** on each page for errors (DevTools → Console).

## 8. Deployment & running the site

- [ ] **Import the GitHub repo into Vercel** (vercel.com → Add New → Project). Framework preset: **Other**. No build command, output directory = the repo root. Every push to `main` then deploys automatically.
- [x] **Preview deploys:** Vercel builds a preview URL for every branch and PR, and marks previews `noindex` automatically.
- [ ] *Optional:* uptime monitoring (UptimeRobot, free) to be emailed if the site goes down.
- [x] **Version control.** The site is in git and on GitHub, so every version is recoverable.

## 9. Habits when vibecoding

- **Never put secrets in front-end code.** Anything that runs in the browser is readable by anyone. If a feature needs a key, it needs a server-side piece (a serverless function), not a key in `main.js`.
- **Read before you commit.** Run `git status` and skim `git diff` so you know what's going in. Watch for stray files (`.env`, `.DS_Store`, `.Rhistory`, editor folders).
- **Check for leftover temporary URLs.** Design-tool exports often contain links that expire (e.g. Figma asset URLs). This project has none, since all assets are local.
- **Ask the AI to explain anything security-related** before accepting it, and be suspicious of suggestions to disable security features "to make it work".
- **Test on real devices**, not just the browser's phone preview. The mobile button bug in this project only showed up on a real phone.
- **Keep the design file as the source of truth,** and note any deliberate deviations (this project: smaller nav padding, full-height mobile menu, self-designed mobile project pages).
- **Don't add dependencies you don't need.** This site has none, which means nothing to update and nothing that can be compromised upstream.
