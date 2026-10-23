import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), 'labs-studio-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of ['scripts', 'templates', 'public', 'releases', 'studio-pages.json']) {
    await cp(resolve(path), resolve(root, path), { recursive: true });
  }
  return root;
}
function run(root, script, ...args) {
  return spawnSync(process.execPath, [`scripts/${script}.mjs`, ...args], {
    cwd: root, encoding: 'utf8',
  });
}
function passes(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('new product is branded, escaped, registered, and accepted without changing demos', async (t) => {
  const root = await fixture(t);
  passes(run(root, 'new-product', 'test-product', 'Test <Idea> & "Co"'));
  const html = await readFile(resolve(root, 'public/test-product/index.html'), 'utf8');
  assert.match(html, /Test &lt;Idea&gt; &amp; &quot;Co&quot;/);
  assert.match(html, /From Winesett Labs/);
  assert.match(html, /https:\/\/labs\.winesett\.com\/test-product\//);
  passes(run(root, 'verify-site'));
  const sitemap = await readFile(resolve(root, 'public/sitemap.xml'), 'utf8');
  assert.match(sitemap, /\/test-product\//);
});

test('collisions and traversal are rejected without modifying existing files', async (t) => {
  const root = await fixture(t);
  const original = await readFile(resolve(root, 'studio-pages.json'), 'utf8');
  const fold = await readFile(resolve(root, 'public/foldwar/index.html'), 'utf8');
  for (const slug of ['foldwar', 'spinning-tunnel', '../escape', 'Bad Name', '.well-known']) {
    assert.notEqual(run(root, 'new-product', slug, 'Collision').status, 0);
  }
  assert.equal(await readFile(resolve(root, 'studio-pages.json'), 'utf8'), original);
  assert.equal(await readFile(resolve(root, 'public/foldwar/index.html'), 'utf8'), fold);
  passes(run(root, 'verify-site'));
});

test('unregistered pages and attempts to bypass demo provenance fail verification', async (t) => {
  const root = await fixture(t);
  await mkdir(resolve(root, 'public/unregistered'));
  await writeFile(resolve(root, 'public/unregistered/index.html'), 'Unexpected');
  assert.match(run(root, 'verify-site').stderr, /Public demo has no provenance/);
  await rm(resolve(root, 'public/unregistered'), { recursive: true });
  const registry = JSON.parse(await readFile(resolve(root, 'studio-pages.json'), 'utf8'));
  registry.pages.push({ slug: 'spinning-tunnel', title: 'Bypass', kind: 'product' });
  await writeFile(resolve(root, 'studio-pages.json'), JSON.stringify(registry));
  assert.match(run(root, 'verify-site').stderr, /conflicts with audited demo/);
});

test('missing pages, extra product files, and stale sitemaps fail verification', async (t) => {
  const root = await fixture(t);
  passes(run(root, 'new-product', 'test-product', 'Test'));
  await writeFile(resolve(root, 'public/test-product/unreviewed.js'), 'unexpected');
  assert.match(run(root, 'verify-site').stderr, /must match the explicit allowlist/);
  await rm(resolve(root, 'public/test-product/unreviewed.js'));
  await writeFile(resolve(root, 'public/sitemap.xml'), 'stale');
  assert.match(run(root, 'verify-site').stderr, /sitemap.xml must match/);
  await rm(resolve(root, 'public/test-product'), { recursive: true });
  assert.match(run(root, 'verify-site').stderr, /Missing studio directory/);
});

test('explicit support pages and assets are accepted, indexed, and checked for missing files', async (t) => {
  const root = await fixture(t);
  const { sitemapFor } = await import('../scripts/lib/studio-pages.mjs');
  passes(run(root, 'new-product', 'test-product', 'Test'));
  await mkdir(resolve(root, 'public/test-product/support'));
  await writeFile(resolve(root, 'public/test-product/support/index.html'), '<h1>Support</h1>');
  await writeFile(resolve(root, 'public/test-product/theme.css'), 'body { color: blue; }');
  const registry = JSON.parse(await readFile(resolve(root, 'studio-pages.json'), 'utf8'));
  registry.pages.find((p) => p.slug === 'test-product').files = ['index.html', 'support/index.html', 'theme.css'];
  await writeFile(resolve(root, 'studio-pages.json'), JSON.stringify(registry));
  const sitemap = sitemapFor(registry.pages);
  assert.match(sitemap, /\/test-product\/support\//);
  assert.doesNotMatch(sitemap, /theme.css/);
  await writeFile(resolve(root, 'public/sitemap.xml'), sitemap);
  passes(run(root, 'verify-site'));
  await rm(resolve(root, 'public/test-product/theme.css'));
  assert.match(run(root, 'verify-site').stderr, /must match the explicit allowlist/);
});

test('product file allowlists reject traversal, unsafe types, duplicates, and absent landing page', async (t) => {
  const root = await fixture(t);
  const registry = JSON.parse(await readFile(resolve(root, 'studio-pages.json'), 'utf8'));
  for (const files of [
    ['index.html', '../secret.txt'], ['index.html', '/absolute.css'],
    ['index.html', '.env'], ['index.html', 'unreviewed.js'],
    ['index.html', 'index.html'], ['support/index.html'],
    ['index.html', 'support/../../escape.html'], ['index.html', 'assets/back\\slash.png'],
  ]) {
    registry.pages[0].files = files;
    await writeFile(resolve(root, 'studio-pages.json'), JSON.stringify(registry));
    assert.match(run(root, 'verify-site').stderr, /Invalid studio file allowlist/);
  }
});

test('presentation assets require an explicit opt-in and remain subject to exact-file verification', async (t) => {
  const root = await fixture(t);
  const { sitemapFor } = await import('../scripts/lib/studio-pages.mjs');
  passes(run(root, 'new-product', 'presentation-test', 'Presentation'));
  const registry = JSON.parse(await readFile(resolve(root, 'studio-pages.json'), 'utf8'));
  const page = registry.pages.find((p) => p.slug === 'presentation-test');
  page.files = ['index.html', 'scene.js', 'model.glb', 'font-license.pdf'];
  page.presentation = { description: 'Reviewed product illustration only.', files: ['scene.js', 'model.glb'] };
  for (const file of page.files.slice(1)) await writeFile(resolve(root, 'public/presentation-test', file), 'fixture');
  await writeFile(resolve(root, 'studio-pages.json'), JSON.stringify(registry));
  await writeFile(resolve(root, 'public/sitemap.xml'), sitemapFor(registry.pages));
  passes(run(root, 'verify-site'));
  await writeFile(resolve(root, 'public/presentation-test/unlisted.js'), 'extra');
  assert.match(run(root, 'verify-site').stderr, /must match the explicit allowlist/);
  await rm(resolve(root, 'public/presentation-test/unlisted.js'));
  delete page.presentation;
  await writeFile(resolve(root, 'studio-pages.json'), JSON.stringify(registry));
  assert.match(run(root, 'verify-site').stderr, /Invalid studio file allowlist/);
});

test('presentation declarations reject unsafe, undeclared, duplicate, and non-product runtime files', async (t) => {
  const root = await mkdtemp(resolve(tmpdir(), 'labs-presentation-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { readStudioPages } = await import('../scripts/lib/studio-pages.mjs');
  const base = { slug: 'product', title: 'Product', kind: 'product', files: ['index.html', 'scene.js'] };
  const declared = { description: 'Product illustration.', files: ['scene.js'] };
  const cases = [
    { presentation: { ...declared, description: '' } },
    { presentation: { ...declared, files: [] } },
    { presentation: { ...declared, files: ['scene.js', 'scene.js'] } },
    { presentation: { ...declared, files: ['../scene.js'] } },
    { presentation: { ...declared, files: ['/scene.js'] } },
    { presentation: { ...declared, files: ['missing.js'] } },
    { presentation: { ...declared, files: ['server.mjs'] } },
    { presentation: { ...declared, files: ['secret.key'] } },
    { presentation: { ...declared, files: ['.hidden.js'] } },
    { kind: 'collection', presentation: declared },
    { files: undefined, presentation: declared },
    { files: {}, presentation: declared },
  ];
  for (const change of cases) {
    await writeFile(resolve(root, 'studio-pages.json'), JSON.stringify({ schemaVersion: 1, pages: [{ ...base, ...change }] }));
    await assert.rejects(readStudioPages(root), /Invalid studio presentation allowlist/);
  }
});
