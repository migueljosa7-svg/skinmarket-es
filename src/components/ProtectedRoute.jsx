import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1115"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: '48px', height: '48px',
            border: '3px solid rgba(245, 172, 59, 0.1)',
            borderTop: '3px solid #f5ac3b',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{
            color: "#f5ac3b",
            fontSize: "0.85rem",
            fontWeight: "900",
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            AUTENTICANDO...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}