// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "";

// Password security policy: min 8 chars, 1 uppercase, 1 number, 1 special char
function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "La contraseña debe contener al menos una mayúscula" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "La contraseña debe contener al menos un número" };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { valid: false, error: "La contraseña debe contener al menos un carácter especial (!@#$%^&*...)" };
  }
  return { valid: true };
}

export default function Login() {
  const [view, setView] = useState("login"); // 'login', 'register', 'recover'
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [socialLoading, setSocialLoading] = useState(null); // 'steam' | 'google' | null
  const [rememberMe, setRememberMe] = useState(false);

  const { login, register, recoverPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle token from Steam OAuth redirect (?token=xxx)
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      // Store the JWT token from Steam redirect
      localStorage.setItem("token", token);
      setSuccess(true);

      // Fetch user data from backend with error handling
      fetch(`${API_BASE}/api/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch user data');
          return res.json();
        })
        .then(async (user) => {
          if (user) {
            // Update local storage with user data
            const { StorageService } = await import("../services/StorageService");
            StorageService.updateUser({
              nombre_usuario: user.nombre_usuario,
              email: user.email,
              saldo: user.saldo,
              balance: user.saldo,
              nivel: user.nivel || 0,
              experiencia: user.experiencia || 0,
              steam_id: user.steam_id || null
            });
          }
        })
        .catch((err) => {
          console.warn('[STEAM LOGIN] Error fetching user data:', err.message);
          // Even if user data fetch fails, we have the token, so redirect
        })
        .finally(() => {
          setTimeout(() => {
            try {
              navigate("/dashboard");
            } catch (navErr) {
              console.warn('[STEAM LOGIN] Navigation failed, redirecting to /login');
              window.location.href = "/dashboard";
            }
          }, 800);
        });
    }
  }, [searchParams, navigate]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (view === "login") {
      if (!email.trim() || !password.trim()) return setError("Todos los campos son obligatorios");
      setLoading(true);
      try {
        await login(email, password);
        setSuccess(true);
        setTimeout(() => navigate("/dashboard"), 500);
      } catch (err) {
        setError(err.message || "Error al iniciar sesión");
      } finally {
        setLoading(false);
      }
    } else if (view === "register") {
      if (!nombreUsuario.trim()) return setError("El nombre de usuario es obligatorio");
      if (nombreUsuario.length < 3 || nombreUsuario.length > 30) return setError("El nombre de usuario debe tener entre 3 y 30 caracteres");
      if (!/^[a-zA-Z0-9_]+$/.test(nombreUsuario)) return setError("El nombre de usuario solo puede contener letras, números y guiones bajos");
      if (!emailValid) return setError("Email inválido");
      const pwdCheck = validatePassword(password);
      if (!pwdCheck.valid) return setError(pwdCheck.error);
      if (password !== confirmPassword) return setError("Las contraseñas no coinciden");

      setLoading(true);
      try {
        await register(nombreUsuario, email, password);
        setSuccess(true);
        setTimeout(() => navigate("/dashboard"), 500);
      } catch (err) {
        setError(err.message || "Error al registrar");
      } finally {
        setLoading(false);
      }
    } else if (view === "recover") {
      if (!emailValid) return setError("Email inválido");
      try {
        const msg = recoverPassword(email);
        setRecoveryMessage(msg);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleGuestLogin = () => {
    login("guest@skinmarket.es").then(() => navigate("/dashboard")).catch(() => navigate("/dashboard"));
  };

  // Handle browser back button or failed navigation - clean up corrupted state
  useEffect(() => {
    const handlePopState = () => {
      // Clean up any corrupted Steam token state if user navigates back
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("token")) {
        // Remove token from URL without reloading
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, "", newUrl);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Steam OAuth: redirect to backend Steam auth endpoint
  const handleSteamLogin = () => {
    setSocialLoading("steam");
    const steamAuthUrl = `${API_BASE}/api/auth/steam`;
    window.location.href = steamAuthUrl;
  };

  // Google OAuth: use Google Identity Services (GIS) to get idToken, then send to backend
  const handleGoogleLogin = () => {
    setSocialLoading("google");
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      // Elegant fallback when Google OAuth is not configured
      setError("Google Sign-In próximamente disponible en producción");
      setSocialLoading(null);
      // Auto-clear error after 3 seconds
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Load Google Identity Services script if not already loaded
    if (!window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleSignIn();
      script.onerror = () => {
        setError("Error al cargar Google Sign-In. Intenta de nuevo.");
        setSocialLoading(null);
      };
      document.head.appendChild(script);
    } else {
      initGoogleSignIn();
    }
  };

  const initGoogleSignIn = () => {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "email profile openid",
        callback: async (response) => {
          if (response.access_token) {
            // Use token endpoint to get id_token
            try {
              const tokenRes = await fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + response.access_token);
              const tokenInfo = await tokenRes.json();
              // We need the id_token — use the implicit flow instead
              // Fallback: use Google One Tap / credential callback
            } catch (e) {
              // Ignore
            }
          }
        }
      });

      // Use Google Identity popup for id_token
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (credentialResponse) => {
          const idToken = credentialResponse.credential;
          if (!idToken) {
            setError("No se pudo obtener el token de Google.");
            setSocialLoading(null);
            return;
          }

          try {
            const res = await fetch(`${API_BASE}/api/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken })
            });

            const data = await res.json();

            if (res.ok && data.token) {
              localStorage.setItem("token", data.token);
              // Update local storage with user data
              const { StorageService } = await import("../services/StorageService");
              StorageService.updateUser({
                nombre_usuario: data.user.nombre_usuario,
                email: data.user.email,
                saldo: data.user.saldo,
                balance: data.user.saldo,
                nivel: data.user.nivel || 0,
                experiencia: data.user.experiencia || 0
              });
              setSuccess(true);
              setTimeout(() => navigate("/dashboard"), 500);
            } else {
              setError(data.error || "Error al iniciar sesión con Google");
              setSocialLoading(null);
            }
          } catch (err) {
            setError("Error de conexión con el servidor. Intenta de nuevo.");
            setSocialLoading(null);
          }
        }
      });

      // Trigger the Google One Tap / popup
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: use redirect method
          setSocialLoading(null);
          setError("Google Sign-In cancelado. Intenta con email y contraseña.");
        }
      });
    } catch (err) {
      setError("Error al inicializar Google Sign-In.");
      setSocialLoading(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1115",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        color: "white",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#15181e",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "28px",
          padding: "40px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
          zIndex: 1
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", margin: "0 0 8px 0" }}>
            {view === "login" ? "INICIAR SESIÓN" : view === "register" ? "CREAR CUENTA" : "RECUPERAR CLAVE"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", margin: 0 }}>
            Únete y empieza desde 0.00€ — deposita para jugar
          </p>
        </div>

        {error && (
          <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "10px", marginBottom: "20px", fontSize: "0.85rem", textAlign: "center", fontWeight: "bold" }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#10b981", borderRadius: "10px", marginBottom: "20px", fontSize: "0.85rem", textAlign: "center", fontWeight: "bold" }}>
            ¡Operación completada con éxito!
          </div>
        )}

        {recoveryMessage && (
          <div style={{ padding: "12px", background: "rgba(59, 130, 246, 0.15)", border: "1px solid #3b82f6", color: "#3b82f6", borderRadius: "10px", marginBottom: "20px", fontSize: "0.85rem", textAlign: "center", fontWeight: "bold" }}>
            {recoveryMessage}
          </div>
        )}

        {/* Social Login Buttons */}
        {view !== "recover" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {/* Steam Login */}
              <button
                type="button"
                onClick={handleSteamLogin}
                disabled={socialLoading !== null}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  background: socialLoading === "steam" ? "rgba(26,46,58,0.5)" : "#1b2838",
                  color: "white",
                  border: "1px solid #2a475e",
                  fontWeight: "900",
                  fontSize: "0.9rem",
                  cursor: socialLoading !== null ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.2s"
                }}
              >
                {socialLoading === "steam" ? (
                  <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Conectando...</>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.6 0 .3 4.8 0 11l6.4 2.6c.5-.4 1.2-.6 1.9-.6h.2l2.9-4.2v-.1c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5h-.1l-4.1 3c0 .1 0 .2 0 .3 0 1.8-1.5 3.3-3.3 3.3-1.6 0-2.9-1.1-3.2-2.6L0 15.6C1.5 20.5 6.3 24 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0zm-4.5 18.2l-1.5-.6c.3.6.7 1.1 1.4 1.4 1.4.6 3-.1 3.5-1.5.3-.7.3-1.4 0-2-.3-.7-.8-1.2-1.5-1.5-1.4-.6-3 .1-3.5 1.5l1.6.7c.2-.4.6-.6 1-.4.4.2.6.6.4 1-.2.4-.6.6-1 .4zm10.5-7.7c0-1.7-1.4-3-3-3s-3 1.4-3 3 1.4 3 3 3 3-1.3 3-3zm-5.3 0c0-1.3 1-2.3 2.3-2.3 1.3 0 2.3 1 2.3 2.3 0 1.3-1 2.3-2.3 2.3-1.3 0-2.3-1-2.3-2.3z" />
                    </svg>
                    CONTINUAR CON STEAM
                  </>
                )}
              </button>

              {/* Google Login */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={socialLoading !== null}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  background: socialLoading === "google" ? "rgba(255,255,255,0.05)" : "white",
                  color: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontWeight: "900",
                  fontSize: "0.9rem",
                  cursor: socialLoading !== null ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.2s"
                }}
              >
                {socialLoading === "google" ? (
                  <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Conectando...</>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    CONTINUAR CON GOOGLE
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", fontWeight: "bold" }}>O CON EMAIL</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {view === "login" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#f5ac3b" }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", cursor: "pointer", userSelect: "none" }}>
                Recordar mi sesión
              </label>
            </div>
          )}
          {view === "register" && (
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>NOMBRE DE USUARIO</label>
              <input
                type="text"
                placeholder="Tu apodo (3-30 caracteres)"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                maxLength={30}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>CORREO ELECTRÓNICO</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
            />
          </div>

          {view !== "recover" && (
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>CONTRASEÑA</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.8rem" }}
                >
                  {showPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
              {view === "register" && (
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginTop: "6px", lineHeight: 1.4 }}>
                  Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial.
                </div>
              )}
            </div>
          )}

          {view === "register" && (
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>CONFIRMAR CONTRASEÑA</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "16px",
              background: "#f5ac3b",
              color: "black",
              border: "none",
              borderRadius: "14px",
              fontWeight: "900",
              fontSize: "1rem",
              cursor: "pointer",
              marginTop: "10px"
            }}
          >
            {loading ? "PROCESANDO..." : view === "login" ? "ENTRAR" : view === "register" ? "REGISTRARME" : "ENVIAR ENLACE"}
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            style={{
              padding: "14px",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
              fontWeight: "bold",
              fontSize: "0.9rem",
              cursor: "pointer"
            }}
          >
            ► Entrar como Invitado
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "25px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
          {view === "login" ? (
            <>
              <span onClick={() => setView("register")} style={{ cursor: "pointer", color: "#f5ac3b" }}>¿No tienes cuenta? Regístrate</span>
              <span onClick={() => setView("recover")} style={{ cursor: "pointer" }}>¿Olvidaste clave?</span>
            </>
          ) : view === "recover" ? (
            <span onClick={() => setView("login")} style={{ cursor: "pointer", color: "#f5ac3b" }}>Volver a Iniciar Sesión</span>
          ) : (
            <span onClick={() => setView("login")} style={{ cursor: "pointer", color: "#f5ac3b" }}>Volver a Iniciar Sesión</span>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}