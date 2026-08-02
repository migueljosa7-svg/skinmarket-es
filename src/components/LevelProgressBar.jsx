// ─── LevelProgressBar.jsx ─────────────────────────────────────────
// Reusable XP/Level progress bar with gradient fill + shimmer.
// Used in NavBar (compact) and Dashboard (full size).
// XP thresholds are based on total deposited volume (Level System):
// Level N requires N*1000 XP. 1€ spent = 100 XP.
// ───────────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 1000;

/**
 * Compute how much XP is needed to go from `level` to `level+1`.
 * @param {number} level - Current level (0-based start).
 * @returns {number} XP required to reach the next level.
 */
export function getXpForNextLevel(level) {
  const current = Math.max(0, level || 0);
  return (current + 1) * XP_PER_LEVEL;
}

/**
 * Compute XP progress within the current level.
 * @param {number} experiencia - Total accumulated XP.
 * @param {number} level - Current user level.
 * @returns {{ levelXp, nextLevelXp, progress, levelLabel }}
 */
export function computeLevelProgress(experiencia, level) {
  const lvl = Math.max(0, level || 0);
  const totalXp = Math.max(0, experiencia || 0);

  // XP consumed by levels 0..lvl-1
  let consumed = 0;
  for (let i = 0; i < lvl; i++) {
    consumed += (i + 1) * XP_PER_LEVEL;
  }

  const levelXp = Math.max(0, totalXp - consumed);
  const nextLevelXp = (lvl + 1) * XP_PER_LEVEL;
  const progress = Math.min(100, Math.max(0, (levelXp / nextLevelXp) * 100));

  return {
    levelXp,
    nextLevelXp,
    progress,
    levelLabel: `NIVEL ${lvl}`
  };
}

/**
 * Compact XP bar for the NavBar (small width, inline-block).
 */
export default function LevelProgressBar({
  experiencia = 0,
  nivel = 0,
  showLabel = true,
  compact = false,
  width = "120px"
}) {
  const { levelXp, nextLevelXp, progress, levelLabel } = computeLevelProgress(experiencia, nivel);
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: compact ? width : "100%",
        flexShrink: 0,
        userSelect: "none"
      }}
    >
      {showLabel && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: compact ? "0.6rem" : "0.75rem",
            fontWeight: 900,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "1px"
          }}
        >
          <span>{levelLabel}</span>
          <span style={{ color: "#f5ac3b" }}>
            {Math.floor(levelXp).toLocaleString("es-ES")} / {Math.floor(nextLevelXp).toLocaleString("es-ES")} XP
          </span>
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: "100%",
          height: compact ? "6px" : "12px",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          border: "1px solid rgba(245,172,59,0.15)"
        }}
      >
        {/* Gradient fill */}
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "999px",
            background: "linear-gradient(90deg, #f5ac3b, #ffd88a, #f5ac3b)",
            backgroundSize: "200% 100%",
            animation: "smXpShimmer 2.5s linear infinite",
            boxShadow: "0 0 12px rgba(245,172,59,0.6)",
            transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)"
          }}
        />
        {/* Glow dot at tip */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${pct}%`,
            width: compact ? "10px" : "16px",
            height: compact ? "10px" : "16px",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 10px rgba(245,172,59,0.9), 0 0 20px rgba(245,172,59,0.5)",
            transition: "left 0.6s cubic-bezier(0.22, 1, 0.36, 1)"
          }}
        />
        <style>{`
          @keyframes smXpShimmer {
            0%   { background-position: 0% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    </div>
  );
}

