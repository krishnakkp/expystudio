import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // ESLint is run separately via `npm run lint` — don't block production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
