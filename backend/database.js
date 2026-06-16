const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'banca.db'));

// Habilitar foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_documento TEXT NOT NULL,
    numero_documento TEXT NOT NULL UNIQUE,
    clave_segura_hash TEXT,
    clave_tarjeta_hash TEXT,
    ultimos_4_digitos TEXT,
    nombre TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS intentos_login (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_documento TEXT NOT NULL,
    numero_documento TEXT NOT NULL,
    tipo_ingreso TEXT NOT NULL,
    exitoso INTEGER NOT NULL DEFAULT 0,
    ip TEXT,
    user_agent TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_usuarios_doc ON usuarios(numero_documento);
  CREATE INDEX IF NOT EXISTS idx_intentos_fecha ON intentos_login(fecha);
`);

console.log('✅ Base de datos SQLite lista');

module.exports = db;