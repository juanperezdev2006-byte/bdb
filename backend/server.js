const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares ───
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.set('trust proxy', 1);

// ─── Rate limiting para login ───
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,                  // 10 intentos por IP
  message: {
    success: false,
    message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth/login', loginLimiter);

// ─── Rutas ───
app.use('/api/auth', authRoutes);

// ─── Healthcheck ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ───
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ─── Error handler global ───
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📍 Endpoints:`);
  console.log(`   POST /api/auth/registro`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/auth/intentos`);
  console.log(`   GET  /api/health`);
});