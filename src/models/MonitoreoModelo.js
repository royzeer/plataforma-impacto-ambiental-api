/**
 * Modelo Monitoreo: mediciones de parámetros ambientales de cada proyecto
 * (pH, DBO5, oxígeno disuelto, PM10, ruido, etc.).
 */
const { pool } = require('../config/db');

const SELECT_MONITOREO = `
  SELECT
    id, proyecto_id AS proyectoId, parametro, valor, unidad,
    limite_permisible AS limitePermisible, tipo_limite AS tipoLimite,
    cumple_norma AS cumpleNorma, punto_muestreo AS puntoMuestreo,
    fecha_muestreo AS fechaMuestreo, observaciones, creado_en AS creadoEn
  FROM monitoreos
`;

const MAPA_COLUMNAS = {
  parametro: 'parametro',
  valor: 'valor',
  unidad: 'unidad',
  limitePermisible: 'limite_permisible',
  tipoLimite: 'tipo_limite',
  cumpleNorma: 'cumple_norma',
  puntoMuestreo: 'punto_muestreo',
  fechaMuestreo: 'fecha_muestreo',
  observaciones: 'observaciones'
};

// cumple_norma viene como 0, 1 o null. Lo pasamos a booleano (o null).
function formatearMonitoreo(fila) {
  if (!fila) return null;
  return {
    ...fila,
    cumpleNorma: fila.cumpleNorma === null ? null : Boolean(fila.cumpleNorma)
  };
}

class MonitoreoModelo {
  static async buscarPorId(id) {
    const [filas] = await pool.query(`${SELECT_MONITOREO} WHERE id = ?`, [id]);
    return formatearMonitoreo(filas[0]);
  }

  static async listarPorProyecto(proyectoId, { parametro, cumpleNorma, desde, hasta }) {
    const condiciones = ['proyecto_id = ?'];
    const valores = [proyectoId];

    if (parametro) {
      condiciones.push('parametro LIKE ?');
      valores.push(`%${parametro}%`);
    }
    if (cumpleNorma !== undefined) {
      condiciones.push('cumple_norma = ?');
      valores.push(cumpleNorma ? 1 : 0);
    }
    if (desde) {
      condiciones.push('fecha_muestreo >= ?');
      valores.push(desde);
    }
    if (hasta) {
      condiciones.push('fecha_muestreo <= ?');
      valores.push(hasta);
    }

    const [filas] = await pool.query(
      `${SELECT_MONITOREO} WHERE ${condiciones.join(' AND ')} ORDER BY fecha_muestreo DESC, id DESC`,
      valores
    );
    return filas.map(formatearMonitoreo);
  }

  static async crear(datos) {
    const [resultado] = await pool.query(
      `INSERT INTO monitoreos
        (proyecto_id, parametro, valor, unidad, limite_permisible, tipo_limite,
         cumple_norma, punto_muestreo, fecha_muestreo, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.proyectoId, datos.parametro, datos.valor, datos.unidad, datos.limitePermisible,
        datos.tipoLimite, datos.cumpleNorma, datos.puntoMuestreo, datos.fechaMuestreo, datos.observaciones
      ]
    );
    return MonitoreoModelo.buscarPorId(resultado.insertId);
  }

  static async actualizar(id, campos) {
    // La tabla monitoreos no tiene actualizado_en, por eso armamos el SET aquí
    const partes = [];
    const valores = [];
    Object.entries(MAPA_COLUMNAS).forEach(([campoJs, columnaBd]) => {
      if (campos[campoJs] !== undefined) {
        partes.push(`${columnaBd} = ?`);
        valores.push(campos[campoJs]);
      }
    });
    if (partes.length > 0) {
      await pool.query(`UPDATE monitoreos SET ${partes.join(', ')} WHERE id = ?`, [...valores, id]);
    }
    return MonitoreoModelo.buscarPorId(id);
  }

  static async eliminar(id) {
    const [resultado] = await pool.query('DELETE FROM monitoreos WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  }
}

module.exports = MonitoreoModelo;
