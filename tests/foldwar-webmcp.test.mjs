import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html = await readFile(new URL('../public/foldwar/index.html', import.meta.url), 'utf8');
const source = html.match(/<script type="module" id="foldwar-site-tools">([\s\S]*?)<\/script>/)[1];
async function setup({ supported = true, fetch = () => { throw Error('unexpected fetch'); } } = {}) {
  const tools = new Map();
  const navigations = [];
  const document = supported ? { modelContext: { registerTool: async tool => tools.set(tool.name, tool) } } : {};
  await runInNewContext(`(async () => {${source}})()`, {
    document, URL, console, fetch,
    location: { origin: 'https://labs.winesett.com', pathname: '/foldwar/', assign: path => navigations.push(path) }
  });
  return { tools, navigations };
}

test('unsupported browsers need no polyfill or network request', async () => {
  const { tools } = await setup({ supported: false });
  assert.equal(tools.size, 0);
});

test('registers read and navigation tools with distinct side-effect hints', async () => {
  const { tools } = await setup();
  assert.equal(tools.size, 2);
  assert.equal(tools.get('read_foldwar_guide').annotations.readOnlyHint, true);
  assert.equal(tools.get('open_foldwar_guide').annotations.readOnlyHint, false);
});

test('rejects unknown routes, arbitrary URLs, inherited keys and extra arguments', async () => {
  const { tools, navigations } = await setup();
  for (const tool of tools.values()) {
    for (const input of [null, {}, { topic: 'https://example.com' }, { topic: '__proto__' }, { topic: '../' }, { topic: ['overview'] }, { topic: 'support', extra: true }]) {
      assert.ok((await tool.execute(input)).error);
    }
  }
  assert.equal(navigations.length, 0);
});

test('navigation is restricted to a known public guide', async () => {
  const { tools, navigations } = await setup();
  const result = await tools.get('open_foldwar_guide').execute({ topic: 'iphone_duo' });
  assert.equal(navigations[0], '/foldwar/iphone-duo/');
  assert.equal(result.navigatingTo, 'https://labs.winesett.com/foldwar/iphone-duo/');
});

test('guide fetch omits credentials, blocks redirects and reports HTTP failures', async () => {
  const { tools } = await setup({ fetch: async (url, options) => {
    assert.equal(url.href, 'https://labs.winesett.com/foldwar/support/');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    return { ok: false, status: 503 };
  } });
  const result = await tools.get('read_foldwar_guide').execute({ topic: 'support' });
  assert.equal(result.status, 503);
  assert.ok(result.error);
});

test('aborted reads return an actionable result', async () => {
  const { tools } = await setup();
  const result = await tools.get('read_foldwar_guide').execute({ topic: 'support' }, { signal: { aborted: true } });
  assert.equal(result.error, 'Reading was cancelled.');
});
