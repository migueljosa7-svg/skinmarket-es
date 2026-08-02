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
    wear VARCHAR(50),
    weapon VARCHAR(100),
    skin_name VARCHAR(100),
    icon_url TEXT,
    -- Provably Fair fields
    provably_fair_hash VARCHAR(64),
    server_seed VARCHAR(64),
    client_seed VARCHAR(32),
    nonce BIGINT,
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

-- Add user_item_id column for unique item tracking
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS user_item_id VARCHAR(100) UNIQUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventario_usuario ON inventario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_inventario_status ON inventario(status);
CREATE INDEX IF NOT EXISTS idx_inventario_user_item_id ON inventario(user_item_id);
CREATE INDEX IF NOT EXISTS idx_inventario_provably_fair ON inventario(provably_fair_hash);
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario ON transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones(tipo);
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_steam ON usuarios(steam_id);

-- Payment pending transactions table
CREATE TABLE IF NOT EXISTS pagos_pendientes (
    pago_id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    charge_id VARCHAR(100) UNIQUE NOT NULL,
    metodo VARCHAR(50) NOT NULL,
    monto DECIMAL(15, 2) NOT NULL,
    moneda VARCHAR(20),
    direccion TEXT,
    estado VARCHAR(20) DEFAULT 'pending',
    detalles JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmado_en TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_pagos_pendientes_usuario ON pagos_pendientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagos_pendientes_charge_id ON pagos_pendientes(charge_id);
CREATE INDEX IF NOT EXISTS idx_pagos_pendientes_estado ON pagos_pendientes(estado);

-- Gift codes table
CREATE TABLE IF NOT EXISTS gift_codes (
    code VARCHAR(50) PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES usuarios(usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_gift_codes_active ON gift_codes(active);
CREATE INDEX IF NOT EXISTS idx_gift_codes_expires ON gift_codes(expires_at);

