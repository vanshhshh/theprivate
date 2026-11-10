import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const csp = [
  "default-src 'self'",
  // Next.js App Router injects inline bootstrap scripts; 'unsafe-eval' only in development (React Refresh).
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

// Razorpay Standard Checkout loads its script and renders its modal in an iframe. These origins are
// allowed only on the checkout page, never site-wide.
const checkoutCsp = csp
  .replace("script-src 'self'", "script-src 'self' https://checkout.razorpay.com")
  .replace("connect-src 'self'", "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com")
  .replace("img-src 'self'", "img-src 'self' https://*.razorpay.com")
  .concat("; frame-src https://api.razorpay.com https://checkout.razorpay.com");

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pdfjs-dist', 'pino', '@prisma/client', 'pg'],
  experimental: { serverActions: { bodySizeLimit: '60mb' } },
  images: { localPatterns: [{ pathname: '/api/files/**' }] },
  async headers() {
    // Invitation and unsubscribe links carry secrets in the URL: never leak them in a Referer,
    // never cache them, never index them.
    const secretLink = [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cache-Control', value: 'no-store' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ];
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/claim/:path*', headers: secretLink },
      // Later rules override the same header key from the site-wide rule above.
      {
        source: '/operator/onboarding-payment/checkout/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: checkoutCsp },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://api.razorpay.com")' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      { source: '/unsubscribe', headers: secretLink },
      { source: '/api/unsubscribe', headers: secretLink },
    ];
  },
};

export default nextConfig;
