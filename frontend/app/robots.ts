import { MetadataRoute } from 'next';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 管理・API・会員専用・取引系ページはインデックス対象外
        disallow: ['/admin', '/api/', '/mypage', '/auth/', '/collections/', '/alerts/unsubscribe'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
