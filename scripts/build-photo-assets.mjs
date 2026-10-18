/** Encode supplied photo plates and bake lossless 16-bit UVs into two opaque
 * PNGs. These are numerical mapping assets, not generated scene geometry.
 * node scripts/build-photo-assets.mjs --plates DIRECTORY --sources DIRECTORY
 * Plates: collins.png, facade.png, sphere.png. Sources use the same names.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { mapPhotoSurface, PHOTO_WIDTH, PHOTO_HEIGHT } from '../src/experience/photo/mapping.ts';
const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const target = path.resolve('public/assets/light-lab/photo');
await fs.mkdir(target, { recursive: true });
for (const id of ['collins', 'facade', 'sphere']) {
  for (const [directory, suffix] of [[arg('--plates'), 'background'], [arg('--sources'), 'demo']]) {
    if (!directory) continue;
    const file = path.join(directory, `${id}.png`);
    const metadata = await sharp(file).metadata();
    if (metadata.width !== PHOTO_WIDTH || metadata.height !== PHOTO_HEIGHT) throw new Error(`${file}: reference dimensions changed`);
    await sharp(file).webp({ quality: 94, effort: 6 }).toFile(path.join(target, `${id}-${suffix}.webp`));
  }
  const high = Buffer.alloc(PHOTO_WIDTH * PHOTO_HEIGHT * 4), low = Buffer.alloc(high.length);
  let pixels = 0;
  for (let y = 0; y < PHOTO_HEIGHT; y++) for (let x = 0; x < PHOTO_WIDTH; x++) {
    const index = (y * PHOTO_WIDTH + x) * 4;
    high[index + 3] = low[index + 3] = 255;
    const point = mapPhotoSurface(id, x + .5, y + .5);
    if (!point) continue;
    const u = Math.round(point.u * 65535), v = Math.round(point.v * 65535);
    high[index] = u >> 8; high[index + 1] = v >> 8;
    high[index + 2] = Math.round(Math.min(1, Math.max(0, point.edge)) * 255);
    low[index] = u & 255; low[index + 1] = v & 255; low[index + 2] = Math.round(point.shade * 255);
    pixels++;
  }
  for (const [data, suffix] of [[high, 'uv-high'], [low, 'uv-low']]) {
    await sharp(data, { raw: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(target, `${id}-${suffix}.png`));
  }
  console.log(`${id}: ${pixels} display pixels, UV front continuity baked`);
}
