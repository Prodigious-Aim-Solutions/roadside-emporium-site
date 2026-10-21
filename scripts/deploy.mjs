#!/usr/bin/env node
// Deploys the contents of dist/ to S3 using AWS SDK v3 — ported from
// knolocal/scripts/deploy.mjs's shape (roadside-emporium-site#6). Unlike
// knolocal, this site has no S3 staging bucket (staging is GH Pages,
// deploy-pages.yml) — this script only ever targets production, run on a
// v* tag.
//
// Required env vars:
//   AWS_KNO_ACCESS_KEY_ID      reused from knolocal's own IAM credentials
//   AWS_KNO_SECRET_ACCESS_KEY  (by explicit choice — not a dedicated IAM
//                              user for this repo)
//   S3_BUCKET                  no default — this is a new bucket with no
//                              established name to fall back to, unlike
//                              knolocal's literal 'knolocal' default
//
// Optional env vars (default shown):
//   S3_REGION   ca-central-1

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname } from 'path'

const BUCKET = process.env.S3_BUCKET
const REGION = process.env.S3_REGION ?? 'ca-central-1'
const DIST_DIR = 'dist'

if (!BUCKET) {
  console.error('Missing required env var: S3_BUCKET')
  process.exit(1)
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.xml':  'application/xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.webp': 'image/webp',
  '.txt':  'text/plain',
}

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...walk(full))
    } else {
      files.push(full)
    }
  }
  return files
}

const client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_KNO_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_KNO_SECRET_ACCESS_KEY,
  },
})

const files = walk(DIST_DIR)
console.log(`Deploying ${files.length} files to s3://${BUCKET} (${REGION})\n`)

for (const file of files) {
  const key = relative(DIST_DIR, file).replace(/\\/g, '/')
  const ext = extname(file)
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'

  // index.html (every route's own index.html, this is a static-file site
  // with no fingerprinted HTML) must not be cached — it's what references
  // the hashed asset filenames below. Astro's own build output hashes
  // every asset filename (JS/CSS/images under /_astro/), so those can be
  // cached indefinitely — a changed file is a new URL, never a stale one.
  const cacheControl = key.endsWith('index.html')
    ? 'no-cache, no-store, must-revalidate'
    : 'public, max-age=31536000, immutable'

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: readFileSync(file),
    ContentType: contentType,
    CacheControl: cacheControl,
  }))

  console.log(`  ✓ ${key}`)
}

console.log(`\nDone — deployed ${files.length} files.`)
