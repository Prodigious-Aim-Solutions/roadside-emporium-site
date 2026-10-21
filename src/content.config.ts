import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// roadside-emporium-site#2 fills this collection from the live WordPress
// REST API (37 posts, single category, no tags, no images — see
// knolocal#298's audit). Schema kept to what the source data actually has;
// nothing speculative added ahead of the real migration.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

export const collections = { blog };
