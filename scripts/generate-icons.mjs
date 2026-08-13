import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = await readFile(new URL('../public/labs-icon-source.svg', import.meta.url));
const output = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
await Promise.all([
  sharp(source).resize(192, 192).png().toFile(output('labs-icon-192.png')),
  sharp(source).resize(512, 512).png().toFile(output('labs-icon-512.png')),
  sharp(source).resize(512, 512).flatten({ background: '#070912' }).png().toFile(output('labs-icon-512-maskable.png')),
]);
console.log('Generated Winesett Labs launcher icons.');
