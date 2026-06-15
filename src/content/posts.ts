import type { ComponentType } from 'react';
import Post01 from './posts/01-sequential-decision-making.mdx';
import Post02 from './posts/02-combining-evidence-with-and.mdx';

// Registry of blog posts, newest last. Add a post by dropping an .mdx file in
// ./posts and appending an entry here. The essay prose lives in MDX; widgets are
// imported inside each .mdx file.
export interface PostMeta {
  slug: string; // URL segment: /#/p/<slug>
  title: string;
  summary: string;
  date: string; // ISO date (placeholder until published)
  Component: ComponentType;
}

export const posts: PostMeta[] = [
  {
    slug: 'sequential-decision-making',
    title: 'Asking good questions: efficient sequential decision-making',
    summary:
      'How an agent should pick its next question, why even splits are the goal, and how information theory lets us measure the difficulty of a task in bits.',
    date: '2026-06-07',
    Component: Post01,
  },
  {
    slug: 'combining-evidence-with-and',
    title: 'Combining evidence: the meet is a bitwise AND',
    summary:
      'A belief is a bitmask of still-possible secrets. Folding in a new answer is a single bitwise AND — the survivor set only ever shrinks.',
    date: '2026-06-07',
    Component: Post02,
  },
];

export function getPost(slug: string): PostMeta | undefined {
  return posts.find((p) => p.slug === slug);
}
