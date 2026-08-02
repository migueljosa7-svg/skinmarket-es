/**
 * Socket.io Client Service
 *
 * Creates a singleton Socket.io client instance with progressive reconnection.
 * Uses WebSocket as primary transport (with polling as fallback) for reliable
 * real-time connections and to avoid HTTP polling timeout issues.
 * Sends cookies with cross-origin requests (withCredentials: true).
 *
 * PRODUCCIÓN: Todos los logs silenciados completamente (0 salida a consola).
 */
import { io } from "socket.io-client";

const isProd = typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production";
const _log = isProd ? () => { } : () => { };
const _warn = isProd ? () => { } : () => { };

// Usar VITE_WS_URL en Render si está disponible, luego VITE_API_URL o VITE_BACKEND_URL.
// El valor debe construirse sin slash final para compatibilidad con Socket.IO.
const SOCKET_URL = (
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_WS_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:3001"
).replace(/\/+$/, '');

let socket = null;

/**
 * Get or create the Socket.io client instance.
 * Reuses existing connection if already established.
 *
 * @returns {import("socket.io-client").Socket} The Socket.io client instance
 */
export function getSocket() {
    if (socket && socket.connected) {
        return socket;
    }

    if (socket) {
        socket.removeAllListeners();
        socket.close();
        socket = null;
    }

    socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"], // WebSocket primary transport, polling as fallback
        withCredentials: true,                // Send cookies with cross-origin requests
        reconnectionAttempts: 15,             // More attempts for Render cold starts
        reconnectionDelay: 1000,              // Start with 1s
        reconnectionDelayMax: 30000,          // Max 30s between attempts (exponential backoff)
        randomizationFactor: 0.5,             // Add jitter to avoid thundering herd
        timeout: 30000,                       // Longer timeout for cold starts
        autoConnect: true,
        forceNew: false,
        rejectUnauthorized: false,
    });

    // Track consecutive failures for smart backoff
    let consecutiveFailures = 0;

    socket.on("connect", () => {
        _log(`[SOCKET] Conectado: ${socket.id}`);
        consecutiveFailures = 0; // Reset on successful connection
    });

    socket.on("disconnect", (reason) => {
        _log(`[SOCKET] Desconectado: ${reason}`);
        if (reason === "io server disconnect") {
            // Server initiated disconnect - don't auto-reconnect aggressively
            _warn("[SOCKET] Desconexión iniciada por servidor. Esperando antes de reconectar...");
            setTimeout(() => {
                if (socket) socket.connect();
            }, 5000);
        }
    });

    socket.on("connect_error", (err) => {
        consecutiveFailures++;
        _warn(`[SOCKET] Error de conexión (${consecutiveFailures}):`, err.message);
        
        // If backend is cold-starting on Render, silence repeated errors
        if (err.message === "websocket error" && consecutiveFailures > 5) {
            _log("[SOCKET] Posible cold start en Render. Esperando con backoff...");
        }
    });

    socket.on("reconnect_attempt", (attempt) => {
        _log(`[SOCKET] Intento de reconexión #${attempt}`);
    });

    socket.on("reconnect", (attempt) => {
        _log(`[SOCKET] Reconectado en intento #${attempt}`);
        consecutiveFailures = 0;
    });

    socket.on("reconnect_error", (err) => {
        _warn("[SOCKET] Error en reconexión:", err.message);
    });

    socket.on("reconnect_failed", () => {
        _warn("[SOCKET] Todas las reconexiones fallaron. Esperando 30s para reintento manual...");
        // After all attempts failed, schedule a manual reconnect after delay
        setTimeout(() => {
            _log("[SOCKET] Reintentando conexión manual...");
            if (socket && !socket.connected) {
                socket.connect();
            }
        }, 30000);
    });

    return socket;
}

/**
 * Disconnect the socket manually and clean up.
 */
export function disconnectSocket() {
    if (socket) {
        socket.removeAllListeners();
        socket.close();
        socket = null;
    }
}

/**
 * Subscribe to a socket event with automatic cleanup.
 *
 * @param {string} event - The event name to listen for
 * @param {Function} handler - Callback function when event is received
 * @returns {Function} Unsubscribe function to remove the listener
 */
export function onSocketEvent(event, handler) {
    const s = getSocket();
    s.on(event, handler);
    return () => {
        s.off(event, handler);
    };
}

export default {
    getSocket,
    disconnectSocket,
    onSocketEvent,
};