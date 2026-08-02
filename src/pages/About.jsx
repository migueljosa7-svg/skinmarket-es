import React from 'react';

const infoSection = {
  marginBottom: '30px',
  padding: '30px',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: '20px',
};

const headingStyle = {
  fontSize: '2.5rem',
  fontWeight: '900',
  margin: '0 0 30px 0',
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

const About = () => {
    return (
        <div style={{ padding: '80px 20px', maxWidth: '800px', margin: '0 auto', color: 'white', fontFamily: 'Inter, sans-serif', lineHeight: '1.6' }}>
            <h1 style={headingStyle}>Sobre Nosotros</h1>

            <section style={infoSection}>
                <h2 style={subheadingStyle}>Nuestra Misión</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    En SkinMarket ES, nos dedicamos a proporcionar la plataforma más segura y emocionante para los entusiastas de CS2 en España. Nuestra misión es ofrecer una experiencia de usuario premium, transparente y justa para la apertura de cajas y el intercambio de skins.
                </p>
            </section>

            <section style={infoSection}>
                <h2 style={subheadingStyle}>¿Quiénes Somos?</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Somos un equipo de apasionados por Counter-Strike que entendemos el valor y la emoción de coleccionar skins exclusivas. Hemos construido esta plataforma con tecnologías de última generación para garantizar la rapidez en las transacciones y la seguridad de tus activos digitales.
                </p>
            </section>

            <section style={infoSection}>
                <h2 style={subheadingStyle}>¿Por Qué Elegirnos?</h2>
                <ul style={{ color: 'rgba(255,255,255,0.7)', paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '10px' }}><strong style={{ color: '#f5ac3b' }}>Transparencia:</strong> Todos nuestros algoritmos de apertura son auditables.</li>
                    <li style={{ marginBottom: '10px' }}><strong style={{ color: '#f5ac3b' }}>Soporte en Español:</strong> Atención personalizada para nuestra comunidad local.</li>
                    <li style={{ marginBottom: '10px' }}><strong style={{ color: '#f5ac3b' }}>Rapidez:</strong> Retiros de skins ultra-rápidos a través de la API de Steam.</li>
                </ul>
            </section>

            <section style={infoSection}>
                <h2 style={subheadingStyle}>Contacto</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Si tienes cualquier duda, sugerencia o problema, puedes contactarnos a través de nuestras redes sociales o nuestro sistema de soporte integrado.
                </p>
            </section>
        </div>
    );
};

export default About;

