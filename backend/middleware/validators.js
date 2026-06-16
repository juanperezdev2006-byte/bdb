const { body, validationResult } = require('express-validator');

// Validadores para Clave Segura
const validarClaveSegura = [
  body('tipoIngreso').equals('CLAVE_SEGURA'),
  body('tipoDocumento').isIn(['CC', 'CE', 'NIT', 'PAS']).withMessage('Tipo de documento inválido'),
  body('numeroDocumento')
    .trim()
    .isLength({ min: 5, max: 20 }).withMessage('Número de documento inválido')
    .matches(/^[0-9A-Za-z-]+$/).withMessage('Caracteres no permitidos'),
  body('claveSegura')
    .isLength({ min: 4, max: 50 }).withMessage('Clave inválida')
];

// Validadores para Tarjeta Débito
const validarTarjetaDebito = [
  body('tipoIngreso').equals('TARJETA_DEBITO'),
  body('tipoDocumento').isIn(['CC', 'CE', 'NIT', 'PAS']).withMessage('Tipo de documento inválido'),
  body('numeroDocumento')
    .trim()
    .isLength({ min: 5, max: 20 }).withMessage('Número de documento inválido')
    .matches(/^[0-9A-Za-z-]+$/).withMessage('Caracteres no permitidos'),
  body('claveTarjeta')
    .isLength({ min: 4, max: 10 }).withMessage('Clave de tarjeta inválida'),
  body('ultimos4Digitos')
    .isLength({ min: 4, max: 4 }).withMessage('Deben ser 4 dígitos')
    .isNumeric().withMessage('Solo números')
];

// Middleware para retornar errores
const manejarErrores = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errores: errores.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  }
  next();
};

module.exports = { validarClaveSegura, validarTarjetaDebito, manejarErrores };