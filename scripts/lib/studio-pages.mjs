import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const validSlug = (slug) => typeof slug === 'string'
  && slug.length <= 63 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

export async function readStudioPages(root) {
  const registry = JSON.parse(await readFile(resolve(root, 'studio-pages.json'), 'utf8'));
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.pages)) {
    throw new Error('studio-pages.json needs schemaVersion 1 and a pages array.');
  }
  const slugs = new Set();
  for (const page of registry.pages) {
    if (!validSlug(page.slug) || slugs.has(page.slug)) {
      throw new Error(`Invalid or duplicate studio slug: ${page.slug}`);
    }
    if (typeof page.title !== 'string' || !page.title.trim()
      || !['product', 'collection'].includes(page.kind)) {
      throw new Error(`Invalid studio page: ${page.slug}`);
    }
    if (page.files !== undefined && (!Array.isArray(page.files)
      || !page.files.includes('index.html') || new Set(page.files).size !== page.files.length
      || page.files.some((file) => typeof file !== 'string'
        || !/^(?:[a-z0-9][a-z0-9-]*\/)*[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:html|css|svg|png|jpg|webp|woff2|ttf|txt)$/.test(file)
        || file.includes('..')))) {
      throw new Error(`Invalid studio file allowlist: ${page.slug}`);
    }
    slugs.add(page.slug);
  }
  return registry;
}

export function sitemapFor(pages) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ['/', ...pages.flatMap(({ slug, files = ['index.html'] }) => files
      .filter((file) => file === 'index.html' || file.endsWith('/index.html'))
      .map((file) => `/${slug}/${file.slice(0, -10)}`))]
      .map((path) => `  <url><loc>https://labs.winesett.com${path}</loc></url>\n`).join('')
    + '</urlset>\n';
}
