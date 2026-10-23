/**
 * Rutas de un impacto específico  ->  /api/impactos/:id
 */
const { Router } = require('express');
const envolverAsync = require('../middlewares/envolverAsync');
const { verificarToken, permitirRoles } = require('../middlewares/autenticacion');
const impactoController = require('../controllers/impactoController');

const router = Router();
const soloEditores = permitirRoles('admin', 'gestor');

router.use(verificarToken);

router.get('/:id', envolverAsync(impactoController.obtenerImpacto));
router.put('/:id', soloEditores, envolverAsync(impactoController.actualizarImpacto));
router.delete('/:id', soloEditores, envolverAsync(impactoController.eliminarImpacto));

module.exports = router;
