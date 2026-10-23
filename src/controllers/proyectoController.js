/**
 * Controlador de proyectos: el corazón de la plataforma.
 */
const ProyectoModelo = require('../models/ProyectoModelo');
const UsuarioModelo = require('../models/UsuarioModelo');
const ImpactoModelo = require('../models/ImpactoModelo');
const ActividadModelo = require('../models/ActividadModelo');
const MonitoreoModelo = require('../models/MonitoreoModelo');
const { responderExito, ErrorApi } = require('../utils/respuesta');
const { validarOFallar, obtenerIdValido, limpiarTexto } = require('../utils/validaciones');
const { obtenerPaginacion, construirMetaPaginacion } = require('../utils/paginacion');
const { obtenerProyectoConPermiso } = require('../utils/permisos');
const { reglasProyecto, ESTADOS_PROYECTO, TIPOS_PROYECTO } = require('../validators/reglas');

const CAMPOS_TEXTO = ['nombre', 'descripcion', 'tipo', 'municipio', 'departamento', 'estado'];
const CAMPOS_NUMERICOS = ['latitud', 'longitud', 'presupuesto'];

/** Toma solo los campos permitidos del body y los deja limpios. */
function extraerDatosProyecto(cuerpo) {
  const datos = {};
  CAMPOS_TEXTO.forEach((campo) => {
    if (cuerpo[campo] !== undefined) datos[campo] = limpiarTexto(cuerpo[campo]);
  });
  CAMPOS_NUMERICOS.forEach((campo) => {
    if (cuerpo[campo] !== undefined) datos[campo] = cuerpo[campo] === null ? null : Number(cuerpo[campo]);
  });
  if (cuerpo.fechaInicio !== undefined) datos.fechaInicio = cuerpo.fechaInicio;
  if (cuerpo.fechaFin !== undefined) datos.fechaFin = cuerpo.fechaFin || null;
  if (cuerpo.responsableId !== undefined) datos.responsableId = Number(cuerpo.responsableId);
  return datos;
}

/** La fecha de fin no puede quedar antes de la fecha de inicio. */
function validarRangoFechas(fechaInicio, fechaFin) {
  if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
    throw new ErrorApi(400, 'Hay datos inválidos en la petición', [
      { campo: 'fechaFin', mensaje: 'La fecha de fin no puede ser anterior a la fecha de inicio' }
    ]);
  }
}

/** El responsable tiene que existir, estar activo y ser gestor o admin. */
async function validarResponsable(responsableId) {
  const responsable = await UsuarioModelo.buscarPorId(responsableId);
  if (!responsable || !responsable.activo) {
    throw new ErrorApi(400, 'El responsable indicado no existe o está desactivado');
  }
  if (responsable.rol === 'consultor') {
    throw new ErrorApi(400, 'Un consultor no puede ser responsable de un proyecto');
  }
}

/**
 * GET /api/proyectos
 * Filtros opcionales: ?estado=&tipo=&municipio=&buscar=&responsableId=&pagina=&limite=
 */
async function listarProyectos(req, res) {
  const { pagina, limite, offset } = obtenerPaginacion(req.query);
  const { estado, tipo, municipio, buscar } = req.query;

  if (estado && !ESTADOS_PROYECTO.includes(estado)) {
    throw new ErrorApi(400, `El filtro estado solo acepta: ${ESTADOS_PROYECTO.join(', ')}`);
  }
  if (tipo && !TIPOS_PROYECTO.includes(tipo)) {
    throw new ErrorApi(400, `El filtro tipo solo acepta: ${TIPOS_PROYECTO.join(', ')}`);
  }
  const responsableId = req.query.responsableId
    ? obtenerIdValido(req.query.responsableId, 'responsableId')
    : undefined;

  const { proyectos, total } = await ProyectoModelo.listar({
    estado, tipo, municipio, buscar, responsableId, limite, offset
  });

  return responderExito(res, 200, 'Listado de proyectos', proyectos, {
    paginacion: construirMetaPaginacion(total, pagina, limite)
  });
}

/**
 * GET /api/proyectos/:id
 * Devuelve el proyecto con sus impactos, actividades y monitoreos.
 * Es lo que necesita la pantalla ProjectDetail en una sola petición.
 */
async function obtenerProyecto(req, res) {
  const id = obtenerIdValido(req.params.id);
  const proyecto = await obtenerProyectoConPermiso(id, req.usuario);

  const [impactos, actividades, monitoreos] = await Promise.all([
    ImpactoModelo.listarPorProyecto(id, {}),
    ActividadModelo.listarPorProyecto(id, {}),
    MonitoreoModelo.listarPorProyecto(id, {})
  ]);

  return responderExito(res, 200, 'Proyecto encontrado', {
    ...proyecto,
    impactos,
    actividades,
    monitoreos
  });
}

/** POST /api/proyectos  (admin o gestor) */
async function crearProyecto(req, res) {
  validarOFallar(req.body, reglasProyecto);
  const datos = extraerDatosProyecto(req.body);
  validarRangoFechas(datos.fechaInicio, datos.fechaFin);

  // Un gestor siempre queda como responsable de lo que crea.
  // El admin sí puede asignar el proyecto a otro gestor.
  if (req.usuario.rol === 'admin' && datos.responsableId) {
    await validarResponsable(datos.responsableId);
  } else {
    datos.responsableId = req.usuario.id;
  }

  const proyecto = await ProyectoModelo.crear({
    descripcion: null,
    latitud: null,
    longitud: null,
    fechaFin: null,
    presupuesto: 0,
    estado: 'planeacion',
    ...datos
  });

  return responderExito(res, 201, 'Proyecto creado correctamente', proyecto);
}

/** PUT /api/proyectos/:id  (admin o responsable). Se pueden mandar solo los campos a cambiar. */
async function actualizarProyecto(req, res) {
  const id = obtenerIdValido(req.params.id);
  const proyectoActual = await obtenerProyectoConPermiso(id, req.usuario, { paraEditar: true });

  validarOFallar(req.body, reglasProyecto, true);
  const cambios = extraerDatosProyecto(req.body);

  if (Object.keys(cambios).length === 0) {
    throw new ErrorApi(400, 'No enviaste ningún campo para actualizar');
  }

  // Se validan las fechas combinando lo nuevo con lo que ya estaba guardado
  validarRangoFechas(
    cambios.fechaInicio || proyectoActual.fechaInicio,
    cambios.fechaFin !== undefined ? cambios.fechaFin : proyectoActual.fechaFin
  );

  if (cambios.responsableId !== undefined) {
    if (req.usuario.rol !== 'admin') {
      throw new ErrorApi(403, 'Solo un administrador puede cambiar el responsable del proyecto');
    }
    await validarResponsable(cambios.responsableId);
  }

  const proyecto = await ProyectoModelo.actualizar(id, cambios);
  return responderExito(res, 200, 'Proyecto actualizado correctamente', proyecto);
}

/**
 * PATCH /api/proyectos/:id/estado
 * Ruta aparte para el botón de "cambiar estado" del front.
 */
async function cambiarEstadoProyecto(req, res) {
  const id = obtenerIdValido(req.params.id);
  const proyectoActual = await obtenerProyectoConPermiso(id, req.usuario, { paraEditar: true });
  const { estado } = req.body || {};

  if (!ESTADOS_PROYECTO.includes(estado)) {
    throw new ErrorApi(400, `El estado debe ser uno de: ${ESTADOS_PROYECTO.join(', ')}`);
  }
  if (proyectoActual.estado === estado) {
    throw new ErrorApi(400, `El proyecto ya está en estado ${estado}`);
  }
  // Un proyecto finalizado solo lo puede reabrir el administrador
  if (proyectoActual.estado === 'finalizado' && req.usuario.rol !== 'admin') {
    throw new ErrorApi(403, 'Un proyecto finalizado solo puede ser reabierto por un administrador');
  }

  const proyecto = await ProyectoModelo.actualizar(id, { estado });
  return responderExito(res, 200, `Estado del proyecto cambiado a ${estado}`, proyecto);
}

/** DELETE /api/proyectos/:id  (admin o responsable) */
async function eliminarProyecto(req, res) {
  const id = obtenerIdValido(req.params.id);
  await obtenerProyectoConPermiso(id, req.usuario, { paraEditar: true });
  await ProyectoModelo.eliminar(id);
  return responderExito(res, 200, 'Proyecto eliminado junto con sus impactos, actividades y monitoreos');
}

module.exports = {
  listarProyectos,
  obtenerProyecto,
  crearProyecto,
  actualizarProyecto,
  cambiarEstadoProyecto,
  eliminarProyecto
};
