# roadside-emporium-site — CLAUDE.md

The marketing/landing/blog site for **The Roadside Emporium**, migrating off a self-hosted WordPress instance (always-on EC2) to a static site. Full audit of the original site (page inventory, post count, deploy target) and the migration plan live in [`knolocal#298`](https://github.com/Prodigious-Aim-Solutions/knolocal/issues/298) — read that before making structural changes here. This repo's own breakdown tickets (#1-#8) track the individual steps of that plan.

---

## Stack

- **Framework:** [Astro](https://astro.build/) 7, TypeScript (strict, `astro/tsconfigs/strict`)
- **Content:** a single `blog` content collection (`src/content.config.ts`, Markdown files under `src/content/blog/`) — schema is deliberately minimal (`title`, `date`) since that's all the source WordPress data actually has (no tags, no featured images, no custom fields; confirmed in `knolocal#298`'s audit)
- **Lint:** ESLint flat config (`eslint.config.js`) with `eslint-plugin-astro`

---

## Project Structure

```
src/
  content.config.ts        # `blog` collection definition (glob loader)
  content/
    blog/                  # one .md file per post
  layouts/
    BaseLayout.astro       # shared header (wordmark, social links, Blog link, CTA) — no footer, none exists on the live site
  pages/
    index.astro            # home ("For Roadside Stand Vendors" / "For App Users")
    vendors.astro
    users.astro
    blog/
      index.astro           # blog archive (real pagination, unlike the old WP /blog page)
      [...slug].astro       # individual post
```

---

## Key Patterns

**Real content has landed** (roadside-emporium-site#2): all 37 published WordPress posts and the 4 published pages' copy are in. The shared header (#3) is ported too, now themed (#9, see below). Analytics (#4) is ported too (see below). GH Pages staging (#5) is wired up, live at https://prodigious-aim-solutions.github.io/roadside-emporium-site/; S3 production (#6) isn't yet.

**Google Analytics (`gtag`) is ported verbatim from the live WordPress site** (roadside-emporium-site#4): `BaseLayout.astro`'s `<head>` loads the same `G-PWL36J9WDS` property via the standard two-script `gtag.js` snippet, so historical data stays in one property across the cutover rather than fragmenting into a second one. Loads unconditionally on every environment (local dev included) — the ticket's own scope is "same snippet as the live site," and the live site has always loaded it unconditionally too; there's no env-gating to replicate something that was never gated in the first place. One deliberate departure from a copy-paste of the official snippet: `window.gtag = gtag;` is added explicitly, assigning the local function to `window` — Astro's `define:vars` wraps inline script content in an IIFE to scope the injected variable, which would otherwise leave `gtag` a closure-local function instead of the global one other inline `gtag('event', ...)` calls elsewhere on the site would expect to find. **This can't be fully network-verified from inside this session's sandbox**: `googletagmanager.com` is blocked by this session's own egress policy (confirmed via `curl`: `CONNECT tunnel failed, response 403`, and via a CDP network trace showing both the `gtag/js` script request and the dataLayer-driven hit failing with `ERR_TUNNEL_CONNECTION_FAILED`) — the same class of sandbox-only limitation as the `cdnjs.cloudflare.com` block hit during #9's theming work, not a real site bug. What *was* verified directly in this sandbox: the rendered HTML carries the correct `<script async src=".../gtag/js?id=G-PWL36J9WDS">` tag and the inline config script with the right measurement ID, and a CDP `Runtime.evaluate` against the live preview confirmed `window.dataLayer` picks up the `'js'`/`'config'` entries and a manual `window.gtag('event', 'test_event')` call queues correctly. #4's own acceptance criteria ("confirmed working on staging") still needs a real, unsandboxed browser hitting the actual GH Pages staging URL — the GA Realtime report or browser Network tab there is the way to close that out, since this sandbox can't reach `googletagmanager.com` to do it end-to-end itself.

**The header's CTA deliberately doesn't match the live site** (roadside-emporium-site#3): the live WordPress header links to `alpha.theroadsideemporium.com`; this port links to `beta.theroadsideemporium.com` instead, per explicit direction — not a mistake if you're diffing against the live site and notice it differs. The dead/commented-out Mailchimp signup embed in the live header isn't ported either, since it was never functional there. Font Awesome (`cdnjs.cloudflare.com/.../font-awesome/6.4.0`) is loaded in `BaseLayout.astro`'s `<head>` purely so the Facebook/Instagram `<i class="fab fa-*">` icons actually render something — that's a functional dependency, not part of the "no theming yet" deferral, which is about the original theme's own CSS (not ported, and not planned to be — see below).

**Content migration is a one-time script, not a recurring sync** (`scripts/migrate-wp-content.mjs`, run once against a WXR export): `npm run migrate:wp -- --input <path-to-export.xml>`. Parses the export with `fast-xml-parser`, converts each published post's `content:encoded` HTML to Markdown with `node-html-markdown`, and writes `src/content/blog/<wp:post_name>.md` — the WordPress slug is kept exactly as the filename, so every post's URL carries over unchanged from the live site. Pages go to a gitignored scratch dir (`scripts/.wp-export-pages/`) for manual review before folding into `src/pages/*.astro` by hand, since that's page layout worth eyeballing, not prose to pipe straight through. **Never commit the raw WXR export itself** — it contains the site owner's real email address (`wp:author_email`) in cleartext, and this repo is public. The export the migration actually ran against had 13 draft posts and 1 draft page that were never live; the script skips drafts by default (`--include-drafts` opts in) since this ticket's job is a faithful port of what was *published*, not everything that ever existed in the WordPress install — whether to do anything with those drafts (there's real, finished-looking content in several of them) is an open question for whoever wants to revisit it, not decided here.

**WordPress's `wpautop()` auto-wraps bare paragraph text in `<p>` tags at render time** for content stored without explicit Gutenberg block markers (the `/`, `/vendors`, `/users` pages use this older "classic" content shape; the 37 blog posts all use real `<!-- wp:paragraph -->` blocks and don't have this problem). The raw `content:encoded` for those 3 pages has bare text nodes, not literal `<p>` elements — `src/pages/index.astro`/`vendors.astro`/`users.astro` add the `<p>` tags back by hand to match what the live site actually rendered, not what the export literally stores.

**Themed to match the app's "Weathered Wood" brand** (roadside-emporium-site#9): `src/styles/global.css` ports the same raw palette and Google Fonts URL `knolocal-docs#15` already used for the docs site — dark `--brand-bark`/`--brand-bark-dark` chrome, `--brand-gold`/`--brand-gold-mid` accents, `--brand-parchment`/`--brand-cream`/`--brand-tan` surfaces, `--brand-sienna`/`--brand-muted`/`--brand-faint` text, Special Elite headings + Inter body — plus the same darker `--brand-gold-text` (#8a6511) `knolocal-docs#15` settled on for WCAG-legible link/text color, since the raw `--brand-gold` only works as a fill on dark/interactive surfaces, not as text on a light background. `BaseLayout.astro` imports it; the CTA (`<h2><a>`) is styled to read as a real solid-gold button even though it's structurally a heading link. Light-only by design, same reasoning as `knolocal-docs#15` — no dark-mode pass without an actual dark-palette design. `blog/index.astro`/`blog/[...slug].astro` gained `.page-content`/`.blog-index-list`/`.post-content` wrapper classes to hook into the same card/surface treatment the rest of the site uses.

**Headless-Chromium screenshot verification has two sandbox-only gotchas, neither a real site bug** (hit and resolved while verifying #9): (1) **Fonts look wrong in a screenshot taken with the plain `--screenshot` CLI flag** — Special Elite rendered as a generic serif instead of its distinctive typewriter face. Root cause, confirmed via `--log-net-log`: the `.woff2` requests to `fonts.gstatic.com` get `CANCELLED` because `--screenshot` captures and exits right after the load event, before `font-display: swap`'s background font fetch finishes — not a CSS or import bug. Fixed verification-side by adding `--virtual-time-budget=5000 --run-all-compositor-stages-before-draw`, which gives the fetch time to complete (confirmed: both font files return clean `200`s in the net log) before capturing; the resulting screenshot shows the fonts rendering correctly. (2) **A screenshot taken via `--screenshot --window-size=390,844` (no device emulation) showed horizontal clipping** — card borders and button text cut off at the right edge, looking like a mobile overflow bug. Root cause, confirmed via a CDP session with `Emulation.setDeviceMetricsOverride({mobile: true, ...})`: `document.documentElement.scrollWidth` and `window.innerWidth` are both exactly `390` — there is no overflow. `--window-size` alone doesn't emulate an actual mobile viewport the way `width=device-width` expects; a screenshot taken with proper device-metrics emulation (or `Page.captureScreenshot` over CDP) renders correctly, CTA button wrapping cleanly onto two lines. If you need to re-verify a layout change at a narrow width, use real device-metrics emulation (CDP or a tool that sets it, e.g. Playwright's device emulation) rather than just a narrow `--window-size`, or you'll chase a phantom bug.

**No footer exists on the current live site at all** — confirmed directly during the `knolocal#298` audit (no legal links, no copyright line, nothing). Don't invent one as part of a "faithful port" ticket; adding a footer (and whether it should link to `knolocal-docs`' legal pages) is explicitly flagged in `knolocal#298` as a net-new decision, not part of the migration itself.

**`astro.config.mjs`'s `site`/`base` branch on a `DEPLOY_TARGET` env var** (roadside-emporium-site#5): unset (local dev, and the eventual production build) gets the real custom domain (`https://theroadsideemporium.com`, `base: '/'`); `DEPLOY_TARGET=gh-pages` (set only by `.github/workflows/deploy-pages.yml`'s build step) gets the GH Pages subpath shape (`https://prodigious-aim-solutions.github.io`, `base: '/roadside-emporium-site/'`). The trailing slash on that `base` value matters — `import.meta.env.BASE_URL` doesn't normalize one in, so any hand-written internal link has to be built as `` `${import.meta.env.BASE_URL}blog/...` `` (see `src/pages/blog/index.astro`) and a `base` without the trailing slash produces a concatenation bug (confirmed directly: built as `/roadside-emporium-siteblog/...`, missing the `/`). Astro's own `base` config only ever rewrites asset URLs *it* generates — never a plain string href written by hand — so every future hand-written internal link needs this same `BASE_URL`-prefix treatment, not a hardcoded absolute path. `BaseLayout.astro`'s header nav (#3) already follows this for its internal links (wordmark, Blog); its external links (Facebook, Instagram, the `beta.theroadsideemporium.com` CTA) correctly don't.

**Content collection schema is intentionally not padded ahead of need** — no `tags`, `category`, `image`, or `excerpt` fields, because the source data has none of those (single "Uncategorized" category across all 37 posts, no tags, zero images confirmed via the WordPress REST API). If a later ticket needs one of these, add it then rather than speculatively now.

---

## Dev Commands

```bash
npm install
npm run dev        # Astro dev server
npm run build      # astro check + astro build
npm run preview    # preview the production build locally
npm run typecheck  # astro check
npm run lint        # ESLint
npm run migrate:wp -- --input <path-to-wxr-export.xml>  # one-time WP content migration (#2) — see Key Patterns
```

---

## Deploy

- **Staging** — GitHub Pages, live at https://prodigious-aim-solutions.github.io/roadside-emporium-site/. `.github/workflows/deploy-pages.yml` typechecks, lints, builds (with `DEPLOY_TARGET=gh-pages`), and publishes to the `gh-pages` branch via `peaceiris/actions-gh-pages` on every push to `main`. This repo must stay public for GH Pages to work without a paid plan — not a practical concern here, since it's the public marketing site anyway.
- **Production** — not yet wired (roadside-emporium-site#6) — S3, mirroring `knolocal`/`knolocal-docs`'s own `scripts/deploy.mjs` pattern, on `v*` tags.

## After Making Changes

Run `npm run typecheck` and `npm run lint` before committing. There's no PR-gating CI yet — `deploy-pages.yml` runs those same checks on push to `main`, which catches a break only after it's already merged, not before — so running them locally first is the only thing stopping that right now.
