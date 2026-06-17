import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cors } from 'hono/cors';

const app = new Hono();
const JWT_SECRET = 'cambia-esto-en-produccion';

app.use('*', cors());

app.get('/api/health', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as total FROM usuarios'
  ).first();

  return c.json({
    status: 'ok',
    usuarios: result?.total || 0,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/registro', async (c) => {
  const body = await c.req.json();

  const {
    tipoDocumento,
    numeroDocumento,
    claveSegura,
    claveTarjeta,
    ultimos4Digitos,
    nombre
  } = body;

  const existente = await c.env.DB.prepare(
    'SELECT id FROM usuarios WHERE numero_documento = ?'
  ).bind(numeroDocumento).first();

  if (existente) {
    return c.json({ success:false, message:'El usuario ya está registrado' }, 409);
  }

  const claveSeguraHash = await bcrypt.hash(claveSegura, 10);
  const claveTarjetaHash = claveTarjeta ? await bcrypt.hash(claveTarjeta, 10) : null;

  const result = await c.env.DB.prepare(`
    INSERT INTO usuarios
    (tipo_documento, numero_documento, clave_segura_hash, clave_tarjeta_hash, ultimos_4_digitos, nombre)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    tipoDocumento,
    numeroDocumento,
    claveSeguraHash,
    claveTarjetaHash,
    ultimos4Digitos || null,
    nombre || null
  ).run();

  return c.json({
    success: true,
    usuarioId: result.meta.last_row_id
  }, 201);
});

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json();
  const { tipoDocumento, numeroDocumento, claveSegura } = body;

  const usuario = await c.env.DB.prepare(`
    SELECT id, nombre, clave_segura_hash
    FROM usuarios
    WHERE tipo_documento = ? AND numero_documento = ?
  `).bind(tipoDocumento, numeroDocumento).first();

  if (!usuario?.clave_segura_hash) {
    return c.json({ success:false, message:'Credenciales incorrectas' }, 401);
  }

  const ok = await bcrypt.compare(claveSegura, usuario.clave_segura_hash);

  await c.env.DB.prepare(`
    INSERT INTO intentos_login
    (tipo_documento, numero_documento, tipo_ingreso, exitoso, ip, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    tipoDocumento,
    numeroDocumento,
    'CLAVE_SEGURA',
    ok ? 1 : 0,
    c.req.header('cf-connecting-ip') || '',
    c.req.header('user-agent') || ''
  ).run();

  if (!ok) {
    return c.json({ success:false, message:'Credenciales incorrectas' }, 401);
  }

  const token = jwt.sign(
    { id: usuario.id, doc: numeroDocumento },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return c.json({
    success:true,
    token,
    usuario:{ id: usuario.id, nombre: usuario.nombre || 'Cliente' }
  });
});

export default app;
