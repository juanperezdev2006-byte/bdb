const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const {
  validarClaveSegura,
  validarTarjetaDebito,
  manejarErrores
} = require('../middleware/validators');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-esto-en-produccion-1234567890';
const SALT_ROUNDS = 10;

/* ───────── REGISTRO (para crear usuarios de prueba) ───────── */
router.post('/registro', async (req, res) => {
  try {
    const {
      tipoDocumento,
      numeroDocumento,
      claveSegura,
      claveTarjeta,
      ultimos4Digitos,
      nombre
    } = req.body;

    if (!tipoDocumento || !numeroDocumento || !claveSegura) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios'
      });
    }

    // Verificar si ya existe
    const existente = db.prepare('SELECT id FROM usuarios WHERE numero_documento = ?')
      .get(numeroDocumento);
    if (existente) {
      return res.status(409).json({
        success: false,
        message: 'El usuario ya está registrado'
      });
    }

    // Hashear las claves
    const claveSeguraHash = await bcrypt.hash(claveSegura, SALT_ROUNDS);
    const claveTarjetaHash = claveTarjeta
      ? await bcrypt.hash(claveTarjeta, SALT_ROUNDS)
      : null;

    const stmt = db.prepare(`
      INSERT INTO usuarios
        (tipo_documento, numero_documento, clave_segura_hash, clave_tarjeta_hash, ultimos_4_digitos, nombre)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      tipoDocumento,
      numeroDocumento,
      claveSeguraHash,
      claveTarjetaHash,
      ultimos4Digitos || null,
      nombre || null
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      usuarioId: info.lastInsertRowid
    });

  } catch (err) {
    console.error('Error registro:', err);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

/* ───────── LOGIN ───────── */
router.post('/login', async (req, res) => {
  const { tipoIngreso } = req.body;

  // Despachar a la validación adecuada
  if (tipoIngreso === 'CLAVE_SEGURA') {
    return loginClaveSegura(req, res);
  } else if (tipoIngreso === 'TARJETA_DEBITO') {
    return loginTarjetaDebito(req, res);
  } else {
    return res.status(400).json({
      success: false,
      message: 'tipoIngreso inválido'
    });
  }
});

/* ───────── HANDLER: Clave Segura ───────── */
async function loginClaveSegura(req, res) {
  // Validación manual con express-validator
  await Promise.all(validarClaveSegura.map(v => v.run(req)));
  const errores = require('express-validator').validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errores: errores.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  }

  const { tipoDocumento, numeroDocumento, claveSegura } = req.body;
  const ip = req.ip;
  const userAgent = req.get('user-agent');

  const usuario = db.prepare(`
    SELECT id, nombre, clave_segura_hash
    FROM usuarios
    WHERE tipo_documento = ? AND numero_documento = ?
  `).get(tipoDocumento, numeroDocumento);

  // Registrar intento
  const registrarIntento = (exitoso) => {
    db.prepare(`
      INSERT INTO intentos_login (tipo_documento, numero_documento, tipo_ingreso, exitoso, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tipoDocumento, numeroDocumento, 'CLAVE_SEGURA', exitoso ? 1 : 0, ip, userAgent);
  };

  if (!usuario || !usuario.clave_segura_hash) {
    registrarIntento(false);
    return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }

  const ok = await bcrypt.compare(claveSegura, usuario.clave_segura_hash);
  registrarIntento(ok);

  if (!ok) {
    return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { id: usuario.id, doc: numeroDocumento },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({
    success: true,
    message: 'Login exitoso',
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre || 'Cliente' }
  });
}

/* ───────── HANDLER: Tarjeta Débito ───────── */
async function loginTarjetaDebito(req, res) {
  await Promise.all(validarTarjetaDebito.map(v => v.run(req)));
  const errores = require('express-validator').validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errores: errores.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  }

  const { tipoDocumento, numeroDocumento, claveTarjeta, ultimos4Digitos } = req.body;
  const ip = req.ip;
  const userAgent = req.get('user-agent');

  const usuario = db.prepare(`
    SELECT id, nombre, clave_tarjeta_hash, ultimos_4_digitos
    FROM usuarios
    WHERE tipo_documento = ? AND numero_documento = ?
  `).get(tipoDocumento, numeroDocumento);

  const registrarIntento = (exitoso) => {
    db.prepare(`
      INSERT INTO intentos_login (tipo_documento, numero_documento, tipo_ingreso, exitoso, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tipoDocumento, numeroDocumento, 'TARJETA_DEBITO', exitoso ? 1 : 0, ip, userAgent);
  };

  if (!usuario || !usuario.clave_tarjeta_hash) {
    registrarIntento(false);
    return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }

  if (usuario.ultimos_4_digitos !== ultimos4Digitos) {
    registrarIntento(false);
    return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }

  const ok = await bcrypt.compare(claveTarjeta, usuario.clave_tarjeta_hash);
  registrarIntento(ok);

  if (!ok) {
    return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { id: usuario.id, doc: numeroDocumento },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({
    success: true,
    message: 'Login exitoso',
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre || 'Cliente' }
  });
}

/* ───────── VER INTENTOS (debug, quitar en producción) ───────── */
router.get('/intentos', (req, res) => {
  const intentos = db.prepare(`
    SELECT * FROM intentos_login ORDER BY fecha DESC LIMIT 50
  `).all();
  res.json(intentos);
});

module.exports = router;