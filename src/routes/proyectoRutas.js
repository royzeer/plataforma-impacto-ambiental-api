/**
 * Rutas de proyectos  ->  /api/proyectos
 *
 * Aquí también van las rutas "anidadas" para listar y crear impactos,
 * actividades y monitoreos de un proyecto, porque esos recursos siempre
 * pertenecen a un proyecto:
 *    GET  /api/proyectos/5/impactos
 *    POST /api/proyectos/5/impactos
 */
const { Router } = require('express');
const envolverAsync = require('../middlewares/envolverAsync');
const { verificarToken, permitirRoles } = require('../middlewares/autenticacion');
const proyectoController = require('../controllers/proyectoController');
const impactoController = require('../controllers/impactoController');
const actividadController = require('../controllers/actividadController');
const monitoreoController = require('../controllers/monitoreoController');

const router = Router();

// Los consultores pueden ver todo, pero solo admin y gestor modifican
const soloEditores = permitirRoles('admin', 'gestor');

router.use(verificarToken);

// ---- CRUD de proyectos ----
router.get('/', envolverAsync(proyectoController.listarProyectos));
router.post('/', soloEditores, envolverAsync(proyectoController.crearProyecto));
router.get('/:id', envolverAsync(proyectoController.obtenerProyecto));
router.put('/:id', soloEditores, envolverAsync(proyectoController.actualizarProyecto));
router.patch('/:id/estado', soloEditores, envolverAsync(proyectoController.cambiarEstadoProyecto));
router.delete('/:id', soloEditores, envolverAsync(proyectoController.eliminarProyecto));

// ---- Recursos que pertenecen a un proyecto ----
router.get('/:proyectoId/impactos', envolverAsync(impactoController.listarImpactos));
router.post('/:proyectoId/impactos', soloEditores, envolverAsync(impactoController.crearImpacto));

router.get('/:proyectoId/actividades', envolverAsync(actividadController.listarActividades));
router.post('/:proyectoId/actividades', soloEditores, envolverAsync(actividadController.crearActividad));

router.get('/:proyectoId/monitoreos', envolverAsync(monitoreoController.listarMonitoreos));
router.post('/:proyectoId/monitoreos', soloEditores, envolverAsync(monitoreoController.crearMonitoreo));

module.exports = router;
