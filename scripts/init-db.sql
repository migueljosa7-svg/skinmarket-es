-- ============================================================
-- SKINMARKET ES - Database Initialization Script
-- ============================================================
-- This runs automatically when PostgreSQL container starts
-- for the first time (docker-entrypoint-initdb.d).
-- Only executes if no data exists yet.

CREATE TABLE IF NOT EXISTS usuarios (
    usuario_id SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    saldo DECIMAL(15, 2) DEFAULT 0.00 CHECK (saldo >= 0),
    link_intercambio TEXT,
    steam_id VARCHAR(50),
    trade_token VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user',
    nivel INTEGER DEFAULT 0,
    experiencia INTEGER DEFAULT 0,
    ultimo_reclamo_diario TIMESTAMP WITH TIME ZONE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventario (
    item_id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image TEXT,
    rarity TEXT,
    marketable BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'on_site',
    market_hash_name VARCHAR(255),
    assetid VARCHAR(50),
    fecha_obtencion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs_auditoria (
    log_id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    detalles TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transacciones (
    transaccion_id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    monto DECIMAL(15, 2) NOT NULL,
    metodo VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completado',
    detalles TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuracion (
    clave VARCHAR(50) PRIMARY KEY,
    valor JSONB NOT NULL,
    ultima_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default probabilities
INSERT INTO configuracion (clave, valor) 
VALUES ('probabilidades', '{"covert": 0.5, "classified": 2.0, "restricted": 15.0, "mil_spec": 82.5}')
ON CONFLICT (clave) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventario_usuario ON inventario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_inventario_status ON inventario(status);
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario ON transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_steam ON usuarios(steam_id);

