import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readStudioPages, sitemapFor, validSlug } from './lib/studio-pages.mjs';

const [slug, title, ...extra] = process.argv.slice(2);
if (!validSlug(slug) || typeof title !== 'string' || !title.trim() || extra.length) {
  throw new Error('Usage: npm run new-product -- lowercase-slug "Product Name"');
}
const root = resolve('.');
const registry = await readStudioPages(root);
const labs = JSON.parse(await readFile(resolve(root, 'public/labs.json'), 'utf8'));
const directory = resolve(root, 'public', slug);
const existing = await lstat(directory).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (existing || registry.pages.some((page) => page.slug === slug)
  || labs.labs.some((lab) => lab.slug === slug)) {
  throw new Error(`Route already exists or is reserved: ${slug}`);
}
const escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const template = await readFile(resolve(root, 'templates/product.html'), 'utf8');
const html = template.replace(/{{(TITLE|SLUG)}}/g, (_, key) =>
  key === 'TITLE' ? escapeHtml(title.trim()) : slug);
const registryPath = resolve(root, 'studio-pages.json');
const sitemapPath = resolve(root, 'public/sitemap.xml');
const oldRegistry = await readFile(registryPath);
const oldSitemap = await readFile(sitemapPath);
registry.pages.push({ slug, title: title.trim(), kind: 'product' });
await mkdir(directory); // No recursive creation or overwrite of an existing route.
try {
  await writeFile(resolve(directory, 'index.html'), html, { flag: 'wx' });
  await writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n');
  await writeFile(sitemapPath, sitemapFor(registry.pages));
} catch (error) {
  await writeFile(registryPath, oldRegistry);
  await writeFile(sitemapPath, oldSitemap);
  await rm(directory, { recursive: true, force: true });
  throw error;
}
console.log(`Created /${slug}/. Edit public/${slug}/index.html, link it from the studio grid, and run npm run verify. Nothing has been published.`);
