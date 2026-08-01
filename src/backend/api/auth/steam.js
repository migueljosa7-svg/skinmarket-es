import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Strategy as SteamStrategy } from '@dessly/passport-steam';
import { captureSteamCallback } from './logger.js';

function normalizeUrl(rawUrl, needsTrailingSlash = false) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const trimmed = rawUrl.trim().replace(/\s+$/g, '').replace(/\/+$|^\s+/g, '');
  return needsTrailingSlash ? `${trimmed.replace(/\/$/, '')}/` : trimmed.replace(/\/$/, '');
}

function buildSteamUrls(env, log) {
  const backendUrl = normalizeUrl(env.BACKEND_URL || 'http://localhost:3001');
  const steamReturnURL = env.STEAM_RETURN_URL
    ? normalizeUrl(env.STEAM_RETURN_URL)
    : `${backendUrl}/api/auth/steam/return`;
  const steamRealm = env.STEAM_REALM
    ? normalizeUrl(env.STEAM_REALM, true)
    : `${backendUrl}/`;

  if (!env.STEAM_API_KEY) {
    log('WARN', 'AUTH', 'STEAM_API_KEY no configurada. Autenticación Steam deshabilitada.');
  }

  return { steamReturnURL, steamRealm };
}

function createJwtToken(user, jwtSecret) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET no configurado');
  }
  return jwt.sign({ id: user.usuario_id, email: user.email }, jwtSecret, { expiresIn: '8h' });
}

export function setupSteamStrategy(passport, db, log, logAction, jwtSecret, env) {
  if (!env.STEAM_API_KEY) {
    return false;
  }

  const { steamReturnURL, steamRealm } = buildSteamUrls(env, log);

  passport.use(new SteamStrategy({
    returnUrl: steamReturnURL,
    realm: steamRealm,
    apiKey: env.STEAM_API_KEY,
    fetchUserProfile: true,
    fetchSteamLevel: false
  }, async (steamData, done) => {
    try {
      const steamId = steamData?.SteamID?.getSteamID64?.() || steamData?.id || null;
      const profile = steamData?.profile || steamData || {};
      const rawName = profile.personaname || profile.displayName || profile.nickname || `Steam_${steamId?.slice(-6) || 'user'}`;
      const nombre = rawName.replace(/<[^>]*>/g, '').replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 24) || `steam_${steamId?.slice(-6) || 'user'}`;
      const steamAvatar = profile.avatarfull || profile.avatarUrl || profile.avatar || null;

      if (!steamId) {
        return done(null, false, { message: 'No se pudo resolver el SteamID del usuario' });
      }

      let result = await db.query('SELECT * FROM usuarios WHERE steam_id = $1', [steamId]);

      if (result.rows.length === 0) {
        let createdUser = null;
        let attempt = 0;

        while (!createdUser && attempt < 5) {
          const suffix = attempt === 0 ? '' : `${attempt + 1}`;
          const candidateName = `${nombre}${suffix}`;
          const candidateEmail = `${candidateName.toLowerCase()}@steam.auth`;
          const generatedPassword = `${steamId}_${crypto.randomBytes(8).toString('hex')}`;
          const hashedPassword = await bcrypt.hash(generatedPassword, 12);

          try {
            result = await db.query(
              'INSERT INTO usuarios (nombre_usuario, email, password_hash, steam_id, avatar, nivel, experiencia) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
              [candidateName, candidateEmail, hashedPassword, steamId, steamAvatar, 0, 0]
            );
            createdUser = result.rows[0];
            log('INFO', 'AUTH', `Cuenta Steam creada automáticamente para ${steamId}`);
          } catch (insertErr) {
            if (insertErr.code === '23505') {
              attempt += 1;
              continue;
            }
            throw insertErr;
          }
        }

        if (!createdUser) {
          throw new Error('No se pudo crear la cuenta Steam por conflicto de nombre o email');
        }

        result = { rows: [createdUser] };
      } else {
        await db.query(
          "UPDATE usuarios SET avatar = COALESCE(NULLIF($1, ''), avatar) WHERE usuario_id = $2",
          [steamAvatar, result.rows[0].usuario_id]
        );
      }

      await logAction(result.rows[0].usuario_id, 'LOGIN_STEAM', { steamId, email: result.rows[0].email });
      return done(null, result.rows[0]);
    } catch (err) {
      log('ERROR', 'AUTH', 'Error al crear/actualizar usuario desde Steam:', err.message || err);
      return done(err);
    }
  }));

  log('INFO', 'AUTH', `Steam Strategy configurada. returnUrl=${steamReturnURL}, realm=${steamRealm}`);
  return true;
}

const STEAM_AUTH_TIMEOUT_MS = 20000;

function steamAuthWithTimeout(req, res, next, authCallback, frontendUrl, log, passport) {
  let responded = false;

  const safeRespond = (redirectUrl) => {
    if (!responded) {
      responded = true;
      return res.redirect(redirectUrl);
    }
  };

  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      log('ERROR', 'AUTH', '⏱️ TIMEOUT: Steam OpenID no respondió en 20 segundos');
      safeRespond(`${frontendUrl}/login?error=steam_timeout`);
    }
  }, STEAM_AUTH_TIMEOUT_MS);

  const wrappedCallback = (err, user) => {
    clearTimeout(timeout);
    if (responded) return;
    authCallback(err, user, safeRespond);
  };

  try {
    passport.authenticate('steam', { session: false }, wrappedCallback)(req, res, next);
  } catch (err) {
    clearTimeout(timeout);
    if (!responded) {
      responded = true;
      log('ERROR', 'AUTH', 'Error en autenticación Steam:', err.message || err);
      safeRespond(`${frontendUrl}/login?error=steam_auth_failed`);
    }
  }
}

export function registerSteamRoutes(app, passport, db, log, logAction, jwtSecret, env) {
  const strategyEnabled = setupSteamStrategy(passport, db, log, logAction, jwtSecret, env);
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';

  if (strategyEnabled) {
    app.get('/api/auth/steam', passport.authenticate('steam'));

    app.get('/api/auth/steam/return', (req, res, next) => {
      captureSteamCallback(req);
      steamAuthWithTimeout(req, res, next, (err, user, safeRespond) => {
        if (err) {
          log('ERROR', 'AUTH', 'Error en callback Steam:', err);
          return safeRespond(`${frontendUrl}/login?error=steam_callback_failed`);
        }
        if (!user) {
          log('WARN', 'AUTH', 'Callback Steam recibido sin usuario válido');
          return safeRespond(`${frontendUrl}/login?error=steam_login_cancelled`);
        }
        try {
          const token = createJwtToken(user, jwtSecret);
          safeRespond(`${frontendUrl}/login?token=${token}`);
        } catch (jwtErr) {
          log('ERROR', 'AUTH', 'Error generando JWT en Steam:', jwtErr);
          safeRespond(`${frontendUrl}/login?error=token_generation_failed`);
        }
      }, frontendUrl, log, passport);
    });
  } else {
    app.get('/api/auth/steam', (req, res) => {
      log('WARN', 'AUTH', 'Intento de autenticación Steam pero no está configurada');
      res.redirect(`${frontendUrl}/login?error=steam_not_configured`);
    });

    app.get('/api/auth/steam/return', (req, res) => {
      log('WARN', 'AUTH', 'Callback Steam recibido pero autenticación no está configurada');
      res.redirect(`${frontendUrl}/login?error=steam_not_configured`);
    });
  }
}
