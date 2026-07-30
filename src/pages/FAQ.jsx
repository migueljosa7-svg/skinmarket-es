import React, { useState } from 'react';

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

const faqData = [
  {
    category: "General",
    icon: "◆",
    questions: [
      {
        q: "¿Qué es SkinMarket ES?",
        a: "SkinMarket ES es una plataforma de entretenimiento española donde puedes abrir cajas virtuales de CS2, mejorar tus skins mediante el sistema de upgrade, participar en batallas contra otros jugadores y gestionar tu inventario de skins. Todo con fines de entretenimiento y coleccionismo."
      },
      {
        q: "¿SkinMarket ES está afiliado con Valve Corporation?",
        a: "No. SkinMarket ES no está afiliado, asociado, respaldado ni patrocinado por Valve Corporation, Steam, o cualquiera de sus subsidiarias. Todas las marcas comerciales y derechos de autor son propiedad de sus respectivos dueños. CS2 y Steam son marcas registradas de Valve Corporation."
      },
      {
        q: "¿Es legal usar SkinMarket ES?",
        a: "SkinMarket ES opera como una plataforma de entretenimiento. Los usuarios deben ser mayores de 18 años (o la mayoría de edad legal en su país) para utilizar el sitio. El uso de la plataforma implica la aceptación de nuestros Términos de Servicio y Política de Privacidad."
      },
      {
        q: "¿Necesito tener CS2 para usar la plataforma?",
        a: "No necesitas tener CS2 instalado para usar SkinMarket ES, pero necesitarás una cuenta de Steam activa para retirar tus skins a tu inventario de Steam."
      }
    ]
  },
  {
    category: "Depósitos y Saldo",
    icon: "◆",
    questions: [
      {
        q: "¿Cómo puedo depositar dinero en mi cuenta?",
        a: "Puedes depositar saldo mediante tarjeta bancaria (Visa/Mastercard), criptomonedas (BTC, ETH, LTC, USDT, SOL), códigos de regalo, o depositando skins directamente desde tu inventario de Steam. Ve a tu perfil y haz clic en '+ RECARGAR' para ver todas las opciones."
      },
      {
        q: "¿Cuánto tiempo tarda en acreditarse un depósito?",
        a: "Los depósitos con tarjeta y códigos de regalo son instantáneos. Los depósitos con skins de Steam se procesan en cuanto se completa el intercambio. Los depósitos con criptomonedas dependen de las confirmaciones de la red blockchain (generalmente de 5 a 30 minutos)."
      },
      {
        q: "¿Hay un límite mínimo o máximo para depositar?",
        a: "El depósito mínimo es de 1€ y el máximo por transacción es de 5.000€. No hay límite en el número de transacciones diarias."
      },
      {
        q: "¿Puedo retirar mi saldo directamente?",
        a: "El saldo de SkinMarket ES está diseñado para usarse dentro de la plataforma (abrir cajas, participar en batallas, etc.). Para retirar valor, puedes comprar skins en el mercado y retirarlas a tu cuenta de Steam, o canjear tus ganancias a través de nuestro sistema de retiro de skins."
      }
    ]
  },
  {
    category: "Retiros y Steam",
    icon: "◆",
    questions: [
      {
        q: "¿Cómo retiro mis skins a Steam?",
        a: "Ve a tu perfil, selecciona la skin que deseas retirar y haz clic en 'Retirar'. Asegúrate de haber configurado tu Trade URL de Steam en los ajustes de tu perfil. La skin se enviará a tu inventario de Steam mediante una oferta de intercambio."
      },
      {
        q: "¿Cuánto tarda un retiro?",
        a: "Los retiros suelen procesarse en menos de 5 minutos. Si el bot no tiene la skin físicamente en su inventario, activamos nuestro sistema de mercado P2P para adquirirla automáticamente y enviártela."
      },
      {
        q: "¿Qué es el Trade URL y cómo lo configuro?",
        a: "El Trade URL (URL de intercambio) es un enlace único de Steam que permite a otros usuarios enviarte ofertas de intercambio. Para obtenerlo: ve a Steam → Inventario → Ofertas de intercambio → ¿Quién me puede enviar ofertas de intercambio? → Copiar el enlace. Luego pégalo en los ajustes de tu perfil en SkinMarket ES."
      },
      {
        q: "¿Por qué mi retiro aparece como 'Pendiente'?",
        a: "Esto puede ocurrir si el bot necesita adquirir la skin a través de nuestro sistema de mercado P2P externo. El proceso suele completarse en pocos minutos. Si el estado no cambia después de 30 minutos, contacta con nuestro soporte."
      }
    ]
  },
  {
    category: "Cajas y Probabilidades",
    icon: "◆",
    questions: [
      {
        q: "¿Cómo funcionan las cajas?",
        a: "Las cajas contienen un conjunto de skins con diferentes rarezas. Al abrir una caja, recibirás una skin aleatoria. Cada caja tiene probabilidades fijas y transparentes que determinan la rareza del objeto que obtendrás."
      },
      {
        q: "¿Están manipuladas las probabilidades?",
        a: "No. Las probabilidades de cada caja son fijas, transparentes y auditables. Puedes consultarlas en la página de administración. Creemos en la transparencia total con nuestra comunidad."
      },
      {
        q: "¿Puedo vender las skins que obtengo de las cajas?",
        a: "Sí. Todas las skins que obtienes al abrir cajas se añaden a tu inventario del sitio, desde donde puedes venderlas por saldo o retirarlas a tu cuenta de Steam."
      }
    ]
  },
  {
    category: "Seguridad y Cuenta",
    icon: "◆",
    questions: [
      {
        q: "¿Cómo protegen mi cuenta?",
        a: "Implementamos múltiples capas de seguridad: cifrado de contraseñas con bcrypt, autenticación JWT con expiración, sesiones seguras con Redis, rate limiting para prevenir ataques de fuerza bruta, y cifrado de datos sensibles."
      },
      {
        q: "¿Qué datos personales recopilan?",
        a: "Recopilamos únicamente la información necesaria para el funcionamiento del servicio: nombre de usuario, dirección de email, ID de Steam y datos de transacciones dentro de la plataforma. Consulta nuestra Política de Privacidad para más detalles."
      },
      {
        q: "¿Puedo eliminar mi cuenta?",
        a: "Sí. Puedes solicitar la eliminación de tu cuenta contactando con nuestro soporte. Todos tus datos personales serán eliminados de nuestros sistemas, aunque los registros de transacciones pueden conservarse por razones legales y contables."
      },
      {
        q: "He olvidado mi contraseña, ¿qué hago?",
        a: "En la página de inicio de sesión, haz clic en '¿Olvidaste tu contraseña?' e introduce tu email. Te enviaremos un enlace para restablecerla. Si también has perdido el acceso a tu email, contacta con soporte."
      }
    ]
  },
  {
    category: "Juego Responsable",
    icon: "◆",
    questions: [
      {
        q: "¿Qué medidas de juego responsable ofrecen?",
        a: "SkinMarket ES promueve el juego responsable. Ofrecemos límites de depósito configurables, la posibilidad de auto-excluirse temporalmente, y recursos informativos sobre los riesgos del juego. Recomendamos no gastar más de lo que puedas permitirte perder."
      },
      {
        q: "Soy menor de 18 años, ¿puedo usar la plataforma?",
        a: "No. SkinMarket ES es una plataforma exclusiva para mayores de 18 años. Verificamos la edad de nuestros usuarios y nos reservamos el derecho de solicitar documentación adicional para confirmar la edad. Las cuentas de menores serán suspendidas permanentemente."
      },
      {
        q: "¿Ofrecen ayuda para problemas de adicción al juego?",
        a: "Sí. Si sientes que estás desarrollando un problema con el juego, te recomendamos contactar con organizaciones especializadas como Jugar Bien (España) o Gambling Therapy (internacional). También puedes activar límites en tu cuenta o solicitar una suspensión temporal contactando con nuestro soporte."
      }
    ]
  }
];

function FAQItem({ question, answer, isOpen, toggle }) {
  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      padding: '0'
    }}>
      <button
        onClick={toggle}
        style={{
          width: '100%',
          padding: '18px 15px',
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '1rem',
          fontWeight: '600',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ flex: 1 }}>{question}</span>
        <span style={{
          color: '#f5ac3b',
          fontSize: '1.2rem',
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          marginLeft: '15px',
          flexShrink: 0,
        }}>+</span>
      </button>
      <div style={{
        maxHeight: isOpen ? '500px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.4s ease, padding 0.3s ease',
        padding: isOpen ? '0 15px 18px 15px' : '0 15px',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.6)',
          margin: 0,
          lineHeight: 1.7,
          fontSize: '0.9rem',
        }}>
          {answer}
        </p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (catIndex, qIndex) => {
    const key = `${catIndex}_${qIndex}`;
    setOpenIndex(openIndex === key ? null : key);
  };

  return (
    <div style={{
      padding: '80px 20px',
      maxWidth: '900px',
      margin: '0 auto',
      color: 'white',
      fontFamily: 'Inter, sans-serif',
      lineHeight: '1.6',
    }}>
      <h1 style={headingStyle}>Preguntas Frecuentes (FAQ)</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '30px' }}>
        <strong>Última actualización: 26 de febrero de 2026</strong>
      </p>

      {/* +18 Warning Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 172, 59, 0.1), rgba(245, 172, 59, 0.05))',
        border: '1px solid rgba(245, 172, 59, 0.2)',
        borderRadius: '20px',
        padding: '20px 25px',
        marginBottom: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap',
      }}>
        <span style={{
          background: '#f5ac3b',
          color: 'black',
          fontWeight: '900',
          fontSize: '1.5rem',
          padding: '5px 12px',
          borderRadius: '10px',
          lineHeight: 1,
          flexShrink: 0,
        }}>+18</span>
        <div>
          <strong style={{ color: '#f5ac3b' }}>Juego Responsable</strong>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
            Esta plataforma está destinada únicamente a mayores de 18 años. Juega con responsabilidad.
            Las skins obtenidas no tienen valor monetario real fuera de la plataforma.
          </p>
        </div>
      </div>

      {/* Disclaimer Banner */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '15px 20px',
        marginBottom: '30px',
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.4)',
      }}>
        ◆ SkinMarket ES no está afiliado con Valve Corporation, Steam, o cualquiera de sus subsidiarias.
        Todas las marcas comerciales y derechos de autor son propiedad de sus respectivos dueños.
      </div>

      {/* FAQ Categories */}
      {faqData.map((category, catIndex) => (
        <section key={category.category} style={sectionStyle}>
          <h2 style={subheadingStyle}>
            {category.icon} {category.category}
          </h2>
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            {category.questions.map((item, qIndex) => (
              <FAQItem
                key={qIndex}
                question={item.q}
                answer={item.a}
                isOpen={openIndex === `${catIndex}_${qIndex}`}
                toggle={() => toggleFAQ(catIndex, qIndex)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Footer Contact Section */}
      <section style={{
        ...sectionStyle,
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(245, 172, 59, 0.05), transparent)',
        borderColor: 'rgba(245, 172, 59, 0.1)',
      }}>
        <h2 style={{
          ...subheadingStyle,
          textAlign: 'center',
        }}>
          ◆ ¿No encuentras lo que buscas?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '10px' }}>
          Si tienes alguna pregunta adicional, no dudes en contactarnos.
        </p>
        <p style={{ color: '#f5ac3b', fontWeight: '600' }}>
          soporte@skinmarket.es
        </p>
      </section>
    </div>
  );
}

