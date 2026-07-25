import React from 'react';
import { Link } from 'react-router-dom';
import { getPlaceholderImage } from "../services/ImageService";

const Footer = () => {
    return (
        <footer style={{
            backgroundColor: '#0a0a0c',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '40px 20px',
            marginTop: '50px',
            color: '#888',
            textAlign: 'center'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '20px' }}>
                    <img
                        src="/logo.png"
                        alt="SkinMarket ES"
                        onError={(e) => {
                            e.target.src = getPlaceholderImage("SkinMarket");
                            e.target.style.height = '30px';
                        }}
                        style={{ height: '40px', marginBottom: '10px' }}
                    />
                    <p style={{ fontSize: '14px' }}>El mejor mercado de skins de CS2 en España. Abre cajas, gana batallas y mejora tu inventario.</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px' }}>
                    <Link to="/about" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>Sobre Nosotros</Link>
                    <Link to="/privacy" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>Política de Privacidad</Link>
                    <Link to="/terms" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>Términos de Servicio</Link>
                    <Link to="/" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>Inicio</Link>
                </div>


                <div style={{ fontSize: '12px', opacity: 0.6 }}>
                    &copy; 2026 SkinMarket ES. Todos los derechos reservados. No estamos afiliados con Valve Corporation o Steam.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
