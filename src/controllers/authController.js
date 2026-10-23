/**
 * Controlador de autenticación.
 *
 * Esta parte la reutilizamos de la evidencia AA5-EV01 (servicio de registro
 * e inicio de sesión) y la adaptamos al proyecto: ahora el login devuelve
 * un token JWT que el front guarda y envía en cada petición protegida.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsuarioModelo = require('../models/UsuarioModelo');
const { responderExito, ErrorApi } = require('../utils/respuesta');
const { validarOFallar, limpiarTexto } = require('../utils/validaciones');
const { reglasRegistro, reglasLogin } = require('../validators/reglas');

// 10 rondas de "sal" es el valor recomendado: seguro y no tan lento.
const RONDAS_BCRYPT = 10;

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

/** Revisa que la contraseña tenga al menos una letra y un número. */
function validarFortalezaPassword(password) {
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ErrorApi(400, 'Hay datos inválidos en la petición', [
      { campo: 'password', mensaje: 'La contraseña debe tener al menos una letra y un número' }
    ]);
  }
}

/**
 * POST /api/auth/registro
 * Crea un usuario nuevo y de una vez le devuelve su token.
 */
async function registrar(req, res) {
  validarOFallar(req.body, reglasRegistro);
  validarFortalezaPassword(req.body.password);

  const nombre = limpiarTexto(req.body.nombre);
  const correo = limpiarTexto(req.body.correo).toLowerCase();
  const rol = req.body.rol || 'consultor';

  if (await UsuarioModelo.existeCorreo(correo)) {
    throw new ErrorApi(409, 'Ya hay una cuenta registrada con ese correo');
  }

  // Nunca guardamos la contraseña en texto plano, solo su hash
  const passwordHash = await bcrypt.hash(req.body.password, RONDAS_BCRYPT);
  const usuario = await UsuarioModelo.crear({ nombre, correo, passwordHash, rol });

  return responderExito(res, 201, 'Usuario registrado correctamente', {
    usuario,
    token: generarToken(usuario)
  });
}

/**
 * POST /api/auth/login
 * Si el correo y la contraseña coinciden -> "Autenticación satisfactoria".
 * Si no -> 401 "Error en la autenticación".
 */
async function iniciarSesion(req, res) {
  validarOFallar(req.body, reglasLogin);

  const correo = limpiarTexto(req.body.correo).toLowerCase();
  const usuario = await UsuarioModelo.buscarPorCorreoConPassword(correo);

  // Usamos el mismo mensaje si el correo no existe o si la contraseña está
  // mal, para no darle pistas a alguien que esté intentando adivinar cuentas.
  const passwordCorrecta = usuario
    ? await bcrypt.compare(req.body.password, usuario.passwordHash)
    : false;

  if (!usuario || !passwordCorrecta) {
    throw new ErrorApi(401, 'Error en la autenticación: correo o contraseña incorrectos');
  }
  if (!usuario.activo) {
    throw new ErrorApi(403, 'Tu cuenta está desactivada. Comunícate con el administrador');
  }

  const { passwordHash, ...usuarioSinPassword } = usuario;

  return responderExito(res, 200, 'Autenticación satisfactoria', {
    usuario: usuarioSinPassword,
    token: generarToken(usuario)
  });
}

/**
 * GET /api/auth/perfil
 * Devuelve los datos del usuario dueño del token (lo usa el Navbar).
 */
async function obtenerPerfil(req, res) {
  return responderExito(res, 200, 'Perfil del usuario autenticado', req.usuario);
}

module.exports = { registrar, iniciarSesion, obtenerPerfil, RONDAS_BCRYPT };
