/**
 * Rutas de reportes  ->  /api/reportes
 */
const { Router } = require('express');
const envolverAsync = require('../middlewares/envolverAsync');
const { verificarToken } = require('../middlewares/autenticacion');
const reporteController = require('../controllers/reporteController');

const router = Router();

router.use(verificarToken);

router.get('/dashboard', envolverAsync(reporteController.obtenerDashboard));
router.get('/proyectos/:id', envolverAsync(reporteController.obtenerResumenProyecto));

module.exports = router;
