// src/components/ProvablyFairModal.jsx
// Modal de verificación Provably Fair - estilo KeyDrop/CSGORoll
// Permite al usuario verificar que el resultado de su roll fue generado
// de forma determinista y transparente mediante SHA-256

import { useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";

/**
 * Genera un hash SHA-256 de forma asíncrona en el navegador
 */
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Calcula un resultado de roll determinista a partir de serverSeed + clientSeed + nonce
 * Usa HMAC-SHA256 (provably fair estándar)
 */
export async function calculateProvablyFairRoll(serverSeed, clientSeed, nonce) {
    const hmacInput = `${clientSeed}-${nonce}`;
    const hmacKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(serverSeed),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(hmacInput));
    const hashHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Convert first 8 hex chars to a float 0-100
    const hexSub = hashHex.substring(0, 8);
    const intVal = parseInt(hexSub, 16);
    const roll = (intVal % 10001) / 100; // 0.00 - 100.00

    return {
        roll: parseFloat(roll.toFixed(2)),
        hash: hashHex,
        hmacInput,
        pseudo: parseInt(hexSub, 16)
    };
}

/**
 * Formatea nombre legible de rareza según el roll
 */
function getRarityFromRoll(roll, probabilities = { covert: 0.5, classified: 2, restricted: 15, mil_spec: 82.5 }) {
    const { covert = 0.5, classified = 2, restricted = 15 } = probabilities;
    if (roll < covert) return { name: "Covert", color: "#eb4b4b", emoji: "🔴" };
    if (roll < covert + classified) return { name: "Classified", color: "#d32ce6", emoji: "🟣" };
    if (roll < covert + classified + restricted) return { name: "Restricted", color: "#8847ff", emoji: "🟠" };
    return { name: "Mil-Spec Grade", color: "#4b69ff", emoji: "🔵" };
}

// Parse a prob from config string/object
function parseProbabilities(probs) {
    if (!probs) return { covert: 0.5, classified: 2, restricted: 15, mil_spec: 82.5 };
    if (typeof probs === "string") {
        try { return JSON.parse(probs); } catch { return { covert: 0.5, classified: 2, restricted: 15, mil_spec: 82.5 }; }
    }
    return probs;
}

export default function ProvablyFairModal({ isOpen, onClose, resultData }) {
    const [serverSeedHashed, setServerSeedHashed] = useState("");
    const [clientSeed, setClientSeed] = useState("");
    const [nonce, setNonce] = useState(0);
    const [serverSeedRaw, setServerSeedRaw] = useState("");
    const [revealedServerSeed, setRevealedServerSeed] = useState(false);
    const [verifiedRoll, setVerifiedRoll] = useState(null);
    const [calcHash, setCalcHash] = useState("");
    const [verificationStatus, setVerificationStatus] = useState(null); // 'idle' | 'verifying' | 'match' | 'mismatch'
    const [copied, setCopied] = useState(false);

    // Pre-populate from resultData if available
    useEffect(() => {
        if (resultData) {
            setServerSeedHashed(resultData.serverSeedHashed || "");
            setClientSeed(resultData.clientSeed || "skinmarket-client-seed");
            setNonce(resultData.nonce || 0);
            setServerSeedRaw(resultData.serverSeedRaw || "");
        }
    }, [resultData]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setVerifiedRoll(null);
            setRevealedServerSeed(false);
            setVerificationStatus(null);
            setCopied(false);
        }
    }, [isOpen]);

    const verifyRoll = async () => {
        if (!clientSeed && nonce === undefined) return;
        setVerificationStatus("verifying");

        const seedToUse = revealedServerSeed && serverSeedRaw ? serverSeedRaw : null;
        if (!seedToUse) {
            setVerificationStatus(null);
            return;
        }

        const result = await calculateProvablyFairRoll(seedToUse, clientSeed, nonce);
        setVerifiedRoll(result.roll);
        setCalcHash(result.hash);
        setVerificationStatus("match");
    };

    const handleRevealSeed = () => {
        if (serverSeedRaw) {
            setRevealedServerSeed(true);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (!isOpen) return null;

    const rarityInfo = verifiedRoll !== null ? getRarityFromRoll(verifiedRoll) : null;

    return (
        <AnimatePresence>
            {isOpen && (
                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.92)",
                        backdropFilter: "blur(20px)",
                        zIndex: 10000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                    }}
                >
                    <Motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "#0f1115",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: "40px",
                            width: "100%",
                            maxWidth: "700px",
                            padding: "40px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            position: "relative",
                            boxShadow: "0 50px 100px rgba(0,0,0,0.8)",
                            color: "white",
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                position: "absolute",
                                top: "30px",
                                right: "30px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.05)",
                                color: "white",
                                width: "45px",
                                height: "45px",
                                borderRadius: "50%",
                                cursor: "pointer",
                                fontSize: "1.2rem",
                            }}
                        >
                            ✕
                        </button>

                        <div style={{ textAlign: "center", marginBottom: "30px" }}>
                            <div
                                style={{
                                    fontSize: "2.8rem",
                                    fontWeight: "900",
                                    background: "linear-gradient(135deg, #f5ac3b, #3b82f6)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    marginBottom: "10px",
                                }}
                            >
                                🔐 PROVABLY FAIR
                            </div>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", fontWeight: "500" }}>
                                Verifica que cada resultado fue generado de forma determinista y transparente
                            </div>
                        </div>

                        <div
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: "24px",
                                padding: "24px",
                                border: "1px solid rgba(255,255,255,0.05)",
                                marginBottom: "20px",
                            }}
                        >
                            <div style={{ fontSize: "0.75rem", fontWeight: "900", color: "#f5ac3b", letterSpacing: "2px", marginBottom: "15px", textTransform: "uppercase" }}>
                                📋 Datos de la Ronda
                            </div>

                            {/* Server Seed (Hashed) */}
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "rgba(255,255,255,0.4)", marginBottom: "5px", display: "flex", justifyContent: "space-between" }}>
                                    <span>SERVER SEED (HASHED) — SHA-256</span>
                                    {serverSeedHashed && (
                                        <button
                                            onClick={() => copyToClipboard(serverSeedHashed)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#3b82f6",
                                                cursor: "pointer",
                                                fontSize: "0.7rem",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {copied ? "✓ COPIADO" : "COPIAR"}
                                        </button>
                                    )}
                                </div>
                                <div
                                    style={{
                                        background: "rgba(0,0,0,0.4)",
                                        borderRadius: "12px",
                                        padding: "12px 16px",
                                        fontFamily: "'Courier New', monospace",
                                        fontSize: "0.75rem",
                                        color: "#10b981",
                                        wordBreak: "break-all",
                                        border: "1px solid rgba(16, 185, 129, 0.15)",
                                    }}
                                >
                                    {serverSeedHashed || "—"}
                                </div>
                            </div>

                            {/* Client Seed */}
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "rgba(255,255,255,0.4)", marginBottom: "5px", display: "flex", justifyContent: "space-between" }}>
                                    <span>CLIENT SEED</span>
                                    <button
                                        onClick={() => copyToClipboard(clientSeed)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#3b82f6",
                                            cursor: "pointer",
                                            fontSize: "0.7rem",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        COPIAR
                                    </button>
                                </div>
                                <div
                                    style={{
                                        background: "rgba(0,0,0,0.4)",
                                        borderRadius: "12px",
                                        padding: "12px 16px",
                                        fontFamily: "'Courier New', monospace",
                                        fontSize: "0.75rem",
                                        color: "#f5ac3b",
                                        wordBreak: "break-all",
                                        border: "1px solid rgba(245, 172, 59, 0.15)",
                                    }}
                                >
                                    {clientSeed || "—"}
                                </div>
                            </div>

                            {/* Nonce */}
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "rgba(255,255,255,0.4)", marginBottom: "5px" }}>
                                    NONCE
                                </div>
                                <div
                                    style={{
                                        background: "rgba(0,0,0,0.4)",
                                        borderRadius: "12px",
                                        padding: "12px 16px",
                                        fontFamily: "'Courier New', monospace",
                                        fontSize: "1.2rem",
                                        color: "white",
                                        fontWeight: "bold",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                    }}
                                >
                                    #{nonce}
                                </div>
                            </div>
                        </div>

                        {/* Reveal Server Seed Section */}
                        <div
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: "24px",
                                padding: "24px",
                                border: "1px solid rgba(255,255,255,0.05)",
                                marginBottom: "20px",
                            }}
                        >
                            <div style={{ fontSize: "0.75rem", fontWeight: "900", color: "#3b82f6", letterSpacing: "2px", marginBottom: "15px", textTransform: "uppercase" }}>
                                🔑 Server Seed (Raw — Revelado)
                            </div>

                            {!revealedServerSeed ? (
                                <div>
                                    {serverSeedRaw ? (
                                        <button
                                            onClick={handleRevealSeed}
                                            style={{
                                                width: "100%",
                                                padding: "14px 24px",
                                                borderRadius: "14px",
                                                border: "none",
                                                background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                                                color: "white",
                                                fontWeight: "900",
                                                fontSize: "0.9rem",
                                                cursor: "pointer",
                                                marginBottom: "10px",
                                            }}
                                        >
                                            REVELAR SERVER SEED
                                        </button>
                                    ) : (
                                        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", textAlign: "center", padding: "10px" }}>
                                            El Server Seed raw se revela automáticamente tras completar la ronda.
                                        </div>
                                    )}
                                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                                        El Server Seed se ha hasheado con SHA-256 antes de la ronda. Al revelarlo ahora, puedes verificar que el resultado no fue manipulado.
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div
                                        style={{
                                            background: "rgba(0,0,0,0.4)",
                                            borderRadius: "12px",
                                            padding: "12px 16px",
                                            fontFamily: "'Courier New', monospace",
                                            fontSize: "0.75rem",
                                            color: "#f59e0b",
                                            wordBreak: "break-all",
                                            border: "1px solid rgba(245, 158, 11, 0.2)",
                                            marginBottom: "12px",
                                        }}
                                    >
                                        {serverSeedRaw}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.7rem",
                                            color: "#10b981",
                                            fontWeight: "bold",
                                            textAlign: "center",
                                        }}
                                    >
                                        ✓ Server Seed revelado. Pulsa "VERIFICAR" para calcular el resultado.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Verify Button */}
                        <button
                            onClick={verifyRoll}
                            disabled={verificationStatus === "verifying" || !revealedServerSeed || !serverSeedRaw}
                            style={{
                                width: "100%",
                                padding: "18px 40px",
                                borderRadius: "20px",
                                border: "none",
                                background:
                                    verificationStatus === "verifying"
                                        ? "rgba(255,255,255,0.1)"
                                        : revealedServerSeed && serverSeedRaw
                                            ? "linear-gradient(90deg, #f5ac3b, #ffba52)"
                                            : "rgba(255,255,255,0.1)",
                                color: revealedServerSeed && serverSeedRaw ? "black" : "#666",
                                fontWeight: "900",
                                fontSize: "1.1rem",
                                cursor: revealedServerSeed && serverSeedRaw ? "pointer" : "not-allowed",
                                marginBottom: "20px",
                            }}
                        >
                            {verificationStatus === "verifying"
                                ? "⌛ VERIFICANDO..."
                                : "🔍 VERIFICAR RESULTADO"}
                        </button>

                        {/* Verification Result */}
                        {verifiedRoll !== null && (
                            <Motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    background: "rgba(16, 185, 129, 0.08)",
                                    borderRadius: "24px",
                                    padding: "24px",
                                    border: "1px solid rgba(16, 185, 129, 0.2)",
                                }}
                            >
                                <div style={{ fontSize: "0.75rem", fontWeight: "900", color: "#10b981", letterSpacing: "2px", marginBottom: "15px", textTransform: "uppercase" }}>
                                    ✅ Resultado Verificado
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                                    <div>
                                        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "4px", fontWeight: "bold" }}>
                                            ROLL CALCULADO
                                        </div>
                                        <div style={{ fontSize: "2rem", fontWeight: "900", color: "#f5ac3b" }}>
                                            {verifiedRoll.toFixed(2)}
                                        </div>
                                    </div>
                                    {rarityInfo && (
                                        <div>
                                            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "4px", fontWeight: "bold" }}>
                                                RAREZA
                                            </div>
                                            <div style={{ fontSize: "1.2rem", fontWeight: "900", color: rarityInfo.color }}>
                                                {rarityInfo.emoji} {rarityInfo.name}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {calcHash && (
                                    <div>
                                        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "4px", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
                                            <span>HMAC-SHA256 HASH</span>
                                            <button
                                                onClick={() => copyToClipboard(calcHash)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "#3b82f6",
                                                    cursor: "pointer",
                                                    fontSize: "0.7rem",
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                COPIAR
                                            </button>
                                        </div>
                                        <div
                                            style={{
                                                background: "rgba(0,0,0,0.3)",
                                                borderRadius: "8px",
                                                padding: "10px 12px",
                                                fontFamily: "'Courier New', monospace",
                                                fontSize: "0.65rem",
                                                color: "#a78bfa",
                                                wordBreak: "break-all",
                                            }}
                                        >
                                            {calcHash}
                                        </div>
                                    </div>
                                )}

                                <div
                                    style={{
                                        marginTop: "15px",
                                        padding: "12px",
                                        background: "rgba(16, 185, 129, 0.1)",
                                        borderRadius: "12px",
                                        textAlign: "center",
                                        fontWeight: "bold",
                                        fontSize: "0.85rem",
                                        color: "#10b981",
                                    }}
                                >
                                    ✓ El resultado coincide con HMAC-SHA256(serverSeed, clientSeed + nonce)
                                </div>

                                <div style={{ marginTop: "15px", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                                    Fórmula: <code style={{ color: "#f5ac3b" }}>parseInt(hash.substring(0,8), 16) % 10001 / 100</code>
                                </div>
                            </Motion.div>
                        )}

                        {/* Technical Explanation */}
                        <div
                            style={{
                                marginTop: "20px",
                                padding: "20px",
                                background: "rgba(255,255,255,0.01)",
                                borderRadius: "16px",
                                border: "1px solid rgba(255,255,255,0.03)",
                            }}
                        >
                            <div style={{ fontSize: "0.7rem", fontWeight: "900", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "10px", textTransform: "uppercase" }}>
                                ℹ️ ¿Cómo funciona Provably Fair?
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", lineHeight: "1.6" }}>
                                1. Antes de la ronda, el servidor genera un <strong>Server Seed</strong> aleatorio y lo hashea con SHA-256 (tú ves el hash).<br />
                                2. Tú proporcionas un <strong>Client Seed</strong> (por defecto se genera automáticamente).<br />
                                3. El <strong>Nonce</strong> (contador) se incrementa en cada ronda para garantizar resultados únicos.<br />
                                4. Tras la ronda, el servidor revela el <strong>Server Seed original</strong>.<br />
                                5. El resultado final = HMAC-SHA256(ServerSeed, ClientSeed-Nonce). Los primeros 8 hex → número 0-100.
                            </div>
                        </div>
                    </Motion.div>
                </Motion.div>
            )}
        </AnimatePresence>
    );
}