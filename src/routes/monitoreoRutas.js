/**
 * Rutas de un monitoreo específico  ->  /api/monitoreos/:id
 */
const { Router } = require('express');
const envolverAsync = require('../middlewares/envolverAsync');
const { verificarToken, permitirRoles } = require('../middlewares/autenticacion');
const monitoreoController = require('../controllers/monitoreoController');

const router = Router();
const soloEditores = permitirRoles('admin', 'gestor');

router.use(verificarToken);

router.get('/:id', envolverAsync(monitoreoController.obtenerMonitoreo));
router.put('/:id', soloEditores, envolverAsync(monitoreoController.actualizarMonitoreo));
router.delete('/:id', soloEditores, envolverAsync(monitoreoController.eliminarMonitoreo));

module.exports = router;
