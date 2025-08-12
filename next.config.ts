import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages configuration for serverless functions
  serverExternalPackages: ['@google/generative-ai'],
  
  // API routes configuration for extended Gemini processing
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Function-Timeout',
            value: '120',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
