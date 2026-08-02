import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').trim().slice(0, 254);
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function registerGoogleRoutes(app, db, log, logAction, jwtSecret, env) {
  const googleClientId = env.GOOGLE_CLIENT_ID;
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
  const googleClient = googleClientId ? new OAuth2Client(googleClientId, googleClientSecret) : null;

  if (!googleClient) {
    log('WARN', 'AUTH', 'Google OAuth no configurado. Falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET.');
  }

  app.post('/api/auth/google', async (req, res) => {
    if (!googleClient) {
      return res.status(503).json({ error: 'Autenticación con Google no está configurada en el servidor' });
    }

    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken es obligatorio' });
    }

    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: googleClientId });
      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(401).json({ error: 'Token de Google inválido' });
      }

      const googleId = String(payload.sub);
      const email = sanitizeInput(payload.email);
      const nombre = sanitizeInput(payload.name || payload.given_name || email.split('@')[0] || 'Usuario');
      const avatar = payload.picture || null;

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Email de Google inválido' });
      }

      let result = await db.query('SELECT * FROM usuarios WHERE google_id = $1 OR email = $2', [googleId, email]);
      if (result.rows.length === 0) {
        result = await db.query(
          'INSERT INTO usuarios (nombre_usuario, email, password_hash, google_id, avatar, nivel, experiencia) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING usuario_id, nombre_usuario, email, saldo, nivel, experiencia, avatar',
          [nombre, email, 'google_no_password', googleId, avatar, 0, 0]
        );
      } else if (!result.rows[0].google_id) {
        await db.query('UPDATE usuarios SET google_id = $1, avatar = COALESCE(avatar, $2) WHERE usuario_id = $3', [googleId, avatar, result.rows[0].usuario_id]);
      }

      const user = result.rows[0];
      const token = jwt.sign({ id: user.usuario_id, email: user.email }, jwtSecret, { expiresIn: '8h' });
      await logAction(user.usuario_id, 'LOGIN_GOOGLE', { googleId, email });

      res.json({
        user: {
          usuario_id: user.usuario_id,
          nombre_usuario: user.nombre_usuario,
          email: user.email,
          saldo: user.saldo,
          nivel: user.nivel,
          experiencia: user.experiencia,
          avatar: avatar || user.avatar
        },
        token
      });
    } catch (err) {
      log('ERROR', 'AUTH', 'Error en Google OAuth:', err.message || err);
      res.status(401).json({ error: 'Error al verificar el token de Google. Intenta de nuevo.' });
    }
  });
}
