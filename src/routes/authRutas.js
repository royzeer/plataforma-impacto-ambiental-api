/**
 * Rutas de autenticación  ->  /api/auth
 */
const { Router } = require('express');
const envolverAsync = require('../middlewares/envolverAsync');
const { verificarToken } = require('../middlewares/autenticacion');
const authController = require('../controllers/authController');

const router = Router();

router.post('/registro', envolverAsync(authController.registrar));
router.post('/login', envolverAsync(authController.iniciarSesion));
router.get('/perfil', verificarToken, envolverAsync(authController.obtenerPerfil));

module.exports = router;
