import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://skinmarket.es';

const routes = [
    '/',
    '/about',
    '/privacy',
    '/terms',
    '/ranking',
    '/login',
];

const generateSitemap = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${routes.map(route => `
  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>
  `).join('')}
</urlset>`;

    fs.writeFileSync('./public/sitemap.xml', xml);
    console.log('Sitemap.xml generado correctamente en ./public/sitemap.xml');
};

generateSitemap();
