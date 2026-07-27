// src/components/Toast.jsx
import { useState, useEffect, useCallback, createContext, useContext } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const toast = useCallback(
    (message, type) => addToast(message, type),
    [addToast]
  );

  toast.success = useCallback(
    (message) => addToast(message, "success"),
    [addToast]
  );

  toast.error = useCallback(
    (message) => addToast(message, "error"),
    [addToast]
  );

  toast.info = useCallback(
    (message) => addToast(message, "info"),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "380px",
          width: "100%",
          pointerEvents: "none"
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const bgColor =
    toast.type === "success"
      ? "rgba(16, 185, 129, 0.95)"
      : toast.type === "error"
      ? "rgba(239, 68, 68, 0.95)"
      : "rgba(59, 130, 246, 0.95)";

  const borderColor =
    toast.type === "success"
      ? "#10b981"
      : toast.type === "error"
      ? "#ef4444"
      : "#3b82f6";

  const icon =
    toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ";

  return (
    <div
      onClick={onClose}
      style={{
        pointerEvents: "auto",
        padding: "14px 18px",
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: "14px",
        color: "white",
        fontWeight: "700",
        fontSize: "0.9rem",
        backdropFilter: "blur(20px)",
        boxShadow: `0 10px 30px ${borderColor}33, 0 4px 10px rgba(0,0,0,0.3)`,
        transform: isVisible ? "translateX(0) scale(1)" : "translateX(100%) scale(0.8)",
        opacity: isVisible ? 1 : 0,
        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer"
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.8rem",
          fontWeight: "900",
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <span style={{ flex: 1, lineHeight: "1.3" }}>{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if no provider
    return {
      success: (m) => console.log("[toast]", m),
      error: (m) => console.warn("[toast]", m),
      info: (m) => console.info("[toast]", m),
    };
  }
  return ctx;
}

// Re-export the hook for convenience
export { useToast as default };

