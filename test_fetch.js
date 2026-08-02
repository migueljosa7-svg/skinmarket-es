const https = require('https');
const zlib = require('zlib');

https.get('https://api.skinport.com/v1/items?app_id=730&currency=EUR', {
    headers: { 'Accept-Encoding': 'br' }
}, (res) => {
    let data = [];
    
    // Skinport seems to enforce compression. Decode with brotli.
    const brotli = zlib.createBrotliDecompress();
    res.pipe(brotli);

    brotli.on('data', (chunk) => data.push(chunk));
    brotli.on('end', () => {
        const buffer = Buffer.concat(data);
        const json = JSON.parse(buffer.toString());
        console.log(json.length, json[0]);
    });
}).on('error', console.error);
