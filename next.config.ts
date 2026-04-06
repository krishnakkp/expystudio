import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // ESLint is run separately via `npm run lint` — don't block production builds
    ignoreDuringBuilds: true,
  },
  webpack(config, { dev }) {
    // Avoid eval-based devtool output, which can trigger browser runtime SyntaxErrors
    // in some environments/extensions and makes debugging harder.
    if (dev) {
      config.devtool = 'source-map';
    }
    return config;
  },
};

export default nextConfig;
