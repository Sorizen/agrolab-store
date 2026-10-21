import { existsSync } from 'fs';
import path from 'path';

const EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg'];

export function publicImage(baseName) {
  for (const ext of EXTS) {
    const rel = `images/${baseName}.${ext}`;
    try {
      if (existsSync(path.join(process.cwd(), 'public', rel))) {

        const graphic = ext === 'svg' || ext === 'png';
        return { url: `url('/${rel}')`, path: `/${rel}`, ext, graphic };
      }
    } catch {

    }
  }
  return null;
}

export function heroStyle(baseName, base = undefined) {
  const img = publicImage(baseName);
  if (!img) return base;
  return {
    ...(base || {}),
    '--hero-image': img.url,
    ...(img.graphic ? { '--hero-tint': 'transparent' } : {}),
  };
}
