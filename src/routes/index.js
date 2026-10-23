/**
 * Junta todas las rutas de la API bajo el prefijo /api
 */
const { Router } = require('express');
const envolverAsync = require('../middlewares/envolverAsync');
const { probarConexion } = require('../config/db');

const router = Router();

/**
 * GET /api/salud
 * Ruta pública para saber si la API y la base de datos están arriba.
 * La usamos mucho mientras desarrollábamos para no adivinar si el error
 * era del código o de que MySQL no estaba prendido en XAMPP.
 */
router.get('/salud', envolverAsync(async (req, res) => {
  let baseDatos = 'desconectada';
  try {
    if (await probarConexion()) baseDatos = 'conectada';
  } catch (error) {
    baseDatos = 'desconectada';
  }
  res.status(baseDatos === 'conectada' ? 200 : 503).json({
    ok: baseDatos === 'conectada',
    mensaje: 'API Plataforma de Gestión de Proyectos de Impacto Ambiental',
    version: '1.0.0',
    baseDatos,
    fecha: new Date().toISOString()
  });
}));

router.use('/auth', require('./authRutas'));
router.use('/usuarios', require('./usuarioRutas'));
router.use('/proyectos', require('./proyectoRutas'));
router.use('/impactos', require('./impactoRutas'));
router.use('/actividades', require('./actividadRutas'));
router.use('/monitoreos', require('./monitoreoRutas'));
router.use('/reportes', require('./reporteRutas'));

module.exports = router;
