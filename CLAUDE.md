# roadside-emporium-site — CLAUDE.md

The marketing/landing/blog site for **The Roadside Emporium**, migrating off a self-hosted WordPress instance (always-on EC2) to a static site. Full audit of the original site (page inventory, post count, deploy target) and the migration plan live in [`knolocal#298`](https://github.com/Prodigious-Aim-Solutions/knolocal/issues/298) — read that before making structural changes here. This repo's own breakdown tickets (#1-#8) track the individual steps of that plan.

---

## Stack

- **Framework:** [Astro](https://astro.build/) 5, TypeScript (strict, `astro/tsconfigs/strict`)
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

**This is a scaffold-first repo** (roadside-emporium-site#1): pages exist with placeholder copy, and one sample post (`hello-world.md`) exists purely to exercise the content collection end-to-end. Real content (#2), the real shared header (#3), analytics (#4), and deploy wiring (#5/#6) are all separate, not-yet-landed tickets — don't assume any of those are done just because the page/route exists.

**Deliberately not re-themed yet.** `knolocal#298` is explicit that this migration is a faithful like-for-like port of the current WordPress site, not a "Weathered Wood" rebrand (the app's theme, `knolocal/src/theme.ts`) — that's separate future work, scoped once the port itself is live and stable. Don't add brand colors/fonts here ahead of that decision.

**No footer exists on the current live site at all** — confirmed directly during the `knolocal#298` audit (no legal links, no copyright line, nothing). Don't invent one as part of a "faithful port" ticket; adding a footer (and whether it should link to `knolocal-docs`' legal pages) is explicitly flagged in `knolocal#298` as a net-new decision, not part of the migration itself.

**`astro.config.mjs`'s `site`/`base`** are currently set for the eventual production custom domain (`https://theroadsideemporium.com`, `base: '/'`). GitHub Pages staging (roadside-emporium-site#5) needs `base: '/roadside-emporium-site/'` instead — that ticket will need to either branch the config per deploy target or override it at build time; not yet decided which.

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
```

---

## After Making Changes

Run `npm run typecheck` and `npm run lint` before committing — no CI is wired up yet (roadside-emporium-site#5/#6), so these are the only gate until then.
