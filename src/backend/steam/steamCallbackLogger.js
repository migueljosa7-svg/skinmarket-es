import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve(new URL('../../steam_callback.log', import.meta.url).pathname);

function serializeRequest(req) {
  return {
    timestamp: new Date().toISOString(),
    method: req.method,
    originalUrl: req.originalUrl,
    headers: {
      referer: req.headers.referer || null,
      host: req.headers.host || null,
      'user-agent': req.headers['user-agent'] || null,
    },
    query: req.query || {},
    body: req.body || {},
  };
}

export function captureSteamCallback(req) {
  const payload = serializeRequest(req);
  const line = `${JSON.stringify(payload)}\n`;

  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (err) {
    // Preserve existing behavior if logging fails.
    console.error('[STEAM CALLBACK LOGGER] Error escribiendo log:', err.message);
  }
}
