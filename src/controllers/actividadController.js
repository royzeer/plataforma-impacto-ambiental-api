/**
 * Controlador de actividades del plan de manejo ambiental.
 */
const ActividadModelo = require('../models/ActividadModelo');
const UsuarioModelo = require('../models/UsuarioModelo');
const { responderExito, ErrorApi } = require('../utils/respuesta');
const { validarOFallar, obtenerIdValido, limpiarTexto } = require('../utils/validaciones');
const { obtenerProyectoConPermiso } = require('../utils/permisos');
const { reglasActividad, ESTADOS_ACTIVIDAD } = require('../validators/reglas');

async function buscarActividadOFallar(id) {
  const actividad = await ActividadModelo.buscarPorId(id);
  if (!actividad) throw new ErrorApi(404, `No existe una actividad con id ${id}`);
  return actividad;
}

async function validarResponsableActividad(responsableId) {
  const usuario = await UsuarioModelo.buscarPorId(responsableId);
  if (!usuario || !usuario.activo) {
    throw new ErrorApi(400, 'El responsable de la actividad no existe o está desactivado');
  }
}

/** Una actividad no puede tener fecha límite antes de que arranque el proyecto. */
function validarFechaLimite(fechaLimite, proyecto) {
  if (fechaLimite < proyecto.fechaInicio) {
    throw new ErrorApi(400, 'Hay datos inválidos en la petición', [{
      campo: 'fechaLimite',
      mensaje: `La fecha límite no puede ser anterior al inicio del proyecto (${proyecto.fechaInicio})`
    }]);
  }
}

/** GET /api/proyectos/:proyectoId/actividades  ?estado= */
async function listarActividades(req, res) {
  const proyectoId = obtenerIdValido(req.params.proyectoId, 'proyectoId');
  await obtenerProyectoConPermiso(proyectoId, req.usuario);

  const { estado } = req.query;
  if (estado && !ESTADOS_ACTIVIDAD.includes(estado)) {
    throw new ErrorApi(400, `El filtro estado solo acepta: ${ESTADOS_ACTIVIDAD.join(', ')}`);
  }

  const actividades = await ActividadModelo.listarPorProyecto(proyectoId, { estado });
  return responderExito(res, 200, `Actividades del proyecto ${proyectoId}`, actividades, {
    total: actividades.length
  });
}

/** GET /api/actividades/:id */
async function obtenerActividad(req, res) {
  const id = obtenerIdValido(req.params.id);
  const actividad = await buscarActividadOFallar(id);
  return responderExito(res, 200, 'Actividad encontrada', actividad);
}

/** POST /api/proyectos/:proyectoId/actividades */
async function crearActividad(req, res) {
  const proyectoId = obtenerIdValido(req.params.proyectoId, 'proyectoId');
  const proyecto = await obtenerProyectoConPermiso(proyectoId, req.usuario, { paraEditar: true });

  validarOFallar(req.body, reglasActividad);
  validarFechaLimite(req.body.fechaLimite, proyecto);

  const responsableId = req.body.responsableId ? Number(req.body.responsableId) : null;
  if (responsableId) await validarResponsableActividad(responsableId);

  const actividad = await ActividadModelo.crear({
    proyectoId,
    titulo: limpiarTexto(req.body.titulo),
    descripcion: limpiarTexto(req.body.descripcion) || null,
    fechaLimite: req.body.fechaLimite,
    estado: req.body.estado || 'pendiente',
    responsableId
  });

  return responderExito(res, 201, 'Actividad creada correctamente', actividad);
}

/** PUT /api/actividades/:id */
async function actualizarActividad(req, res) {
  const id = obtenerIdValido(req.params.id);
  const actividadActual = await buscarActividadOFallar(id);
  const proyecto = await obtenerProyectoConPermiso(actividadActual.proyectoId, req.usuario, { paraEditar: true });

  validarOFallar(req.body, reglasActividad, true);

  const cambios = {};
  if (req.body.titulo !== undefined) cambios.titulo = limpiarTexto(req.body.titulo);
  if (req.body.descripcion !== undefined) cambios.descripcion = limpiarTexto(req.body.descripcion) || null;
  if (req.body.estado !== undefined) cambios.estado = req.body.estado;
  if (req.body.fechaLimite !== undefined) {
    validarFechaLimite(req.body.fechaLimite, proyecto);
    cambios.fechaLimite = req.body.fechaLimite;
  }
  if (req.body.responsableId !== undefined) {
    cambios.responsableId = req.body.responsableId ? Number(req.body.responsableId) : null;
    if (cambios.responsableId) await validarResponsableActividad(cambios.responsableId);
  }

  if (Object.keys(cambios).length === 0) {
    throw new ErrorApi(400, 'No enviaste ningún campo para actualizar');
  }

  const actividad = await ActividadModelo.actualizar(id, cambios);
  return responderExito(res, 200, 'Actividad actualizada correctamente', actividad);
}

/**
 * PATCH /api/actividades/:id/estado
 * Para mover la tarjeta entre pendiente -> en_progreso -> completada.
 */
async function cambiarEstadoActividad(req, res) {
  const id = obtenerIdValido(req.params.id);
  const actividadActual = await buscarActividadOFallar(id);
  await obtenerProyectoConPermiso(actividadActual.proyectoId, req.usuario, { paraEditar: true });

  const { estado } = req.body || {};
  if (!ESTADOS_ACTIVIDAD.includes(estado)) {
    throw new ErrorApi(400, `El estado debe ser uno de: ${ESTADOS_ACTIVIDAD.join(', ')}`);
  }

  const actividad = await ActividadModelo.actualizar(id, { estado });
  return responderExito(res, 200, `Actividad marcada como ${estado}`, actividad);
}

/** DELETE /api/actividades/:id */
async function eliminarActividad(req, res) {
  const id = obtenerIdValido(req.params.id);
  const actividad = await buscarActividadOFallar(id);
  await obtenerProyectoConPermiso(actividad.proyectoId, req.usuario, { paraEditar: true });
  await ActividadModelo.eliminar(id);
  return responderExito(res, 200, 'Actividad eliminada correctamente');
}

module.exports = {
  listarActividades,
  obtenerActividad,
  crearActividad,
  actualizarActividad,
  cambiarEstadoActividad,
  eliminarActividad
};
