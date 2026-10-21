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
    BaseLayout.astro       # shared <head>/<body> shell — no real header/footer yet
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

**Real content has landed** (roadside-emporium-site#2): all 37 published WordPress posts and the 4 published pages' copy are in. The real shared header (#3) and analytics (#4) are still separate, not-yet-landed tickets. GH Pages staging (#5) is wired up, live at https://prodigious-aim-solutions.github.io/roadside-emporium-site/; S3 production (#6) isn't yet.

**Content migration is a one-time script, not a recurring sync** (`scripts/migrate-wp-content.mjs`, run once against a WXR export): `npm run migrate:wp -- --input <path-to-export.xml>`. Parses the export with `fast-xml-parser`, converts each published post's `content:encoded` HTML to Markdown with `node-html-markdown`, and writes `src/content/blog/<wp:post_name>.md` — the WordPress slug is kept exactly as the filename, so every post's URL carries over unchanged from the live site. Pages go to a gitignored scratch dir (`scripts/.wp-export-pages/`) for manual review before folding into `src/pages/*.astro` by hand, since that's page layout worth eyeballing, not prose to pipe straight through. **Never commit the raw WXR export itself** — it contains the site owner's real email address (`wp:author_email`) in cleartext, and this repo is public. The export the migration actually ran against had 13 draft posts and 1 draft page that were never live; the script skips drafts by default (`--include-drafts` opts in) since this ticket's job is a faithful port of what was *published*, not everything that ever existed in the WordPress install — whether to do anything with those drafts (there's real, finished-looking content in several of them) is an open question for whoever wants to revisit it, not decided here.

**WordPress's `wpautop()` auto-wraps bare paragraph text in `<p>` tags at render time** for content stored without explicit Gutenberg block markers (the `/`, `/vendors`, `/users` pages use this older "classic" content shape; the 37 blog posts all use real `<!-- wp:paragraph -->` blocks and don't have this problem). The raw `content:encoded` for those 3 pages has bare text nodes, not literal `<p>` elements — `src/pages/index.astro`/`vendors.astro`/`users.astro` add the `<p>` tags back by hand to match what the live site actually rendered, not what the export literally stores.

**Deliberately not re-themed yet.** `knolocal#298` is explicit that this migration is a faithful like-for-like port of the current WordPress site, not a "Weathered Wood" rebrand (the app's theme, `knolocal/src/theme.ts`) — that's separate future work, scoped once the port itself is live and stable. Don't add brand colors/fonts here ahead of that decision.

**No footer exists on the current live site at all** — confirmed directly during the `knolocal#298` audit (no legal links, no copyright line, nothing). Don't invent one as part of a "faithful port" ticket; adding a footer (and whether it should link to `knolocal-docs`' legal pages) is explicitly flagged in `knolocal#298` as a net-new decision, not part of the migration itself.

**`astro.config.mjs`'s `site`/`base` branch on a `DEPLOY_TARGET` env var** (roadside-emporium-site#5): unset (local dev, and the eventual production build) gets the real custom domain (`https://theroadsideemporium.com`, `base: '/'`); `DEPLOY_TARGET=gh-pages` (set only by `.github/workflows/deploy-pages.yml`'s build step) gets the GH Pages subpath shape (`https://prodigious-aim-solutions.github.io`, `base: '/roadside-emporium-site/'`). The trailing slash on that `base` value matters — `import.meta.env.BASE_URL` doesn't normalize one in, so any hand-written internal link has to be built as `` `${import.meta.env.BASE_URL}blog/...` `` (see `src/pages/blog/index.astro`) and a `base` without the trailing slash produces a concatenation bug (confirmed directly: built as `/roadside-emporium-siteblog/...`, missing the `/`). Astro's own `base` config only ever rewrites asset URLs *it* generates — never a plain string href written by hand — so every future hand-written internal link (the header nav in #3, especially) needs this same `BASE_URL`-prefix treatment, not a hardcoded absolute path.

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
