/**
 * Controlador de usuarios (administración de cuentas).
 */
const bcrypt = require('bcryptjs');
const UsuarioModelo = require('../models/UsuarioModelo');
const { responderExito, ErrorApi } = require('../utils/respuesta');
const { validarOFallar, obtenerIdValido, limpiarTexto } = require('../utils/validaciones');
const { obtenerPaginacion, construirMetaPaginacion } = require('../utils/paginacion');
const { reglasActualizarUsuario, ROLES } = require('../validators/reglas');
const { RONDAS_BCRYPT } = require('./authController');

async function buscarUsuarioOFallar(id) {
  const usuario = await UsuarioModelo.buscarPorId(id);
  if (!usuario) throw new ErrorApi(404, `No existe un usuario con id ${id}`);
  return usuario;
}

/** GET /api/usuarios  (solo admin) */
async function listarUsuarios(req, res) {
  const { pagina, limite, offset } = obtenerPaginacion(req.query);
  const { rol, buscar } = req.query;

  if (rol && !ROLES.includes(rol)) {
    throw new ErrorApi(400, `El filtro rol solo acepta: ${ROLES.join(', ')}`);
  }

  let activo;
  if (req.query.activo === 'true') activo = true;
  if (req.query.activo === 'false') activo = false;

  const { usuarios, total } = await UsuarioModelo.listar({ rol, activo, buscar, limite, offset });

  return responderExito(res, 200, 'Listado de usuarios', usuarios, {
    paginacion: construirMetaPaginacion(total, pagina, limite)
  });
}

/** GET /api/usuarios/:id  (admin o el mismo usuario) */
async function obtenerUsuario(req, res) {
  const id = obtenerIdValido(req.params.id);
  if (req.usuario.rol !== 'admin' && req.usuario.id !== id) {
    throw new ErrorApi(403, 'Solo puedes consultar tu propia cuenta');
  }
  const usuario = await buscarUsuarioOFallar(id);
  return responderExito(res, 200, 'Usuario encontrado', usuario);
}

/** PUT /api/usuarios/:id  (admin o el mismo usuario) - nombre, correo, password */
async function actualizarUsuario(req, res) {
  const id = obtenerIdValido(req.params.id);
  if (req.usuario.rol !== 'admin' && req.usuario.id !== id) {
    throw new ErrorApi(403, 'Solo puedes modificar tu propia cuenta');
  }
  await buscarUsuarioOFallar(id);

  validarOFallar(req.body, reglasActualizarUsuario, true);

  const cambios = {};
  if (req.body.nombre !== undefined) cambios.nombre = limpiarTexto(req.body.nombre);
  if (req.body.correo !== undefined) {
    cambios.correo = limpiarTexto(req.body.correo).toLowerCase();
    if (await UsuarioModelo.existeCorreo(cambios.correo, id)) {
      throw new ErrorApi(409, 'Ese correo ya lo está usando otra cuenta');
    }
  }
  if (req.body.password !== undefined) {
    cambios.passwordHash = await bcrypt.hash(req.body.password, RONDAS_BCRYPT);
  }

  if (Object.keys(cambios).length === 0) {
    throw new ErrorApi(400, 'No enviaste ningún campo para actualizar (nombre, correo o password)');
  }

  const usuario = await UsuarioModelo.actualizar(id, cambios);
  return responderExito(res, 200, 'Usuario actualizado correctamente', usuario);
}

/** PATCH /api/usuarios/:id/rol  (solo admin) */
async function cambiarRol(req, res) {
  const id = obtenerIdValido(req.params.id);
  const { rol } = req.body || {};

  if (!ROLES.includes(rol)) {
    throw new ErrorApi(400, `El rol debe ser uno de: ${ROLES.join(', ')}`);
  }
  if (id === req.usuario.id) {
    throw new ErrorApi(400, 'No puedes cambiar tu propio rol');
  }
  await buscarUsuarioOFallar(id);

  const usuario = await UsuarioModelo.actualizar(id, { rol });
  return responderExito(res, 200, `Rol actualizado a ${rol}`, usuario);
}

/**
 * DELETE /api/usuarios/:id  (solo admin)
 * No borramos el registro: lo DESACTIVAMOS. Si lo borráramos se perdería
 * el historial de quién fue responsable de cada proyecto.
 */
async function desactivarUsuario(req, res) {
  const id = obtenerIdValido(req.params.id);
  if (id === req.usuario.id) {
    throw new ErrorApi(400, 'No puedes desactivar tu propia cuenta');
  }
  const existente = await buscarUsuarioOFallar(id);
  if (!existente.activo) {
    throw new ErrorApi(400, 'El usuario ya estaba desactivado');
  }

  const usuario = await UsuarioModelo.actualizar(id, { activo: 0 });
  return responderExito(res, 200, 'Usuario desactivado correctamente', usuario);
}

/** PATCH /api/usuarios/:id/activar  (solo admin) - por si se desactivó por error */
async function activarUsuario(req, res) {
  const id = obtenerIdValido(req.params.id);
  await buscarUsuarioOFallar(id);
  const usuario = await UsuarioModelo.actualizar(id, { activo: 1 });
  return responderExito(res, 200, 'Usuario activado correctamente', usuario);
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  cambiarRol,
  desactivarUsuario,
  activarUsuario
};
