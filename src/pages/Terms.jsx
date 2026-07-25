import React from 'react';

const sectionStyle = {
  marginBottom: '30px',
  padding: '30px',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '20px',
};

const headingStyle = {
  fontSize: '2.5rem',
  fontWeight: '900',
  margin: '0 0 10px 0',
  letterSpacing: '-2px',
  background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const subheadingStyle = {
  color: '#f5ac3b',
  fontSize: '1.1rem',
  fontWeight: '900',
  marginBottom: '15px',
  letterSpacing: '2px',
  textTransform: 'uppercase',
};

const Terms = () => {
    return (
        <div style={{ padding: '80px 20px', maxWidth: '800px', margin: '0 auto', color: 'white', fontFamily: 'Inter, sans-serif', lineHeight: '1.6' }}>
            <h1 style={headingStyle}>Términos de Servicio</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '30px' }}><strong>Última actualización: 26 de febrero de 2026</strong></p>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>1. Aceptación de los Términos</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Al acceder y utilizar SkinMarket ES, usted acepta cumplir con estos términos de servicio y todas las leyes aplicables.</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>2. Uso del Sitio</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Usted debe tener al menos 18 años para utilizar este sitio. SkinMarket ES ofrece servicios de apertura de cajas y mejora de skins de CS2 con fines de entretenimiento.</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>3. Transacciones y Valor</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Las skins en SkinMarket ES se basan en valores de mercado. No garantizamos beneficios económicos ni el valor futuro de los artículos obtenidos.</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>4. Prohibiciones</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Queda prohibido el uso de scripts, bots o cualquier método automatizado para interactuar con el sitio sin autorización previa.</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>5. Limitación de Responsabilidad</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>SkinMarket ES no se hace responsable de las pérdidas resultantes del uso del sitio o de problemas técnicos relacionados con la API de Steam.</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>6. Modificaciones</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado del sitio implica la aceptación de los nuevos términos.</p>
            </section>
        </div>
    );
};

export default Terms;

