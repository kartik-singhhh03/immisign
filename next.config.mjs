function validateBuildEnv() {
  if (process.env.NODE_ENV !== 'production') return;
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Production build missing required environment variables: ${missing.join(', ')}`
    );
  }
}

validateBuildEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    instrumentationHook: true,
    outputFileTracingIncludes: {
      '/api/agreements/standard': [
        './node_modules/@sparticuz/chromium/**',
      ],
      '/api/agreements/[id]/generate': [
        './node_modules/@sparticuz/chromium/**',
      ],
      '/api/agreements/[id]/regenerate': [
        './node_modules/@sparticuz/chromium/**',
      ],
      '/api/agreements/preview-pdf': [
        './node_modules/@sparticuz/chromium/**',
      ],
      '/api/poc/generate-pdf': [
        './node_modules/@sparticuz/chromium/**',
      ],
      '/api/documents/send': [
        './node_modules/@sparticuz/chromium/**',
      ],
      '/api/documents/send-document-preview': [
        './node_modules/@sparticuz/chromium/**',
      ],
      '/api/public/approval/[token]': [
        './node_modules/@sparticuz/chromium/**',
      ],
      '/api/application-approvals/[id]/record': [
        './node_modules/@sparticuz/chromium/**',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
