import fs from 'fs/promises';
import https from 'https';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

async function fetchSkinport() {
  return new Promise((resolve, reject) => {
    https.get('https://api.skinport.com/v1/items?app_id=730&currency=EUR', {
      headers: { 'Accept-Encoding': 'br' }
    }, (res) => {
      let data = [];
      const brotli = zlib.createBrotliDecompress();
      res.pipe(brotli);
      brotli.on('data', chunk => data.push(chunk));
      brotli.on('end', () => resolve(JSON.parse(Buffer.concat(data).toString())));
      brotli.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching Skinport prices...');
  const pricesD = await fetchSkinport();

  const priceMap = {};
  pricesD.forEach(p => {
    // Only capture weapon skins (ignore stickers, cases, agents)
    // Most weapon skins have a condition in parentheses for Skinport.
    if (!p.suggested_price) return;

    // Some skins don't have wear, but most weapon skins do.
    const baseName = p.market_hash_name.split(' (')[0];
    if (!priceMap[baseName] || p.suggested_price > priceMap[baseName]) {
      priceMap[baseName] = p.suggested_price;
    }
  });

  // Get the directory where the script is located
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Use process.cwd() to ensure we're writing to the project root /public directory
  const publicDir = path.join(process.cwd(), 'public');
  const outputPath = path.join(publicDir, 'skin_prices.json');

  // Ensure public directory exists
  try {
    await fs.access(publicDir);
  } catch {
    await fs.mkdir(publicDir, { recursive: true });
  }

  await fs.writeFile(outputPath, JSON.stringify(priceMap));
  console.log(`Saved ${Object.keys(priceMap).length} prices to ${outputPath}`);
}

main().catch(console.error);
