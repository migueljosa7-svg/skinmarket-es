import { registerSteamRoutes } from './steam.js';
import { registerGoogleRoutes } from './google.js';

export function registerAuthRoutes({ app, passport, db, log, logAction, JWT_SECRET, env }) {
  registerSteamRoutes(app, passport, db, log, logAction, JWT_SECRET, env);
  registerGoogleRoutes(app, db, log, logAction, JWT_SECRET, env);
}
