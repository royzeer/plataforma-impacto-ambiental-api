/**
 * Rutas de una actividad específica  ->  /api/actividades/:id
 */
const { Router } = require('express');
const envolverAsync = require('../middlewares/envolverAsync');
const { verificarToken, permitirRoles } = require('../middlewares/autenticacion');
const actividadController = require('../controllers/actividadController');

const router = Router();
const soloEditores = permitirRoles('admin', 'gestor');

router.use(verificarToken);

router.get('/:id', envolverAsync(actividadController.obtenerActividad));
router.put('/:id', soloEditores, envolverAsync(actividadController.actualizarActividad));
router.patch('/:id/estado', soloEditores, envolverAsync(actividadController.cambiarEstadoActividad));
router.delete('/:id', soloEditores, envolverAsync(actividadController.eliminarActividad));

module.exports = router;
