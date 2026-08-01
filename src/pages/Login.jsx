import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_CLIENT_ID || "";

function validatePassword(password) {
  if (!password || password.length < 8) return { valid: false, error: "La contrasena debe tener al menos 8 caracteres" };
  if (!/[A-Z]/.test(password)) return { valid: false, error: "La contrasena debe contener al menos una mayuscula" };
  if (!/[0-9]/.test(password)) return { valid: false, error: "La contrasena debe contener al menos un numero" };
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) return { valid: false, error: "La contraseña debe contener al menos un caracter especial" };
  return { valid: true };
}

const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

export default function Login() {
  const [view, setView] = useState("login");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [socialLoading, setSocialLoading] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, register, recoverPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    const cleanOAuthParams = () => {
      if (window.location.search.includes("token=") || window.location.search.includes("error=")) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      }
    };

    if (tokenFromUrl) {
      localStorage.setItem("token", tokenFromUrl);
      window.dispatchEvent(new CustomEvent("auth-token-updated", { detail: { token: tokenFromUrl } }));

      fetch(API_BASE + "/api/me", { headers: { Authorization: "Bearer " + tokenFromUrl } })
        .then(function (res) { if (!res.ok) throw new Error("Failed"); return res.json(); })
        .then(async function (userData) {
          if (userData) {
            var mod = await import("../services/StorageService");
            mod.StorageService.updateUser({
              nombre_usuario: userData.nombre_usuario || userData.name,
              email: userData.email,
              saldo: userData.saldo || 0,
              balance: userData.saldo || userData.balance || 0,
              nivel: userData.nivel || 0,
              experiencia: userData.experiencia || 0,
              steam_id: userData.steam_id || null
            });
          }
        })
        .catch(function () { })
        .finally(function () {
          cleanOAuthParams();
          setTimeout(function () {
            try { navigate("/dashboard"); } catch { window.location.href = "/dashboard"; }
          }, 500);
        });
    } else {
      cleanOAuthParams();
    }
  }, [searchParams, navigate]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async function (e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (view === "login") {
      if (!email.trim() || !password.trim()) return setError("Todos los campos son obligatorios");
      setLoading(true);
      try { await login(email, password); setSuccess(true); setTimeout(function () { navigate("/dashboard"); }, 500); }
      catch (err) { setError(err.message || "Error al iniciar sesion"); }
      finally { setLoading(false); }
    } else if (view === "register") {
      if (!nombreUsuario.trim()) return setError("El nombre de usuario es obligatorio");
      if (nombreUsuario.length < 3 || nombreUsuario.length > 30) return setError("El nombre de usuario debe tener entre 3 y 30 caracteres");
      if (!/^[a-zA-Z0-9_]+$/.test(nombreUsuario)) return setError("El nombre de usuario solo puede contener letras, numeros y guiones bajos");
      if (!emailValid) return setError("Email invalido");
      var pwdCheck = validatePassword(password);
      if (!pwdCheck.valid) return setError(pwdCheck.error);
      if (password !== confirmPassword) return setError("Las contrasenas no coinciden");
      setLoading(true);
      try { await register(nombreUsuario, email, password); setSuccess(true); setTimeout(function () { navigate("/dashboard"); }, 500); }
      catch (err) { setError(err.message || "Error al registrar"); }
      finally { setLoading(false); }
    } else if (view === "recover") {
      if (!emailValid) return setError("Email invalido");
      try { var msg = await recoverPassword(email); setRecoveryMessage(msg); }
      catch (err) { setError(err.message); }
    }
  };

useEffect(function () {
    var handlePopState = function () {
      if (new URLSearchParams(window.location.search).has("token")) {
        window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return function () { window.removeEventListener("popstate", handlePopState); };
  }, []);

  const handleSteamLogin = function () {
    setSocialLoading("steam");
    window.location.href = API_BASE + "/api/auth/steam";
  };

  const handleGuestLogin = async function () {
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      localStorage.removeItem("token");
      window.dispatchEvent(new CustomEvent("auth-token-updated", { detail: { token: null } }));
      const mod = await import("../services/StorageService");
      mod.StorageService.destroySession();
      mod.StorageService.updateUser({
        nombre_usuario: "Invitado",
        email: "guest@skinmarket.es",
        saldo: 0,
        balance: 0,
        nivel: 0,
        experiencia: 0,
        steam_id: null,
        link_intercambio: null,
        role: "user"
      });
      setSuccess(true);
      setTimeout(function () { navigate("/dashboard"); }, 500);
    } catch (err) {
      setError(err.message || "Error al entrar como invitado");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = function () {
    setSocialLoading("google");
    var clientId = GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google Sign-In no configurado (falta VITE_GOOGLE_CLIENT_ID). Contacta al administrador.");
      setSocialLoading(null);
      setTimeout(function () { setError(""); }, 4000);
      return;
    }
    if (!window.google) {
      var script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogleSignIn;
      script.onerror = function () { setError("Error al cargar Google Sign-In. Verifica tu conexion."); setSocialLoading(null); };
      document.head.appendChild(script);
    } else {
      initGoogleSignIn();
    }
  };

  const initGoogleSignIn = function () {
    try {
      var clientId = GOOGLE_CLIENT_ID;
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: "popup",
        use_fedcm_for_prompt: false,
        callback: async function (response) {
          var idToken = response.credential;
          if (!idToken) { setError("No se pudo obtener el token de Google."); setSocialLoading(null); return; }
          try {
            var res = await fetch(API_BASE + "/api/auth/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: idToken }) });
            var data = await res.json();
            if (res.ok && data.token) {
              localStorage.setItem("token", data.token);
              window.dispatchEvent(new CustomEvent("auth-token-updated", { detail: { token: data.token } }));
              var mod = await import("../services/StorageService");
              mod.StorageService.updateUser({ nombre_usuario: data.user.nombre_usuario, email: data.user.email, saldo: data.user.saldo, balance: data.user.saldo, nivel: data.user.nivel || 0, experiencia: data.user.experiencia || 0 });
              setSuccess(true);
              setTimeout(function () { navigate("/dashboard"); }, 500);
            } else { setError(data.error || "Error al iniciar sesion con Google"); setSocialLoading(null); }
          } catch { setError("Error de conexion."); setSocialLoading(null); }
        }
      });
      window.google.accounts.id.prompt(function (notification) {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setSocialLoading(null);
          setError("Google Sign-In cancelado.");
        }
      });
    } catch { setError("Error al inicializar Google Sign-In."); setSocialLoading(null); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", color: "white", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "440px", background: "#15181e", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "28px", padding: "40px", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", margin: "0 0 8px 0" }}>{view === "login" ? "INICIAR SESION" : view === "register" ? "CREAR CUENTA" : "RECUPERAR CLAVE"}</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", margin: 0 }}>Unete y empieza desde 0.00€ — deposita para jugar</p>
        </div>

        {error && <div style={{ padding: "12px", background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "10px", marginBottom: "20px", fontSize: "0.85rem", textAlign: "center", fontWeight: "bold" }}>{error}</div>}
        {success && <div style={{ padding: "12px", background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", color: "#10b981", borderRadius: "10px", marginBottom: "20px", fontSize: "0.85rem", textAlign: "center", fontWeight: "bold" }}>Operacion completada con exito!</div>}
        {recoveryMessage && <div style={{ padding: "12px", background: "rgba(59,130,246,0.15)", border: "1px solid #3b82f6", color: "#3b82f6", borderRadius: "10px", marginBottom: "20px", fontSize: "0.85rem", textAlign: "center", fontWeight: "bold" }}>{recoveryMessage}</div>}

        {view !== "recover" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <button type="button" onClick={handleSteamLogin} disabled={socialLoading !== null} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: socialLoading === "steam" ? "rgba(26,46,58,0.5)" : "#1b2838", color: "white", border: "1px solid #2a475e", fontWeight: "900", fontSize: "0.9rem", cursor: socialLoading !== null ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                {socialLoading === "steam" ? (<><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Conectando...</>) : (<>CONTINUAR CON STEAM</>)}
              </button>
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontWeight: "900",
                  fontSize: "0.9rem",
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "PROCESANDO..." : "ENTRAR COMO INVITADO"}
              </button>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={socialLoading !== null}
                title="Iniciar sesion con Google"
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
                  opacity: socialLoading === "google" ? 0.7 : 1
                }}
              >
                {socialLoading === "google" ? (
                  <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Conectando...</>
                ) : (
                  <>CONTINUAR CON GOOGLE</>
                )}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", fontWeight: "bold" }}>O CON EMAIL</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {view === "login" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={function (e) { setRememberMe(e.target.checked); }} style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#f5ac3b" }} />
              <label htmlFor="rememberMe" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>Recordar mi sesion</label>
            </div>
          )}
          {view === "register" && (
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>NOMBRE DE USUARIO</label>
              <input type="text" placeholder="Tu apodo (3-30 caracteres)" value={nombreUsuario} onChange={function (e) { setNombreUsuario(e.target.value); }} maxLength={30} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>CORREO ELECTRONICO</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={function (e) { setEmail(e.target.value); }} maxLength={254} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
          </div>
          {view !== "recover" && (
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>CONTRASENA</label>
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} placeholder="********" value={password} onChange={function (e) { setPassword(e.target.value); }} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
                <button type="button" onClick={function () { setShowPassword(!showPassword); }} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.8rem" }}>{showPassword ? "Ocultar" : "Ver"}</button>
              </div>
              {view === "register" && <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginTop: "6px" }}>Minimo 8 caracteres, 1 mayuscula, 1 numero y 1 caracter especial.</div>}
            </div>
          )}
          {view === "register" && (
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>CONFIRMAR CONTRASENA</label>
              <input type="password" placeholder="********" value={confirmPassword} onChange={function (e) { setConfirmPassword(e.target.value); }} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
            </div>
          )}
          <button type="submit" disabled={loading} style={{ padding: "16px", background: "#f5ac3b", color: "black", border: "none", borderRadius: "14px", fontWeight: "900", fontSize: "1rem", cursor: "pointer", marginTop: "10px" }}>
            {loading ? "PROCESANDO..." : view === "login" ? "ENTRAR" : view === "register" ? "REGISTRARME" : "ENVIAR ENLACE"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "25px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
          {view === "login" ? (
            <span onClick={function () { setView("register"); }} style={{ cursor: "pointer", color: "#f5ac3b" }}>No tienes cuenta? Registrate</span>
          ) : view === "recover" ? (
            <span onClick={function () { setView("login"); }} style={{ cursor: "pointer", color: "#f5ac3b" }}>Volver a Iniciar Sesion</span>
          ) : (
            <span onClick={function () { setView("login"); }} style={{ cursor: "pointer", color: "#f5ac3b" }}>Volver a Iniciar Sesion</span>
          )}
          {view === "login" && <span onClick={function () { setView("recover"); }} style={{ cursor: "pointer" }}>Olvidaste clave?</span>}
        </div>
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    </div>
  );
}
