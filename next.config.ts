import type { NextConfig } from 'next';
const pages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: pages ? 'export' : undefined,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  trailingSlash: true,
  images: { unoptimized: pages },
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
