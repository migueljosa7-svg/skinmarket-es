// src/components/ErrorBoundary.jsx
import React from "react";

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0f1115",
                    color: "white",
                    padding: "40px",
                    textAlign: "center",
                    fontFamily: "'Inter', sans-serif"
                }}>
                    <div>
                        <div style={{ fontSize: "4rem", marginBottom: "20px" }}>⚠️</div>
                        <h1 style={{ fontSize: "2rem", fontWeight: "900", marginBottom: "10px" }}>
                            Algo salió mal
                        </h1>
                        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "30px" }}>
                            {this.state.error?.message || "Error inesperado en la aplicación"}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: "12px 30px",
                                background: "#f5ac3b",
                                color: "black",
                                border: "none",
                                borderRadius: "10px",
                                fontWeight: "900",
                                cursor: "pointer"
                            }}
                        >
                            Recargar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}