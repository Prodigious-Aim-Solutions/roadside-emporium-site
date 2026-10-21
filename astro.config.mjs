import { defineConfig } from 'astro/config';

// roadside-emporium-site#5 — GH Pages staging serves from a repo-name
// subpath (https://prodigious-aim-solutions.github.io/roadside-emporium-site/),
// while production (#6, not yet wired) will be the real custom domain at
// the root. DEPLOY_TARGET is set by deploy-pages.yml's build step only;
// a local/production build (no env var set) gets the production shape by
// default, same "staging is the opt-in" precedent knolocal-docs' own
// config comment documents.
const isGhPagesStaging = process.env.DEPLOY_TARGET === 'gh-pages';

export default defineConfig({
  site: isGhPagesStaging
    ? 'https://prodigious-aim-solutions.github.io'
    : 'https://theroadsideemporium.com',
  // Trailing slash matters here: BASE_URL doesn't normalize one in, so
  // without it every `${import.meta.env.BASE_URL}blog/...`-style link
  // (see src/pages/blog/index.astro) would miss a `/` between the repo
  // name and the path (confirmed directly — built as
  // "/roadside-emporium-siteblog/..." without this).
  base: isGhPagesStaging ? '/roadside-emporium-site/' : '/',
});
