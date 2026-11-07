import type { NextConfig } from 'next';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  trailingSlash: true,
  ...(process.env.NEXT_OUTPUT_EXPORT === 'true'
    ? { output: 'export' as const }
    : {}),
};
export default nextConfig;
