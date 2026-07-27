// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";

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

  const { login, register, recoverPassword } = useAuth();
  const navigate = useNavigate();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (view === "login") {
      if (!email.trim() || !password.trim()) return setError("Todos los campos son obligatorios");
      setLoading(true);
      try {
        await login(email);
        setSuccess(true);
        setTimeout(() => navigate("/dashboard"), 500);
      } catch (err) {
        setError(err.message || "Error al iniciar sesión");
      } finally {
        setLoading(false);
      }
    } else if (view === "register") {
      if (!nombreUsuario.trim()) return setError("El nombre de usuario es obligatorio");
      if (!emailValid) return setError("Email inválido");
      if (!passwordValid) return setError("La contraseña debe tener 6+ caracteres");
      if (password !== confirmPassword) return setError("Las contraseñas no coinciden");

      setLoading(true);
      try {
        await register(nombreUsuario, email);
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
            Únete y consigue €500 de saldo inicial
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {view === "register" && (
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "6px" }}>NOMBRE DE USUARIO</label>
              <input
                type="text"
                placeholder="Tu apodo"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
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
            🎮 Entrar como Invitado
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "25px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
          {view === "login" ? (
            <>
              <span onClick={() => setView("register")} style={{ cursor: "pointer", color: "#f5ac3b" }}>¿No tienes cuenta? Regístrate</span>
              <span onClick={() => setView("recover")} style={{ cursor: "pointer" }}>¿Olvidaste clave?</span>
            </>
          ) : (
            <span onClick={() => setView("login")} style={{ cursor: "pointer", color: "#f5ac3b" }}>Volver a Iniciar Sesión</span>
          )}
        </div>
      </div>
    </div>
  );
}