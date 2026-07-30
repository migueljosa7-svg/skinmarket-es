import SkinCard from "../components/SkinCard";
import { useFetchSkins } from "../hooks/useFetchSkins";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { motion as Motion } from "framer-motion";
import { PageLoader } from "../components/LoadingSkeleton";

export default function Home() {
  const { skins, loading } = useFetchSkins(8, true);
  const { user } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: 'white', overflow: 'hidden' }}>
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        padding: '160px 40px',
        textAlign: 'center',
        background: 'radial-gradient(circle at 50% 50%, rgba(245, 172, 59, 0.05) 0%, transparent 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute', top: '20%', left: '15%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, #f5ac3b11 0%, transparent 70%)',
          filter: 'blur(100px)', zIndex: 0
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '15%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, #3b82f611 0%, transparent 70%)',
          filter: 'blur(100px)', zIndex: 0
        }} />

        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ position: 'relative', zIndex: 1, maxWidth: '1000px' }}
        >
          <Motion.span
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: 'rgba(245, 172, 59, 0.1)',
              border: '1px solid rgba(245, 172, 59, 0.2)',
              borderRadius: '30px',
              color: '#f5ac3b',
              fontSize: '0.9rem',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              marginBottom: '40px'
            }}
          >
            LA PLATAFORMA #1 DE CS:GO EN ESPAÑA
          </Motion.span>

          <h1 style={{
            fontSize: "clamp(3.5rem, 10vw, 7rem)",
            margin: "0 0 30px 0",
            fontWeight: "900",
            lineHeight: "0.9",
            letterSpacing: "-4px",
            background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))'
          }}>
            EL MERCADO <br />
            <span style={{
              background: 'linear-gradient(90deg, #f5ac3b, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>MAS EXCLUSIVO</span>
          </h1>

          <p style={{
            fontSize: "1.4rem",
            color: "rgba(255,255,255,0.4)",
            margin: "0 0 60px 0",
            maxWidth: "700px",
            lineHeight: '1.6',
            marginInline: 'auto',
            fontWeight: '500'
          }}>
            Vive la experiencia definitiva abriendo cajas premium, realizando upgrades
            de alto riesgo y compitiendo en batallas contra otros jugadores.
          </p>

          <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/cases" style={{ textDecoration: "none" }}>
              <Motion.button
                whileHover={{ scale: 1.05, translateY: -5 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: "22px 60px",
                  fontSize: "1.2rem",
                  fontWeight: "900",
                  color: "black",
                  background: "#f5ac3b",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  boxShadow: "0 20px 40px rgba(245, 172, 59, 0.3)",
                  letterSpacing: '1px'
                }}
              >
                EMPEZAR AHORA ◆
              </Motion.button>
            </Link>

            {!user && (
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Motion.button
                  whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "22px 60px",
                    fontSize: "1.2rem",
                    fontWeight: "900",
                    color: "white",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "20px",
                    cursor: "pointer",
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  INGRESAR
                </Motion.button>
              </Link>
            )}
          </div>
        </Motion.div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '0 40px 140px' }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '30px'
        }}>
          {[
            { label: 'Skins Activas', value: '18,500+', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f5ac3b" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
            { label: 'Cajas Unicas', value: '250+', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f5ac3b" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg> },
            { label: 'Usuarios VIP', value: '125k+', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f5ac3b" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> }
          ].map((stat, i) => (
            <Motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '50px 40px',
                borderRadius: '40px',
                textAlign: 'center'
              }}
            >
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
              <div style={{ fontSize: '3rem', fontWeight: '900', color: 'white', marginBottom: '8px', letterSpacing: '-1px' }}>{stat.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.85rem', fontWeight: '900' }}>{stat.label}</div>
            </Motion.div>
          ))}
        </div>
      </section>

      {/* Featured Skins Section */}
      <section style={{ padding: '0 40px 160px' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '80px' }}>
            <div>
              <h2 style={{ fontSize: '4rem', fontWeight: '900', margin: 0, letterSpacing: '-2px' }}>
                ÚLTIMOS <span style={{ color: '#f5ac3b' }}>DROPS</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.3)', margin: '15px 0 0 0', fontSize: '1.2rem', fontWeight: '500' }}>
                Las skins más exclusivas obtenidas por nuestra comunidad en tiempo real.
              </p>
            </div>
            <Link to="/cases" style={{ textDecoration: 'none', color: '#f5ac3b', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '1px' }}>
              EXPLORAR TODO →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '40px' }}>
            {skins.map((skin, i) => (
              <Motion.div
                key={skin.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <SkinCard skin={skin} />
              </Motion.div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes homeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}