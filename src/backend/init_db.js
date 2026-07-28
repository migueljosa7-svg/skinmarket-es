import db from './db.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initDb = async () => {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.query('SELECT 1');
      break;
    } catch (err) {
      if (attempt === maxRetries) {
        process.exit(1);
      }
      const delay = attempt * 2000;
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

  const alterTableQuery = `
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS link_intercambio TEXT;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS steam_id VARCHAR(50);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trade_token VARCHAR(20);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nivel INTEGER DEFAULT 0;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS experiencia INTEGER DEFAULT 0;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_reclamo_diario TIMESTAMP WITH TIME ZONE;
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80';
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS total_depositado DECIMAL(15, 2) DEFAULT 0.00;
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS wear VARCHAR(50) DEFAULT 'Field-Tested';
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS skin_name VARCHAR(255);
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS weapon VARCHAR(255);
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS market_hash_name VARCHAR(255);
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS assetid VARCHAR(50);
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS icon_url TEXT;
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
        wear VARCHAR(50) DEFAULT 'Field-Tested',
        weapon VARCHAR(255),
        skin_name VARCHAR(255),
        market_hash_name VARCHAR(255),
        assetid VARCHAR(50),
        icon_url TEXT,
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
        tipo VARCHAR(20) NOT NULL,
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

  const cajasDiariasQuery = `
    CREATE TABLE IF NOT EXISTS cajas_diarias (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(usuario_id) UNIQUE,
        caja_id VARCHAR(50) NOT NULL,
        ultima_apertura TIMESTAMP WITH TIME ZONE,
        nivel INTEGER DEFAULT 1,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const seedSettingsQuery = `
    INSERT INTO configuracion (clave, valor) 
    VALUES ('probabilidades', '{"covert": 0.5, "classified": 2.0, "restricted": 15.0, "mil_spec": 82.5}')
    ON CONFLICT (clave) DO NOTHING;
  `;

  const seedLevelConfig = `
    INSERT INTO configuracion (clave, valor) 
    VALUES ('niveles', '[
      {"level": 1, "minDeposit": 0, "dailyCaseId": "eco-1", "caseLabel": "Caja Eco", "reward": 0.15},
      {"level": 2, "minDeposit": 10, "dailyCaseId": "eco-1", "caseLabel": "Caja Eco", "reward": 0.35},
      {"level": 3, "minDeposit": 50, "dailyCaseId": "eco-1", "caseLabel": "Caja Eco", "reward": 0.65},
      {"level": 4, "minDeposit": 100, "dailyCaseId": "mid-1", "caseLabel": "Caja Mid", "reward": 1.00},
      {"level": 5, "minDeposit": 250, "dailyCaseId": "mid-1", "caseLabel": "Caja Mid", "reward": 2.00},
      {"level": 6, "minDeposit": 500, "dailyCaseId": "mid-1", "caseLabel": "Caja Mid", "reward": 3.50},
      {"level": 7, "minDeposit": 1000, "dailyCaseId": "premium-1", "caseLabel": "Caja Premium", "reward": 5.00},
      {"level": 8, "minDeposit": 2500, "dailyCaseId": "premium-1", "caseLabel": "Caja Premium", "reward": 8.00},
      {"level": 9, "minDeposit": 5000, "dailyCaseId": "premium-1", "caseLabel": "Caja Premium", "reward": 12.00},
      {"level": 10, "minDeposit": 10000, "dailyCaseId": "premium-1", "caseLabel": "Caja Legendaria", "reward": 20.00}
    ]')
    ON CONFLICT (clave) DO NOTHING;
  `;

  try {
    await db.query(checkTableQuery);
    await db.query(alterTableQuery);
    await db.query(checkInventoryTableQuery);
    await db.query(auditLogsQuery);
    await db.query(transaccionesQuery);
    await db.query(pagosPendientesQuery);
    await db.query(cajasDiariasQuery);
    await db.query(settingsQuery);
    await db.query(seedSettingsQuery);
    await db.query(seedLevelConfig);
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
};

initDb();