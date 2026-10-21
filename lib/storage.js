import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const MAX_BYTES = 10 * 1024 * 1024;

export const IMAGE_TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
};

export function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR || path.join( process.cwd(), 'uploads'));
}

function sniffImageType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 3).toString('ascii') === 'GIF') return 'gif';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp' && /avi[fs]/.test(buf.subarray(8, 12).toString('ascii'))) return 'avif';
  return null;
}

export async function saveImage(buffer) {
  if (buffer.length > MAX_BYTES) throw new Error('Файл більший за 10 МБ');
  const ext = sniffImageType(buffer);
  if (!ext) throw new Error('Підтримуються лише JPG, PNG, WebP, GIF та AVIF');
  const name = `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), name), buffer);
  return `/uploads/${name}`;
}

export async function readUpload(name) {
  const match = /^[\w-]+\.(jpg|png|webp|gif|avif)$/.exec(name || '');
  if (!match) return null;
  try {
    return { body: await readFile(path.join(uploadDir(), name)), type: IMAGE_TYPES[match[1]] };
  } catch {
    return null;
  }
}
