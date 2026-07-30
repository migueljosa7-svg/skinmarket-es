import React from 'react';
import { Link } from 'react-router-dom';
import { FiShield, FiFileText, FiLock, FiHelpCircle, FiInfo, FiHome, FiMail, FiClock, FiAlertTriangle, FiCreditCard, FiDollarSign, FiGift, FiServer, FiZap, FiAward, FiGrid } from "react-icons/fi";
import { FaSteam } from "react-icons/fa";

const footerLinkStyle = {
  color: 'rgba(255,255,255,0.5)',
  textDecoration: 'none',
  fontSize: '0.85rem',
  transition: 'color 0.2s ease',
  display: 'block',
  padding: '4px 0',
};

const footerLinkHoverStyle = {
  color: 'rgba(255,255,255,0.8)',
};

const columnTitleStyle = {
  color: 'white',
  fontSize: '0.85rem',
  fontWeight: '900',
  marginBottom: '15px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: '#08080a',
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      padding: '60px 20px 30px',
      marginTop: '80px',
      color: '#888',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '40px',
      }}>
        {/* Column 1: Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#f5ac3b',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              color: 'black',
              fontSize: '1rem',
            }}>S</div>
            <span style={{ fontWeight: '900', color: 'white', fontSize: '1.1rem' }}>
              SKINMART<span style={{ color: '#f5ac3b' }}>ES</span>
            </span>
          </div>
          <p style={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.4)',
            lineHeight: '1.6',
            marginBottom: '20px',
          }}>
            El mercado de skins de CS2 mas seguro y emocionante en España.
            Abre cajas, mejora tus skins y participa en batallas.
          </p>

          {/* +18 Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(245, 172, 59, 0.1)',
            border: '1px solid rgba(245, 172, 59, 0.2)',
            borderRadius: '10px',
            padding: '8px 14px',
            marginBottom: '15px',
          }}>
            <span style={{
              background: '#f5ac3b',
              color: 'black',
              fontWeight: '900',
              fontSize: '0.8rem',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>+18</span>
            <span style={{ color: 'rgba(245, 172, 59, 0.8)', fontSize: '0.75rem', fontWeight: '600' }}>
              Juego Responsable
            </span>
          </div>

          {/* Valve Disclaimer */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.3)',
            lineHeight: '1.5',
          }}>
            <FiAlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '4px', color: '#f5ac3b' }} />
            SkinMarket ES <strong>no esta afiliado</strong> con Valve Corporation,
            Steam, o cualquiera de sus subsidiarias. Todas las marcas comerciales y
            derechos de autor son propiedad de sus respectivos dueños. CS2 y Steam
            son marcas registradas de Valve Corporation.
          </div>
        </div>

        {/* Column 2: Navigation */}
        <div>
          <div style={columnTitleStyle}>Navegación</div>
          <Link to="/cases" style={footerLinkStyle}><FiGrid size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Cajas</Link>
          <Link to="/upgrade" style={footerLinkStyle}><FiZap size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Upgrade</Link>
          <Link to="/contracts" style={footerLinkStyle}><FiFileText size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Contratos</Link>
          <Link to="/battles" style={footerLinkStyle}><FiAward size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Batallas</Link>
          <Link to="/ranking" style={footerLinkStyle}><FiServer size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Ranking</Link>
          <Link to="/inventory" style={footerLinkStyle}><FiGrid size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Inventario</Link>
        </div>

        {/* Column 3: Legal */}
        <div>
          <div style={columnTitleStyle}>Legal</div>
          <Link to="/terms" style={footerLinkStyle}><FiFileText size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Terminos de Servicio</Link>
          <Link to="/privacy" style={footerLinkStyle}><FiLock size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Politica de Privacidad</Link>
          <Link to="/faq" style={footerLinkStyle}><FiHelpCircle size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Preguntas Frecuentes (FAQ)</Link>
          <Link to="/about" style={footerLinkStyle}><FiInfo size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Sobre Nosotros</Link>
          <a
            href="https://www.valvesoftware.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={footerLinkStyle}
          >
            <FaSteam size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Valve Corporation
          </a>
        </div>

        {/* Column 4: Help & Contact */}
        <div>
          <div style={columnTitleStyle}>Ayuda</div>
          <div style={footerLinkStyle}><FiMail size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />soporte@skinmarket.es</div>
          <div style={{ ...footerLinkStyle, cursor: 'default' }}><FiClock size={12} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Lun-Vie 10:00-19:00</div>
          <div style={{ marginTop: '20px' }}>
            <div style={columnTitleStyle}>Juego Responsable</div>
            <p style={{
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.4)',
              lineHeight: '1.6',
              margin: 0,
            }}>
              Esta plataforma esta destinada a mayores de 18 años. Las skins
              obtenidas no tienen valor monetario real fuera de la plataforma.
              Establece limites y juega con responsabilidad.
            </p>
          </div>
          <div style={{ marginTop: '20px' }}>
            <div style={columnTitleStyle}>Metodos de Pago</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}><FiCreditCard size={10} />Visa</span>
              <span style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}><FiCreditCard size={10} />Mastercard</span>
              <span style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}><FiDollarSign size={10} />Crypto</span>
              <span style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}><FiGift size={10} />Gift</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{
        maxWidth: '1200px',
        margin: '40px auto 0',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px',
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.3)',
      }}>
        <div>
          &copy; 2026 SkinMarket ES. Todos los derechos reservados.
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <FiShield size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Usamos cookies para mejorar tu experiencia
          <Link to="/privacy" style={{ color: '#f5ac3b', textDecoration: 'none' }}>
            Mas info
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

