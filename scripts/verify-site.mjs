import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { basename, relative, resolve, sep } from 'node:path';

const repositoryRoot = resolve('.');
const publicRoot = resolve(repositoryRoot, 'public');
const releasesRoot = resolve(repositoryRoot, 'releases');
const requiredFiles = [
  'index.html',
  '404.html',
  'styles.css',
  'labs.json',
  'manifest.webmanifest',
  'labs-icon-192.png',
  'labs-icon-512.png',
  'labs-icon-512-maskable.png',
  '_headers',
  '.well-known/assetlinks.json',
];
const forbiddenNames = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'twa-manifest.json',
  'android.keystore',
  '.env',
  '.env.local',
]);
const forbiddenExtensions = [
  '.jks',
  '.keystore',
  '.key',
  '.p12',
  '.pfx',
  '.pem',
  '.map',
];
const maximumFiles = 20_000;
const maximumFileBytes = 25 * 1024 * 1024;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(directory, entry.name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`Public symlink is forbidden: ${path}`);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

for (const required of requiredFiles) {
  await readFile(resolve(publicRoot, required));
}

const files = await collectFiles(publicRoot);
if (files.length > maximumFiles) throw new Error(`Public file count exceeds ${maximumFiles}.`);

for (const file of files) {
  const relativePath = relative(publicRoot, file).split(sep).join('/');
  const name = basename(file);
  const stat = await lstat(file);
  if (stat.size > maximumFileBytes) throw new Error(`Public file exceeds 25 MiB: ${relativePath}`);
  if (forbiddenNames.has(name)) throw new Error(`Forbidden public file: ${relativePath}`);
  if (forbiddenExtensions.some((extension) => name.toLowerCase().endsWith(extension))) {
    throw new Error(`Forbidden public extension: ${relativePath}`);
  }
  if (relativePath.split('/').some((part) =>
    part.startsWith('.') && part !== '.well-known'
  )) {
    throw new Error(`Forbidden hidden public path: ${relativePath}`);
  }
}

const registry = JSON.parse(await readFile(resolve(publicRoot, 'labs.json'), 'utf8'));
if (registry.schemaVersion !== 1 || !Array.isArray(registry.labs)) {
  throw new Error('labs.json must use schemaVersion 1 and a labs array.');
}
const registryBySlug = new Map();
for (const lab of registry.labs) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lab.slug)) throw new Error('Invalid lab slug.');
  if (registryBySlug.has(lab.slug)) throw new Error(`Duplicate lab slug: ${lab.slug}`);
  for (const field of ['title', 'description', 'status', 'iconPath', 'launchPath']) {
    if (typeof lab[field] !== 'string' || !lab[field]) {
      throw new Error(`Lab ${lab.slug} is missing ${field}.`);
    }
  }
  if (!Array.isArray(lab.technologies) || lab.technologies.length === 0) {
    throw new Error(`Lab ${lab.slug} needs at least one technology label.`);
  }
  if (lab.launchPath !== `/${lab.slug}/`) throw new Error(`Invalid launch path for ${lab.slug}.`);
  registryBySlug.set(lab.slug, lab);
}

const assetlinks = JSON.parse(
  await readFile(resolve(publicRoot, '.well-known', 'assetlinks.json'), 'utf8'),
);

const launcherManifest = JSON.parse(
  await readFile(resolve(publicRoot, 'manifest.webmanifest'), 'utf8'),
);
if (launcherManifest.start_url !== '/' || launcherManifest.scope !== '/') {
  throw new Error('The Winesett Labs launcher manifest must use root start_url and scope.');
}
if (launcherManifest.name !== 'Winesett Labs') {
  throw new Error('Unexpected launcher manifest name.');
}
if (!Array.isArray(assetlinks)) throw new Error('assetlinks.json must contain an array.');
const packages = new Set();
for (const statement of assetlinks) {
  const packageName = statement?.target?.package_name;
  const fingerprints = statement?.target?.sha256_cert_fingerprints;
  if (statement?.target?.namespace !== 'android_app' || !packageName) {
    throw new Error('Invalid Digital Asset Links target.');
  }
  if (!statement.relation?.includes('delegate_permission/common.handle_all_urls')) {
    throw new Error(`Invalid Digital Asset Links relation for ${packageName}.`);
  }
  if (!Array.isArray(fingerprints) || fingerprints.length === 0) {
    throw new Error(`Missing signing fingerprint for ${packageName}.`);
  }
  if (packages.has(packageName)) throw new Error(`Duplicate package in assetlinks.json: ${packageName}`);
  packages.add(packageName);
}

const releaseFiles = (await readdir(releasesRoot))
  .filter((name) => name.endsWith('.json'))
  .sort();
const releaseSlugs = new Set(releaseFiles.map((name) => name.slice(0, -5)));
for (const slug of registryBySlug.keys()) {
  if (!releaseSlugs.has(slug)) throw new Error(`Registry entry has no imported release: ${slug}`);
}

const publicDirectories = (await readdir(publicRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== '.well-known')
  .map((entry) => entry.name)
  .sort();
for (const directory of publicDirectories) {
  if (!releaseSlugs.has(directory)) throw new Error(`Public demo has no provenance: ${directory}`);
}

for (const releaseFile of releaseFiles) {
  const provenancePath = resolve(releasesRoot, releaseFile);
  const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
  const slug = provenance.slug;
  if (releaseFile !== `${slug}.json`) throw new Error(`Release filename mismatch: ${releaseFile}`);
  if (!registryBySlug.has(slug)) throw new Error(`Imported release is missing from labs.json: ${slug}`);
  if (provenance.assetlinksOwner !== 'winesett/labs.winesett.com') {
    throw new Error(`Unexpected Asset Links owner for ${slug}.`);
  }
  if (provenance.expectedPublicUrl !== `https://labs.winesett.com/${slug}/`) {
    throw new Error(`Unexpected public URL for ${slug}.`);
  }
  const publishedRoot = resolve(publicRoot, slug);
  const publishedFiles = await collectFiles(publishedRoot);
  if (publishedFiles.length !== provenance.fileCount) {
    throw new Error(`Published file count mismatch for ${slug}.`);
  }
  for (const entry of provenance.files) {
    const relativePath = entry.path.slice(provenance.archiveRoot.length);
    const bytes = await readFile(resolve(publishedRoot, relativePath));
    if (sha256(bytes) !== entry.sha256) {
      throw new Error(`Published SHA-256 mismatch: ${entry.path}`);
    }
  }
  const matchingStatement = assetlinks.find(
    (statement) => statement.target.package_name === provenance.androidPackageName,
  );
  if (!matchingStatement) {
    throw new Error(`assetlinks.json is missing ${provenance.androidPackageName}.`);
  }
  if (!matchingStatement.target.sha256_cert_fingerprints.includes(
    provenance.signingCertificateSha256,
  )) {
    throw new Error(`assetlinks.json has the wrong fingerprint for ${provenance.androidPackageName}.`);
  }
  const manifest = JSON.parse(
    await readFile(resolve(publishedRoot, 'manifest.webmanifest'), 'utf8'),
  );
  if (manifest.start_url !== `/${slug}/` || manifest.scope !== `/${slug}/`) {
    throw new Error(`PWA scope mismatch for ${slug}.`);
  }
}

console.log(`Verified ${files.length} public files and ${releaseFiles.length} lab releases.`);
