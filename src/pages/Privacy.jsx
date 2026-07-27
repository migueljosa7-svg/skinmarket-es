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

const Privacy = () => {
    return (
        <div style={{ padding: '80px 20px', maxWidth: '800px', margin: '0 auto', color: 'white', fontFamily: 'Inter, sans-serif', lineHeight: '1.6' }}>
            <h1 style={headingStyle}>Política de Privacidad</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '30px' }}><strong>Última actualización: 26 de febrero de 2026</strong></p>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>1. Información que Recopilamos</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Recopilamos información básica para mejorar su experiencia en SkinMarket ES, incluyendo datos de inicio de sesión a través de Steam, historial de transacciones en el sitio y preferencias de usuario.</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>2. Uso de la Información</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Sus datos se utilizan exclusivamente para:</p>
                <ul style={{ color: 'rgba(255,255,255,0.7)', paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '8px' }}>Gestionar su cuenta y transacciones de skins.</li>
                    <li style={{ marginBottom: '8px' }}>Personalizar su experiencia en nuestra plataforma.</li>
                    <li style={{ marginBottom: '8px' }}>Mejorar nuestros servicios y seguridad.</li>
                    <li style={{ marginBottom: '8px' }}>Cumplir con las normativas legales de Google AdSense.</li>
                </ul>
            </section>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>3. Cookies y Publicidad</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Utilizamos cookies para analizar el tráfico y personalizar los anuncios a través de Google AdSense. Los proveedores de terceros, incluido Google, utilizan cookies para mostrar anuncios basados en las visitas anteriores de un usuario a su sitio web o a otros sitios web.</p>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Puede inhabilitar la publicidad personalizada visitando <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: '#f5ac3b' }}>Configuración de anuncios</a>.</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>4. Seguridad</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Implementamos medidas de seguridad técnicas para proteger su información personal. No compartimos sus datos con terceros sin su consentimiento, excepto por requerimientos legales.</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={subheadingStyle}>5. Contacto</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Si tiene preguntas sobre esta política, puede contactarnos a través de nuestro soporte técnico.</p>
            </section>
        </div>
    );
};

export default Privacy;

