/**
 * Middlewares de seguridad.
 *
 * verificarToken: revisa que la petición traiga un JWT válido en el
 *   encabezado  Authorization: Bearer <token>
 *   Si es válido, deja los datos del usuario en req.usuario.
 *
 * permitirRoles: se usa después de verificarToken para limitar una ruta
 *   a ciertos roles. Ej: permitirRoles('admin')
 */
const jwt = require('jsonwebtoken');
const { ErrorApi } = require('../utils/respuesta');
const UsuarioModelo = require('../models/UsuarioModelo');

async function verificarToken(req, res, next) {
  try {
    const encabezado = req.headers.authorization || '';
    const [tipo, token] = encabezado.split(' ');

    if (tipo !== 'Bearer' || !token) {
      throw new ErrorApi(401, 'Debes iniciar sesión. Falta el token de acceso');
    }

    let datosToken;
    try {
      datosToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      const mensaje = error.name === 'TokenExpiredError'
        ? 'Tu sesión expiró, vuelve a iniciar sesión'
        : 'Token inválido';
      throw new ErrorApi(401, mensaje);
    }

    // Consultamos el usuario otra vez por si lo desactivaron o le
    // cambiaron el rol después de que se generó el token.
    const usuario = await UsuarioModelo.buscarPorId(datosToken.id);
    if (!usuario || !usuario.activo) {
      throw new ErrorApi(401, 'El usuario no existe o está desactivado');
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    next(error);
  }
}

function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return next(new ErrorApi(403, 'No tienes permisos para realizar esta acción'));
    }
    return next();
  };
}

module.exports = { verificarToken, permitirRoles };
