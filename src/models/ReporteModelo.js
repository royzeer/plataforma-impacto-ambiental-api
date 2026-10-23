/**
 * Modelo Reporte: consultas de resumen para el Dashboard del front
 * (las tarjetas de números y la gráfica ImpactChart).
 */
const { pool } = require('../config/db');

// Convierte filas tipo [{ estado: 'ejecucion', total: 3 }] en { ejecucion: 3 }
function agruparConteo(filas, campo, valoresPosibles) {
  const resultado = {};
  valoresPosibles.forEach((valor) => { resultado[valor] = 0; });
  filas.forEach((fila) => { resultado[fila[campo]] = Number(fila.total); });
  return resultado;
}

class ReporteModelo {
  /** Números generales de toda la plataforma */
  static async resumenGeneral(fechaHoy) {
    const [proyectosPorEstado] = await pool.query(
      'SELECT estado, COUNT(*) AS total FROM proyectos GROUP BY estado'
    );
    const [impactosPorNivel] = await pool.query(
      'SELECT nivel, COUNT(*) AS total FROM impactos_ambientales GROUP BY nivel'
    );
    const [impactosPorComponente] = await pool.query(
      'SELECT componente, COUNT(*) AS total FROM impactos_ambientales GROUP BY componente'
    );
    const [vencidas] = await pool.query(
      `SELECT COUNT(*) AS total FROM actividades
       WHERE estado <> 'completada' AND fecha_limite < ?`,
      [fechaHoy]
    );
    const [fueraDeNorma] = await pool.query(
      'SELECT COUNT(*) AS total FROM monitoreos WHERE cumple_norma = 0'
    );
    const [presupuesto] = await pool.query(
      'SELECT COALESCE(SUM(presupuesto), 0) AS total FROM proyectos'
    );

    const conteoEstados = agruparConteo(
      proyectosPorEstado, 'estado', ['planeacion', 'ejecucion', 'finalizado', 'suspendido']
    );

    return {
      totalProyectos: Object.values(conteoEstados).reduce((suma, n) => suma + n, 0),
      proyectosPorEstado: conteoEstados,
      impactosPorNivel: agruparConteo(impactosPorNivel, 'nivel', ['bajo', 'moderado', 'alto', 'critico']),
      impactosPorComponente: agruparConteo(
        impactosPorComponente, 'componente',
        ['agua', 'aire', 'suelo', 'flora', 'fauna', 'paisaje', 'social']
      ),
      actividadesVencidas: Number(vencidas[0].total),
      monitoreosFueraDeNorma: Number(fueraDeNorma[0].total),
      presupuestoTotal: Number(presupuesto[0].total)
    };
  }

  /** Resumen de un solo proyecto (para la vista ProjectDetail) */
  static async resumenProyecto(proyectoId, fechaHoy) {
    const [impactos] = await pool.query(
      `SELECT nivel, COUNT(*) AS total FROM impactos_ambientales
       WHERE proyecto_id = ? GROUP BY nivel`,
      [proyectoId]
    );
    const [actividades] = await pool.query(
      'SELECT estado, COUNT(*) AS total FROM actividades WHERE proyecto_id = ? GROUP BY estado',
      [proyectoId]
    );
    const [vencidas] = await pool.query(
      `SELECT COUNT(*) AS total FROM actividades
       WHERE proyecto_id = ? AND estado <> 'completada' AND fecha_limite < ?`,
      [proyectoId, fechaHoy]
    );
    const [monitoreos] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN cumple_norma = 1 THEN 1 ELSE 0 END) AS cumplen,
         SUM(CASE WHEN cumple_norma = 0 THEN 1 ELSE 0 END) AS noCumplen
       FROM monitoreos WHERE proyecto_id = ?`,
      [proyectoId]
    );

    const conteoActividades = agruparConteo(actividades, 'estado', ['pendiente', 'en_progreso', 'completada']);
    const totalActividades = Object.values(conteoActividades).reduce((suma, n) => suma + n, 0);

    // % de avance = actividades completadas / total de actividades
    const porcentajeAvance = totalActividades === 0
      ? 0
      : Math.round((conteoActividades.completada / totalActividades) * 100);

    return {
      impactosPorNivel: agruparConteo(impactos, 'nivel', ['bajo', 'moderado', 'alto', 'critico']),
      actividades: {
        ...conteoActividades,
        total: totalActividades,
        vencidas: Number(vencidas[0].total),
        porcentajeAvance
      },
      monitoreos: {
        total: Number(monitoreos[0].total),
        cumplen: Number(monitoreos[0].cumplen || 0),
        noCumplen: Number(monitoreos[0].noCumplen || 0)
      }
    };
  }
}

module.exports = ReporteModelo;
