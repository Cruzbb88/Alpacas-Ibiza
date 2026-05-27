import type { MetadataRoute } from 'next'
import { SITE_BASE_URL } from '@/lib/config'
import { isProductionEnv } from '@/lib/robots-env'

export default function robots(): MetadataRoute.Robots {
  const isProd = isProductionEnv(SITE_BASE_URL, process.env.VERCEL_ENV)

  if (!isProd) {
    // Preview deploys, local dev, custom branches — block all crawlers
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  // Production
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: [
      `${SITE_BASE_URL}/sitemap.xml`,
      `${SITE_BASE_URL}/sitemap-news.xml`,
    ],
  }
}
