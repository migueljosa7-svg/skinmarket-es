import { motion as Motion } from "framer-motion";
import { getRarityColor } from "../constants/colors";
import { getPlaceholderImage, handleImageError } from "../services/ImageService";

export default function SkinCard({ skin }) {
  const rarity = skin.rarity || "Mil-Spec Grade";
  const color = getRarityColor(rarity) || "#f5ac3b";

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, cubicBezier: [0.175, 0.885, 0.32, 1.275] }}
      style={{
        background: "rgba(255,255,255,0.02)",
        borderRadius: "24px",
        padding: "24px",
        color: "white",
        textAlign: "left",
        borderWidth: "1px 1px 4px 1px",
        borderStyle: "solid",
        borderColor: `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
        cursor: "pointer",
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: `radial-gradient(circle at center, ${color}11 0%, transparent 50%)`,
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div>
        {/* Rarity Tag */}
        <div style={{
          display: 'inline-block',
          fontSize: '0.65rem',
          fontWeight: '900',
          padding: '4px 10px',
          borderRadius: '8px',
          background: `${color}15`,
          color: color,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '20px',
          border: `1px solid ${color}33`,
          position: 'relative',
          zIndex: 1
        }}>
          {rarity}
        </div>

        {/* Image Container */}
        <div style={{ position: 'relative', height: '160px', marginBottom: '20px', zIndex: 1 }}>
          <img
            src={skin.image || getPlaceholderImage(skin.name)}
            alt={skin.name}
onError={(e) => handleImageError(e, skin)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.5))",
              opacity: skin.image ? 1 : 0.3
            }}
          />
        </div>

        {/* Name and Series */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{
            fontSize: "1.1rem",
            marginBottom: "6px",
            fontWeight: '700',
            lineHeight: '1.2',
            height: '2.6rem',
            overflow: 'hidden'
          }}>
            {skin.name}
          </h3>
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.8rem',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            COLECCIÓN ESTÁNDAR
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '25px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ fontWeight: "900", fontSize: "1.4rem", color: '#fff' }}>
          €{Number(skin.price || 0).toFixed(2)}
        </div>

      </div>
    </Motion.div>
  );
}
