/**
 * Rutas de usuarios  ->  /api/usuarios
 * Todas requieren token. Algunas además requieren rol admin.
 */
const { Router } = require('express');
const envolverAsync = require('../middlewares/envolverAsync');
const { verificarToken, permitirRoles } = require('../middlewares/autenticacion');
const usuarioController = require('../controllers/usuarioController');

const router = Router();

router.use(verificarToken);

router.get('/', permitirRoles('admin'), envolverAsync(usuarioController.listarUsuarios));
router.get('/:id', envolverAsync(usuarioController.obtenerUsuario));
router.put('/:id', envolverAsync(usuarioController.actualizarUsuario));
router.patch('/:id/rol', permitirRoles('admin'), envolverAsync(usuarioController.cambiarRol));
router.patch('/:id/activar', permitirRoles('admin'), envolverAsync(usuarioController.activarUsuario));
router.delete('/:id', permitirRoles('admin'), envolverAsync(usuarioController.desactivarUsuario));

module.exports = router;
