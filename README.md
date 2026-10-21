# roadside-emporium-site

The marketing/landing/blog site for **The Roadside Emporium**, migrating off WordPress (see [`knolocal#298`](https://github.com/Prodigious-Aim-Solutions/knolocal/issues/298) for the full audit and plan).

## Status

Scaffolding only ([roadside-emporium-site#1](https://github.com/Prodigious-Aim-Solutions/roadside-emporium-site/issues/1)) — placeholder pages and a single sample blog post. Real content lands in [#2](https://github.com/Prodigious-Aim-Solutions/roadside-emporium-site/issues/2), the real header in [#3](https://github.com/Prodigious-Aim-Solutions/roadside-emporium-site/issues/3).

## Stack

- [Astro](https://astro.build/) 5, TypeScript (strict)
- Content collections for the blog

## Dev Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # astro check + astro build
npm run preview   # preview the production build
npm run typecheck # astro check
npm run lint       # ESLint
```
