import { imageRemotePatterns } from './lib/images.js';

const nextConfig = {
  images: {
    remotePatterns: imageRemotePatterns(),
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
