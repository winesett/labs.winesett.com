import { createHash } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';

const [archiveArgument, provenanceArgument] = process.argv.slice(2);
if (!archiveArgument || !provenanceArgument) {
  throw new Error('Usage: npm run import-demo -- <archive.tar.gz> <provenance.json>');
}

const repositoryRoot = resolve('.');
const publicRoot = resolve(repositoryRoot, 'public');
const releasesRoot = resolve(repositoryRoot, 'releases');
const archivePath = resolve(archiveArgument);
const provenancePath = resolve(provenanceArgument);
const expectedOrigin = 'https://labs.winesett.com';
const expectedAssetlinksOwner = 'winesett/labs.winesett.com';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function parseString(buffer, start, length) {
  const end = buffer.indexOf(0, start);
  const sliceEnd = end === -1 || end > start + length ? start + length : end;
  return buffer.subarray(start, sliceEnd).toString('utf8');
}

function parseOctal(buffer, start, length) {
  const value = parseString(buffer, start, length).trim();
  if (!/^[0-7]*$/.test(value)) throw new Error('Archive contains an invalid tar size.');
  return value ? Number.parseInt(value, 8) : 0;
}

function parseArchive(archiveBytes) {
  const tar = gunzipSync(archiveBytes);
  const files = new Map();
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    const path = parseString(header, 0, 100);
    const size = parseOctal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    if (type !== '0') throw new Error(`Archive entry is not a regular file: ${path}`);
    if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').includes('..')) {
      throw new Error(`Unsafe archive path: ${path}`);
    }
    if (files.has(path)) throw new Error(`Duplicate archive path: ${path}`);

    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > tar.length) throw new Error(`Truncated archive entry: ${path}`);
    files.set(path, tar.subarray(dataStart, dataEnd));
    offset = dataStart + Math.ceil(size / 512) * 512;
  }

  return files;
}

function assertContract(provenance, archiveBytes, files) {
  if (provenance.schemaVersion !== 1) throw new Error('Unsupported provenance schema.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(provenance.slug)) throw new Error('Invalid demo slug.');
  if (provenance.assetlinksOwner !== expectedAssetlinksOwner) {
    throw new Error('The hub repository must own Digital Asset Links.');
  }
  if (basename(archivePath) !== provenance.archiveFile) throw new Error('Archive filename mismatch.');
  if (sha256(archiveBytes) !== provenance.archiveSha256) throw new Error('Archive SHA-256 mismatch.');
  if (provenance.archiveRoot !== `${provenance.slug}/`) throw new Error('Archive root mismatch.');
  if (provenance.expectedPublicUrl !== `${expectedOrigin}/${provenance.slug}/`) {
    throw new Error('Unexpected public URL.');
  }
  if (provenance.expectedManifestUrl !== `${provenance.expectedPublicUrl}manifest.webmanifest`) {
    throw new Error('Unexpected manifest URL.');
  }
  if (provenance.expectedEntrypointPath !== `${provenance.slug}/index.html`) {
    throw new Error('Unexpected entrypoint path.');
  }
  if (provenance.expectedManifestPath !== `${provenance.slug}/manifest.webmanifest`) {
    throw new Error('Unexpected manifest path.');
  }
  if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(provenance.androidPackageName)) {
    throw new Error('Invalid Android package name.');
  }
  if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(provenance.signingCertificateSha256)) {
    throw new Error('Invalid signing certificate fingerprint.');
  }
  if (!Array.isArray(provenance.files) || provenance.fileCount !== provenance.files.length) {
    throw new Error('Provenance file count mismatch.');
  }
  if (files.size !== provenance.fileCount) throw new Error('Archive file count mismatch.');

  const expectedPaths = new Set();
  for (const entry of provenance.files) {
    if (expectedPaths.has(entry.path)) throw new Error(`Duplicate provenance path: ${entry.path}`);
    if (!entry.path.startsWith(provenance.archiveRoot)) {
      throw new Error(`File is outside the archive root: ${entry.path}`);
    }
    const bytes = files.get(entry.path);
    if (!bytes) throw new Error(`Archive is missing ${entry.path}`);
    if (sha256(bytes) !== entry.sha256) throw new Error(`File SHA-256 mismatch: ${entry.path}`);
    expectedPaths.add(entry.path);
  }

  for (const path of files.keys()) {
    if (!expectedPaths.has(path)) throw new Error(`Archive contains an undeclared file: ${path}`);
  }
}

async function writeImportedFiles(stagingRoot, provenance, files) {
  for (const [path, bytes] of files) {
    const relativePath = path.slice(provenance.archiveRoot.length);
    const destination = resolve(stagingRoot, relativePath);
    if (!destination.startsWith(`${stagingRoot}${sep}`)) throw new Error(`Unsafe output path: ${path}`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: 'wx' });
  }
}

async function mergeAssetlinks(provenance) {
  const assetlinksPath = resolve(publicRoot, '.well-known', 'assetlinks.json');
  const statements = JSON.parse(await readFile(assetlinksPath, 'utf8'));
  if (!Array.isArray(statements)) throw new Error('assetlinks.json must contain an array.');

  const filtered = statements.filter(
    (statement) => statement?.target?.package_name !== provenance.androidPackageName,
  );
  filtered.push({
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: provenance.androidPackageName,
      sha256_cert_fingerprints: [provenance.signingCertificateSha256],
    },
  });
  filtered.sort((left, right) =>
    left.target.package_name.localeCompare(right.target.package_name),
  );
  await writeFile(assetlinksPath, `${JSON.stringify(filtered, null, 2)}\n`);
}

const archiveBytes = await readFile(archivePath);
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
const files = parseArchive(archiveBytes);
assertContract(provenance, archiveBytes, files);

const stagingRoot = resolve(publicRoot, `.${provenance.slug}.importing-${Date.now()}`);
const destinationRoot = resolve(publicRoot, provenance.slug);
if (destinationRoot !== resolve(publicRoot, provenance.slug)) throw new Error('Invalid destination.');

await mkdir(stagingRoot, { recursive: false });
try {
  await writeImportedFiles(stagingRoot, provenance, files);
  await rm(destinationRoot, { recursive: true, force: true });
  await rename(stagingRoot, destinationRoot);
} catch (error) {
  await rm(stagingRoot, { recursive: true, force: true });
  throw error;
}

await mkdir(releasesRoot, { recursive: true });
await writeFile(
  resolve(releasesRoot, `${provenance.slug}.json`),
  `${JSON.stringify(provenance, null, 2)}\n`,
);
await mergeAssetlinks(provenance);

console.log(`Imported ${provenance.slug} from ${provenance.sourceCommit}.`);
