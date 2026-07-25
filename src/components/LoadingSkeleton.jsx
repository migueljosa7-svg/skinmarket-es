import { motion as Motion } from "framer-motion";

/**
 * Professional loading skeleton components for SkinMarket
 * Uses framer-motion for smooth shimmer animations
 */

const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
};

const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)',
  backgroundSize: '200% 100%',
  borderRadius: '12px',
};

function ShimmerBlock({ width = '100%', height = '20px', style = {} }) {
  return (
    <Motion.div
      style={{ ...shimmerStyle, width, height, ...style }}
      animate={shimmer.animate}
      transition={shimmer.transition}
    />
  );
}

export function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1115',
    }}>
      <div style={{ textAlign: 'center' }}>
        <Motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(245, 172, 59, 0.1)',
            borderTop: '3px solid #f5ac3b',
            borderRadius: '50%',
            margin: '0 auto 20px',
          }}
        />
        <div style={{
          color: '#f5ac3b',
          fontSize: '0.85rem',
          fontWeight: '900',
          letterSpacing: '3px',
          textTransform: 'uppercase',
        }}>
          Cargando...
        </div>
      </div>
    </div>
  );
}

export function SkinCardSkeleton() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <ShimmerBlock width="80px" height="18px" style={{ marginBottom: '20px' }} />
      <ShimmerBlock height="160px" style={{ marginBottom: '20px', borderRadius: '12px' }} />
      <ShimmerBlock width="70%" height="22px" style={{ marginBottom: '8px' }} />
      <ShimmerBlock width="40%" height="16px" style={{ marginBottom: '25px' }} />
      <ShimmerBlock width="50%" height="28px" />
    </div>
  );
}

export function InventorySkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '20px' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <ShimmerBlock height="90px" style={{ marginBottom: '12px', borderRadius: '8px' }} />
          <ShimmerBlock width="60%" height="14px" style={{ marginBottom: '6px' }} />
          <ShimmerBlock width="80%" height="16px" style={{ marginBottom: '6px' }} />
          <ShimmerBlock width="40%" height="20px" style={{ marginBottom: '15px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <ShimmerBlock width="50%" height="32px" style={{ borderRadius: '8px' }} />
            <ShimmerBlock width="50%" height="32px" style={{ borderRadius: '8px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CasesGridSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '25px' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <ShimmerBlock height="220px" style={{ borderRadius: 0 }} />
          <div style={{ padding: '20px' }}>
            <ShimmerBlock width="80%" height="14px" style={{ marginBottom: '15px' }} />
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              {Array.from({ length: 4 }).map((_, j) => (
                <ShimmerBlock key={j} width="35px" height="35px" style={{ borderRadius: '8px' }} />
              ))}
            </div>
            <ShimmerBlock width="40%" height="24px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableRowSkeleton({ rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: '20px',
          padding: '18px 25px',
          borderBottom: '1px solid rgba(255,255,255,0.02)',
          alignItems: 'center',
        }}>
          <ShimmerBlock width="30px" height="18px" />
          <ShimmerBlock width="60%" height="18px" />
          <ShimmerBlock width="20%" height="18px" />
          <ShimmerBlock width="15%" height="18px" />
          <ShimmerBlock width="15%" height="18px" />
        </div>
      ))}
    </>
  );
}

export default PageLoader;

