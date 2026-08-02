import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

/**
 * LoginSuccess — OAuth callback landing page.
 *
 * Steam redirects to /login-success?token=JWT after a successful OpenID
 * authentication. This page validates the token against /api/me, stores it
 * in localStorage, and redirects the user to /dashboard.
 */
export default function LoginSuccess() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    const cleanOAuthParams = () => {
      if (window.location.search.includes("token=") || window.location.search.includes("error=")) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      }
    };

    if (!tokenFromUrl) {
      cleanOAuthParams();
      setTimeout(() => { setError("No se recibió token de autenticación."); }, 0);
      setTimeout(() => { navigate("/login"); }, 2000);
      return;
    }

    const handleLoginCallback = async () => {
      try {
        const res = await fetch(API_BASE + "/api/me", {
          headers: { Authorization: "Bearer " + tokenFromUrl }
        });
        if (!res.ok) {
          throw new Error("No autorizado");
        }
        const userData = await res.json();
        if (!userData || !userData.email) {
          throw new Error("No se recibieron datos de usuario.");
        }

        localStorage.removeItem("guest_mode");
        localStorage.setItem("token", tokenFromUrl);
        window.dispatchEvent(new CustomEvent("auth-token-updated", { detail: { token: tokenFromUrl } }));

        const mod = await import("../services/StorageService");
mod.StorageService.updateUser({
          nombre_usuario: userData.nombre_usuario || userData.name,
          email: userData.email,
          avatar: userData.avatar || null,
          saldo: userData.saldo || 0,
          balance: userData.saldo || userData.balance || 0,
          nivel: userData.nivel || 0,
          experiencia: userData.experiencia || 0,
          steam_id: userData.steam_id || null
        });

        setTimeout(() => { navigate("/dashboard"); }, 500);
      } catch (err) {
        setError(err.message || "Error al validar el token de autenticación.");
        localStorage.removeItem("token");
        setTimeout(() => { navigate("/login"); }, 2000);
      } finally {
        cleanOAuthParams();
      }
    };

    handleLoginCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1115",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      color: "white",
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "#15181e",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "28px",
        padding: "40px",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        textAlign: "center"
      }}>
        {!error ? (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: "0 0 8px 0" }}>ACCESO EXITOSO</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", margin: 0 }}>
              Verificando tus datos y redirigiendo al panel...
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>❌</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: "0 0 8px 0" }}>ERROR DE ACCESO</h1>
            <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>
          </>
        )}
      </div>
    </div>
  );
}