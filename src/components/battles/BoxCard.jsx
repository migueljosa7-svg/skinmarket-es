// src/components/battles/BoxCard.jsx
// Case selection card for battle configuration.
// Extracted from Battles.jsx (PHASE 6.2 refactor).
import { motion as Motion } from "framer-motion";

const BoxCard = ({ c, qty, onAdd, onRemove }) => {
  return (
    <Motion.div
      whileHover={{ y: -5 }}
      style={{
        position: "relative",
        borderRadius: "24px",
        overflow: "hidden",
        border: qty > 0 ? `2px solid ${c.color}` : "1.5px solid rgba(255,255,255,0.05)",
        cursor: "pointer",
        transition: "all 0.2s",
        background: 'rgba(255,255,255,0.02)',
        boxShadow: qty > 0 ? `0 10px 30px ${c.color}25` : "none",
        minHeight: "220px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: c.bgGradient,
          opacity: 0.1,
        }}
      />

      {qty > 0 && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: c.color,
            color: "black",
            borderRadius: "10px",
            minWidth: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "900",
            fontSize: "0.75rem",
            zIndex: 5,
            padding: '0 8px'
          }}
        >
          {qty}
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "20px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: 'border-box'
        }}
      >
        <div style={{ fontSize: "2.8rem", marginBottom: "10px" }}>
          {c.emoji}
        </div>

        <div
          style={{
            color: "white",
            fontSize: "0.85rem",
            textAlign: "center",
            fontWeight: "800",
            lineHeight: "1.2",
            marginBottom: "5px",
            width: '100%',
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {c.name}
        </div>

        <div
          style={{
            color: c.color,
            fontWeight: "900",
            fontSize: "1rem",
            marginBottom: "20px",
            letterSpacing: '0.5px'
          }}
        >
          {c.price}€
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "14px",
            padding: "5px",
            marginTop: "auto",
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(c.id);
            }}
            style={{
              background: qty > 0 ? "rgba(239,68,68,0.1)" : "transparent",
              border: "none",
              color: qty > 0 ? "#ef4444" : "rgba(255,255,255,0.1)",
              fontSize: "1.2rem",
              cursor: qty > 0 ? "pointer" : "default",
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: '900'
            }}
          >
            −
          </button>
          <span
            style={{
              color: "white",
              fontWeight: "900",
              fontSize: "0.9rem",
              minWidth: "20px",
              textAlign: "center",
            }}
          >
            {qty}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(c.id);
            }}
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "none",
              color: "#10b981",
              fontSize: "1.2rem",
              cursor: "pointer",
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: '900'
            }}
          >
            +
          </button>
        </div>
      </div>
    </Motion.div>
  );
};

export default BoxCard;