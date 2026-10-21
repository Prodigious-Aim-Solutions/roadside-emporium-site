import { defineConfig } from 'astro/config';

// site/base are placeholders until roadside-emporium-site#5/#6 (deploy
// wiring) land — GH Pages staging needs base: '/roadside-emporium-site/',
// production (the real custom domain) needs base: '/'. Left as the
// production shape for now since this repo's own dev/build don't need it.
export default defineConfig({
  site: 'https://theroadsideemporium.com',
});
