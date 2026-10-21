const DEFAULT_HOSTS = ['img.agrolab.com.ua'];

const extraHosts = () => [
  ...DEFAULT_HOSTS,
  ...String(process.env.NEXT_PUBLIC_IMAGE_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
];

export function isOptimizable(src) {
  if (!src) return false;
  if (src.startsWith('/')) return true;
  try {
    const host = new URL(src).hostname;
    return host.endsWith('.r2.dev') || extraHosts().includes(host);
  } catch {
    return false;
  }
}

export const imageRemotePatterns = () => [
  { protocol: 'https', hostname: '**.r2.dev' },
  ...extraHosts().map((hostname) => ({ protocol: 'https', hostname })),
];
