/**
 * Controlador de reportes (datos para el Dashboard y la gráfica ImpactChart).
 */
const ReporteModelo = require('../models/ReporteModelo');
const { responderExito } = require('../utils/respuesta');
const { obtenerIdValido } = require('../utils/validaciones');
const { obtenerProyectoConPermiso } = require('../utils/permisos');
const { obtenerFechaHoy } = require('../utils/fechas');

/** GET /api/reportes/dashboard */
async function obtenerDashboard(req, res) {
  const resumen = await ReporteModelo.resumenGeneral(obtenerFechaHoy());
  return responderExito(res, 200, 'Resumen general de la plataforma', resumen);
}

/** GET /api/reportes/proyectos/:id */
async function obtenerResumenProyecto(req, res) {
  const id = obtenerIdValido(req.params.id);
  const proyecto = await obtenerProyectoConPermiso(id, req.usuario);
  const resumen = await ReporteModelo.resumenProyecto(id, obtenerFechaHoy());

  return responderExito(res, 200, `Resumen del proyecto ${proyecto.codigo}`, {
    proyecto: {
      id: proyecto.id,
      codigo: proyecto.codigo,
      nombre: proyecto.nombre,
      estado: proyecto.estado
    },
    ...resumen
  });
}

module.exports = { obtenerDashboard, obtenerResumenProyecto };
