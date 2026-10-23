/**
 * Controlador de monitoreos ambientales.
 *
 * Cada monitoreo es una medición (ej: pH = 6.2 en el punto "Bocatoma").
 * Si el usuario manda el límite permisible, la API calcula sola si la
 * medición cumple o no la norma (campo cumpleNorma).
 */
const MonitoreoModelo = require('../models/MonitoreoModelo');
const { responderExito, ErrorApi } = require('../utils/respuesta');
const { validarOFallar, obtenerIdValido, limpiarTexto, esFechaValida } = require('../utils/validaciones');
const { obtenerProyectoConPermiso } = require('../utils/permisos');
const { evaluarCumplimiento } = require('../utils/matrizImpacto');
const { obtenerFechaHoy } = require('../utils/fechas');
const { reglasMonitoreo } = require('../validators/reglas');

async function buscarMonitoreoOFallar(id) {
  const monitoreo = await MonitoreoModelo.buscarPorId(id);
  if (!monitoreo) throw new ErrorApi(404, `No existe un monitoreo con id ${id}`);
  return monitoreo;
}

/** No tiene sentido registrar una muestra con fecha del futuro. */
function validarFechaMuestreo(fecha) {
  if (fecha > obtenerFechaHoy()) {
    throw new ErrorApi(400, 'Hay datos inválidos en la petición', [
      { campo: 'fechaMuestreo', mensaje: 'La fecha de muestreo no puede ser una fecha futura' }
    ]);
  }
}

/** Convierte a número, o a null si viene vacío. */
function numeroONulo(valor) {
  return valor === undefined || valor === null || valor === '' ? null : Number(valor);
}

/** GET /api/proyectos/:proyectoId/monitoreos  ?parametro=&cumpleNorma=&desde=&hasta= */
async function listarMonitoreos(req, res) {
  const proyectoId = obtenerIdValido(req.params.proyectoId, 'proyectoId');
  await obtenerProyectoConPermiso(proyectoId, req.usuario);

  const { parametro, desde, hasta } = req.query;
  if ((desde && !esFechaValida(desde)) || (hasta && !esFechaValida(hasta))) {
    throw new ErrorApi(400, 'Los filtros desde y hasta deben tener formato AAAA-MM-DD');
  }

  let cumpleNorma;
  if (req.query.cumpleNorma === 'true') cumpleNorma = true;
  if (req.query.cumpleNorma === 'false') cumpleNorma = false;

  const monitoreos = await MonitoreoModelo.listarPorProyecto(proyectoId, { parametro, cumpleNorma, desde, hasta });
  return responderExito(res, 200, `Monitoreos del proyecto ${proyectoId}`, monitoreos, {
    total: monitoreos.length
  });
}

/** GET /api/monitoreos/:id */
async function obtenerMonitoreo(req, res) {
  const id = obtenerIdValido(req.params.id);
  const monitoreo = await buscarMonitoreoOFallar(id);
  return responderExito(res, 200, 'Monitoreo encontrado', monitoreo);
}

/** POST /api/proyectos/:proyectoId/monitoreos */
async function crearMonitoreo(req, res) {
  const proyectoId = obtenerIdValido(req.params.proyectoId, 'proyectoId');
  await obtenerProyectoConPermiso(proyectoId, req.usuario, { paraEditar: true });

  validarOFallar(req.body, reglasMonitoreo);
  validarFechaMuestreo(req.body.fechaMuestreo);

  const valor = Number(req.body.valor);
  const limitePermisible = numeroONulo(req.body.limitePermisible);
  const tipoLimite = req.body.tipoLimite || 'maximo';
  const cumple = evaluarCumplimiento(valor, limitePermisible, tipoLimite);

  const monitoreo = await MonitoreoModelo.crear({
    proyectoId,
    parametro: limpiarTexto(req.body.parametro),
    valor,
    unidad: limpiarTexto(req.body.unidad),
    limitePermisible,
    tipoLimite,
    cumpleNorma: cumple === null ? null : Number(cumple),
    puntoMuestreo: limpiarTexto(req.body.puntoMuestreo) || null,
    fechaMuestreo: req.body.fechaMuestreo,
    observaciones: limpiarTexto(req.body.observaciones) || null
  });

  const mensaje = cumple === false
    ? 'Monitoreo registrado. Atención: el valor está FUERA de la norma'
    : 'Monitoreo registrado correctamente';
  return responderExito(res, 201, mensaje, monitoreo);
}

/** PUT /api/monitoreos/:id */
async function actualizarMonitoreo(req, res) {
  const id = obtenerIdValido(req.params.id);
  const actual = await buscarMonitoreoOFallar(id);
  await obtenerProyectoConPermiso(actual.proyectoId, req.usuario, { paraEditar: true });

  validarOFallar(req.body, reglasMonitoreo, true);

  const cambios = {};
  ['parametro', 'unidad', 'puntoMuestreo', 'observaciones'].forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = limpiarTexto(req.body[campo]) || null;
  });
  if (req.body.fechaMuestreo !== undefined) {
    validarFechaMuestreo(req.body.fechaMuestreo);
    cambios.fechaMuestreo = req.body.fechaMuestreo;
  }
  if (req.body.valor !== undefined) cambios.valor = Number(req.body.valor);
  if (req.body.limitePermisible !== undefined) cambios.limitePermisible = numeroONulo(req.body.limitePermisible);
  if (req.body.tipoLimite !== undefined) cambios.tipoLimite = req.body.tipoLimite;

  if (Object.keys(cambios).length === 0) {
    throw new ErrorApi(400, 'No enviaste ningún campo para actualizar');
  }

  // Se vuelve a evaluar el cumplimiento con los datos finales
  const cumple = evaluarCumplimiento(
    cambios.valor ?? actual.valor,
    cambios.limitePermisible !== undefined ? cambios.limitePermisible : actual.limitePermisible,
    cambios.tipoLimite || actual.tipoLimite
  );
  cambios.cumpleNorma = cumple === null ? null : Number(cumple);

  const monitoreo = await MonitoreoModelo.actualizar(id, cambios);
  return responderExito(res, 200, 'Monitoreo actualizado correctamente', monitoreo);
}

/** DELETE /api/monitoreos/:id */
async function eliminarMonitoreo(req, res) {
  const id = obtenerIdValido(req.params.id);
  const monitoreo = await buscarMonitoreoOFallar(id);
  await obtenerProyectoConPermiso(monitoreo.proyectoId, req.usuario, { paraEditar: true });
  await MonitoreoModelo.eliminar(id);
  return responderExito(res, 200, 'Monitoreo eliminado correctamente');
}

module.exports = {
  listarMonitoreos,
  obtenerMonitoreo,
  crearMonitoreo,
  actualizarMonitoreo,
  eliminarMonitoreo
};
