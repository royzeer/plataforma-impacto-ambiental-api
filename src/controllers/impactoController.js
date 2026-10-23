/**
 * Controlador de impactos ambientales.
 *
 * La importancia y el nivel NO los manda el usuario: los calcula la API
 * con la magnitud y la probabilidad (ver utils/matrizImpacto.js). Así
 * evitamos que alguien marque como "bajo" un impacto que en realidad es crítico.
 */
const ImpactoModelo = require('../models/ImpactoModelo');
const { responderExito, ErrorApi } = require('../utils/respuesta');
const { validarOFallar, obtenerIdValido, limpiarTexto } = require('../utils/validaciones');
const { obtenerProyectoConPermiso } = require('../utils/permisos');
const { calcularImportancia, clasificarNivel } = require('../utils/matrizImpacto');
const { reglasImpacto, COMPONENTES, NIVELES, NATURALEZAS } = require('../validators/reglas');

async function buscarImpactoOFallar(id) {
  const impacto = await ImpactoModelo.buscarPorId(id);
  if (!impacto) throw new ErrorApi(404, `No existe un impacto ambiental con id ${id}`);
  return impacto;
}

/** GET /api/proyectos/:proyectoId/impactos  ?componente=&nivel=&naturaleza= */
async function listarImpactos(req, res) {
  const proyectoId = obtenerIdValido(req.params.proyectoId, 'proyectoId');
  await obtenerProyectoConPermiso(proyectoId, req.usuario);

  const { componente, nivel, naturaleza } = req.query;
  if (componente && !COMPONENTES.includes(componente)) {
    throw new ErrorApi(400, `El filtro componente solo acepta: ${COMPONENTES.join(', ')}`);
  }
  if (nivel && !NIVELES.includes(nivel)) {
    throw new ErrorApi(400, `El filtro nivel solo acepta: ${NIVELES.join(', ')}`);
  }
  if (naturaleza && !NATURALEZAS.includes(naturaleza)) {
    throw new ErrorApi(400, `El filtro naturaleza solo acepta: ${NATURALEZAS.join(', ')}`);
  }

  const impactos = await ImpactoModelo.listarPorProyecto(proyectoId, { componente, nivel, naturaleza });
  return responderExito(res, 200, `Impactos del proyecto ${proyectoId}`, impactos, { total: impactos.length });
}

/** GET /api/impactos/:id */
async function obtenerImpacto(req, res) {
  const id = obtenerIdValido(req.params.id);
  const impacto = await buscarImpactoOFallar(id);
  return responderExito(res, 200, 'Impacto encontrado', impacto);
}

/** POST /api/proyectos/:proyectoId/impactos */
async function crearImpacto(req, res) {
  const proyectoId = obtenerIdValido(req.params.proyectoId, 'proyectoId');
  await obtenerProyectoConPermiso(proyectoId, req.usuario, { paraEditar: true });

  validarOFallar(req.body, reglasImpacto);

  const magnitud = Number(req.body.magnitud);
  const probabilidad = Number(req.body.probabilidad);
  const importancia = calcularImportancia(magnitud, probabilidad);

  const impacto = await ImpactoModelo.crear({
    proyectoId,
    componente: req.body.componente,
    descripcion: limpiarTexto(req.body.descripcion),
    naturaleza: req.body.naturaleza,
    magnitud,
    probabilidad,
    importancia,
    nivel: clasificarNivel(importancia),
    medidaManejo: limpiarTexto(req.body.medidaManejo) || null
  });

  return responderExito(res, 201, 'Impacto ambiental registrado correctamente', impacto);
}

/** PUT /api/impactos/:id */
async function actualizarImpacto(req, res) {
  const id = obtenerIdValido(req.params.id);
  const impactoActual = await buscarImpactoOFallar(id);
  await obtenerProyectoConPermiso(impactoActual.proyectoId, req.usuario, { paraEditar: true });

  validarOFallar(req.body, reglasImpacto, true);

  const cambios = {};
  ['componente', 'naturaleza'].forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  });
  if (req.body.descripcion !== undefined) cambios.descripcion = limpiarTexto(req.body.descripcion);
  if (req.body.medidaManejo !== undefined) cambios.medidaManejo = limpiarTexto(req.body.medidaManejo) || null;

  // Si cambia la magnitud o la probabilidad, se recalcula todo
  if (req.body.magnitud !== undefined || req.body.probabilidad !== undefined) {
    cambios.magnitud = Number(req.body.magnitud ?? impactoActual.magnitud);
    cambios.probabilidad = Number(req.body.probabilidad ?? impactoActual.probabilidad);
    cambios.importancia = calcularImportancia(cambios.magnitud, cambios.probabilidad);
    cambios.nivel = clasificarNivel(cambios.importancia);
  }

  if (Object.keys(cambios).length === 0) {
    throw new ErrorApi(400, 'No enviaste ningún campo para actualizar');
  }

  const impacto = await ImpactoModelo.actualizar(id, cambios);
  return responderExito(res, 200, 'Impacto ambiental actualizado correctamente', impacto);
}

/** DELETE /api/impactos/:id */
async function eliminarImpacto(req, res) {
  const id = obtenerIdValido(req.params.id);
  const impacto = await buscarImpactoOFallar(id);
  await obtenerProyectoConPermiso(impacto.proyectoId, req.usuario, { paraEditar: true });
  await ImpactoModelo.eliminar(id);
  return responderExito(res, 200, 'Impacto ambiental eliminado correctamente');
}

module.exports = { listarImpactos, obtenerImpacto, crearImpacto, actualizarImpacto, eliminarImpacto };
