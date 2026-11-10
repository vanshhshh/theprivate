import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/account', '/operator', '/admin', '/api', '/sign-in', '/sign-up', '/claim', '/unsubscribe'] }], sitemap: `${base}/sitemap.xml` };
}
