#!/usr/bin/env node
// roadside-emporium-site#2 — one-time migration from a WordPress WXR
// export into this repo. Not a recurring sync: run once, review the
// output, commit it, done. See knolocal#298 for the source site's full
// audit (37 published posts, 4 published pages, zero images, no
// galleries/embeds/shortcodes — confirmed directly against this export).
//
// Usage:
//   node scripts/migrate-wp-content.mjs --input <path-to-wxr.xml> [--include-drafts]
//
// Published posts  -> src/content/blog/<slug>.md (title + date frontmatter,
//                      matching src/content.config.ts's schema)
// Published pages  -> scripts/.wp-export-pages/<slug>.html (Gutenberg
//                      block comments stripped, otherwise untouched) —
//                      a *staging* output for manual review and folding
//                      into src/pages/*.astro by hand, not auto-applied,
//                      since that's page chrome worth eyeballing before
//                      it ships. Never committed (gitignored).
//
// --include-drafts additionally processes draft-status posts/pages the
// same way, into the same destinations — off by default, since this
// migration's job is a faithful port of what was actually live, not
// everything that ever existed in the WordPress install.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

function parseArgs(argv) {
  const args = { includeDrafts: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--include-drafts') args.includeDrafts = true;
  }
  if (!args.input) {
    console.error('Usage: node scripts/migrate-wp-content.mjs --input <path-to-wxr.xml> [--include-drafts]');
    process.exit(1);
  }
  return args;
}

function cdata(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return node.__cdata ?? '';
}

// WordPress's block editor wraps every block in `<!-- wp:type --> ... <!--
// /wp:type -->` HTML comments. They're real HTML comments, so a proper
// HTML parser (which node-html-markdown uses internally) already discards
// them on its own — nothing to strip for the Markdown conversion path.
// The *pages* path keeps raw HTML instead of converting to Markdown (this
// content is page layout — nested benefit-item divs — not prose), so
// those comments are stripped explicitly there, since nothing else would.
function stripBlockComments(html) {
  return html.replace(/<!--\s*\/?wp:[^>]*-->/g, '').trim();
}

function slugify(name) {
  return name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

function main() {
  const { input, includeDrafts } = parseArgs(process.argv.slice(2));

  const xml = readFileSync(input, 'utf-8');
  const parser = new XMLParser({ cdataPropName: '__cdata', ignoreAttributes: false });
  const doc = parser.parse(xml);

  const items = doc.rss.channel.item;
  const allowedStatuses = includeDrafts ? ['publish', 'draft'] : ['publish'];

  const posts = items.filter(
    (it) => cdata(it['wp:post_type']) === 'post' && allowedStatuses.includes(cdata(it['wp:status']))
  );
  const pages = items.filter(
    (it) => cdata(it['wp:post_type']) === 'page' && allowedStatuses.includes(cdata(it['wp:status']))
  );

  const blogDir = join(repoRoot, 'src/content/blog');
  mkdirSync(blogDir, { recursive: true });

  let postCount = 0;
  for (const post of posts) {
    const title = cdata(post.title);
    const slug = cdata(post['wp:post_name']) || slugify(title);
    const date = cdata(post['wp:post_date']).slice(0, 10); // YYYY-MM-DD
    const html = cdata(post['content:encoded']);
    const markdown = NodeHtmlMarkdown.translate(html);

    // YAML frontmatter: double-quoted title with internal quotes escaped,
    // matching src/content/blog/hello-world.md's existing style.
    const frontmatter = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: ${date}\n---\n\n`;
    writeFileSync(join(blogDir, `${slug}.md`), frontmatter + markdown + '\n');
    postCount++;
  }

  const pagesOutDir = join(repoRoot, 'scripts/.wp-export-pages');
  mkdirSync(pagesOutDir, { recursive: true });

  let pageCount = 0;
  for (const page of pages) {
    const title = cdata(page.title);
    const slug = cdata(page['wp:post_name']) || slugify(title);
    const html = stripBlockComments(cdata(page['content:encoded']));
    writeFileSync(join(pagesOutDir, `${slug}.html`), html + '\n');
    pageCount++;
  }

  console.log(`Migrated ${postCount} post(s) into ${blogDir}`);
  console.log(`Migrated ${pageCount} page(s) into ${pagesOutDir} (review and fold into src/pages/*.astro by hand)`);
  if (!includeDrafts) {
    const draftPostCount = items.filter(
      (it) => cdata(it['wp:post_type']) === 'post' && cdata(it['wp:status']) === 'draft'
    ).length;
    const draftPageCount = items.filter(
      (it) => cdata(it['wp:post_type']) === 'page' && cdata(it['wp:status']) === 'draft'
    ).length;
    if (draftPostCount || draftPageCount) {
      console.log(
        `Skipped ${draftPostCount} draft post(s) and ${draftPageCount} draft page(s) (never published) — pass --include-drafts to migrate those too.`
      );
    }
  }
}

main();
