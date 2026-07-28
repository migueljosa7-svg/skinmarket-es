/**
 * Socket.io Client Service
 *
 * Creates a singleton Socket.io client instance with progressive reconnection.
 * Uses configurable transports with fallback and exponential back-off.
 *
 * PRODUCCIÓN: Todos los logs silenciados completamente (0 salida a consola).
 */
import { io } from "socket.io-client";

const isProd = typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production";
const _log = isProd ? () => {} : () => {};
const _warn = isProd ? () => {} : () => {};

// Usar VITE_API_URL (sin trailing slash) para compatibilidad con el backend Socket.IO
// Fallback a VITE_BACKEND_URL y luego a localhost
const SOCKET_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/+$/, '');

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
        transports: ["websocket", "polling"], // websocket first, fallback to polling transparently
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        autoConnect: true,
        forceNew: false,
        rejectUnauthorized: false,
    });

    socket.on("connect", () => {
        _log(`[SOCKET] Conectado: ${socket.id}`);
    });

    socket.on("disconnect", (reason) => {
        _log(`[SOCKET] Desconectado: ${reason}`);
    });

    socket.on("connect_error", (err) => {
        _warn("[SOCKET] Error de conexión:", err.message);
    });

    socket.on("reconnect_attempt", (attempt) => {
        _log(`[SOCKET] Intento de reconexión #${attempt}`);
    });

    socket.on("reconnect", (attempt) => {
        _log(`[SOCKET] Reconectado en intento #${attempt}`);
    });

    socket.on("reconnect_error", (err) => {
        _warn("[SOCKET] Error en reconexión:", err.message);
    });

    socket.on("reconnect_failed", () => {
        _warn("[SOCKET] Todas las reconexiones fallaron.");
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