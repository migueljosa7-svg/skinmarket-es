import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.resolve(__dirname, 'steam_callback.log');

function ensureLogFile() {
  try {
    const dir = path.dirname(LOG_FILE);
    fs.mkdirSync(dir, { recursive: true });
    fs.openSync(LOG_FILE, 'a');
  } catch (err) {
    console.error('[STEAM CALLBACK LOGGER] Error al crear el archivo de log:', err.message);
  }
}

function serializeRequest(req) {
  return {
    timestamp: new Date().toISOString(),
    method: req.method,
    originalUrl: req.originalUrl,
    headers: {
      host: req.headers.host || null,
      referer: req.headers.referer || null,
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
    console.error('[STEAM CALLBACK LOGGER] Error escribiendo log:', err.message);
  }
}

ensureLogFile();
