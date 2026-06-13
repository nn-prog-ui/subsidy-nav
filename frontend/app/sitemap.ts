import { MetadataRoute } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://subsidy-nav.jp';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const static_routes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/subsidies`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/matching`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/alerts`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/templates`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/consulting`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/calendar`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/compare`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/analytics`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ];

  try {
    const [subsidyRes, analyticsRes] = await Promise.all([
      fetch(`${API}/api/subsidies?limit=500&page=1`, { next: { revalidate: 3600 } }),
      fetch(`${API}/api/subsidies/analytics`, { next: { revalidate: 3600 } }),
    ]);
    const subsidyJson = await subsidyRes.json();
    const subsidy_routes: MetadataRoute.Sitemap = (subsidyJson.data || []).map((s: { id: string; updatedAt: string }) => ({
      url: `${BASE_URL}/subsidies/${s.id}`,
      lastModified: new Date(s.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    let category_routes: MetadataRoute.Sitemap = [];
    try {
      const analyticsJson = await analyticsRes.json();
      category_routes = (analyticsJson.data?.byCategory || []).map((c: { label: string }) => ({
        url: `${BASE_URL}/categories/${encodeURIComponent(c.label)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    } catch { /* ignore */ }

    return [...static_routes, ...category_routes, ...subsidy_routes];
  } catch {
    return static_routes;
  }
}
