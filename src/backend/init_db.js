import db from './db.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initDb = async () => {
  // Retry logic: intenta conectar hasta 3 veces con backoff
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Test connection first
      await db.query('SELECT 1');
      // console.log(`[DB] Conexión exitosa en intento ${attempt}`);
      break;
    } catch (err) {
      // console.error(`[DB] Intento ${attempt}/${maxRetries} falló: ${err.message}`);
      if (attempt === maxRetries) {
        // console.error('[DB] No se pudo conectar después de varios intentos.');
        process.exit(1);
      }
      const delay = attempt * 2000;
      // console.log(`[DB] Reintentando en ${delay / 1000}s...`);
      await sleep(delay);
    }
  }

  const checkTableQuery = `
    CREATE TABLE IF NOT EXISTS usuarios (
        usuario_id SERIAL PRIMARY KEY,
        nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        saldo DECIMAL(15, 2) DEFAULT 0.00 CHECK (saldo >= 0),
        link_intercambio TEXT,
        steam_id VARCHAR(50),
        nivel INTEGER DEFAULT 0,
        experiencia INTEGER DEFAULT 0,
        fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Asegurar que las columnas existan si la tabla ya fue creada
  const alterTableQuery = `
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS link_intercambio TEXT;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS steam_id VARCHAR(50);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trade_token VARCHAR(20);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nivel INTEGER DEFAULT 0;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS experiencia INTEGER DEFAULT 0;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_reclamo_diario TIMESTAMP WITH TIME ZONE;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80';
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS wear VARCHAR(50) DEFAULT 'Field-Tested';
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS skin_name VARCHAR(255);
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS weapon VARCHAR(255);
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS market_hash_name VARCHAR(255);
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS assetid VARCHAR(50);
    ALTER TABLE transacciones ALTER COLUMN monto SET DEFAULT 0.00;
  `;

  const checkInventoryTableQuery = `
    CREATE TABLE IF NOT EXISTS inventario (
        item_id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(usuario_id),
        name TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        image TEXT,
        rarity TEXT,
        marketable BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'on_site',
        fecha_obtencion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const auditLogsQuery = `
    CREATE TABLE IF NOT EXISTS logs_auditoria (
        log_id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(usuario_id),
        accion VARCHAR(100) NOT NULL,
        detalles TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const transaccionesQuery = `
    CREATE TABLE IF NOT EXISTS transacciones (
        transaccion_id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(usuario_id),
        tipo VARCHAR(20) NOT NULL, -- 'deposito', 'retiro', 'venta', 'compra', 'premio'
        monto DECIMAL(15, 2) NOT NULL,
        metodo VARCHAR(50),
        status VARCHAR(20) DEFAULT 'completado',
        detalles TEXT,
        fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const settingsQuery = `
    CREATE TABLE IF NOT EXISTS configuracion (
        clave VARCHAR(50) PRIMARY KEY,
        valor JSONB NOT NULL,
        ultima_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const pagosPendientesQuery = `
    CREATE TABLE IF NOT EXISTS pagos_pendientes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(usuario_id),
        charge_id VARCHAR(100) UNIQUE NOT NULL,
        metodo VARCHAR(50) NOT NULL,
        monto DECIMAL(15, 2) NOT NULL,
        moneda VARCHAR(20),
        direccion TEXT,
        estado VARCHAR(20) DEFAULT 'pending',
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        confirmado_en TIMESTAMP WITH TIME ZONE
    );
  `;

  const seedSettingsQuery = `
    INSERT INTO configuracion (clave, valor) 
    VALUES ('probabilidades', '{"covert": 0.5, "classified": 2.0, "restricted": 15.0, "mil_spec": 82.5}')
    ON CONFLICT (clave) DO NOTHING;
  `;

  try {
    await db.query(checkTableQuery);
    await db.query(alterTableQuery);
    await db.query(checkInventoryTableQuery);
    await db.query(auditLogsQuery);
    await db.query(transaccionesQuery);
    await db.query(pagosPendientesQuery);
    await db.query(settingsQuery);
    await db.query(seedSettingsQuery);
    // console.log("Tablas 'usuarios', 'inventario', 'logs_auditoria', 'transacciones', 'pagos_pendientes' y 'configuracion' verificadas/creadas correctamente.");

    process.exit(0);
  } catch (err) {
    // console.error("Error al inicializar la base de datos:", err);
    process.exit(1);
  }
};

initDb();

