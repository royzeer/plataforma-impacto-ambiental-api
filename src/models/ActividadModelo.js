/**
 * Modelo Actividad: tareas del plan de manejo ambiental de cada proyecto.
 */
const { pool } = require('../config/db');
const { construirSet } = require('../utils/sql');
const { obtenerFechaHoy } = require('../utils/fechas');

const SELECT_ACTIVIDAD = `
  SELECT
    a.id, a.proyecto_id AS proyectoId, a.titulo, a.descripcion,
    a.fecha_limite AS fechaLimite, a.estado,
    a.responsable_id AS responsableId, u.nombre AS responsableNombre,
    a.creado_en AS creadoEn, a.actualizado_en AS actualizadoEn
  FROM actividades a
  LEFT JOIN usuarios u ON u.id = a.responsable_id
`;

const MAPA_COLUMNAS = {
  titulo: 'titulo',
  descripcion: 'descripcion',
  fechaLimite: 'fecha_limite',
  estado: 'estado',
  responsableId: 'responsable_id'
};

// Le agregamos el campo "vencida" para que el front pinte en rojo
// las tareas que ya pasaron su fecha y no se han terminado.
function agregarVencida(actividad) {
  if (!actividad) return null;
  const vencida = actividad.estado !== 'completada' && actividad.fechaLimite < obtenerFechaHoy();
  return { ...actividad, vencida };
}

class ActividadModelo {
  static async buscarPorId(id) {
    const [filas] = await pool.query(`${SELECT_ACTIVIDAD} WHERE a.id = ?`, [id]);
    return agregarVencida(filas[0]);
  }

  static async listarPorProyecto(proyectoId, { estado }) {
    const condiciones = ['a.proyecto_id = ?'];
    const valores = [proyectoId];

    if (estado) {
      condiciones.push('a.estado = ?');
      valores.push(estado);
    }

    const [filas] = await pool.query(
      `${SELECT_ACTIVIDAD} WHERE ${condiciones.join(' AND ')} ORDER BY a.fecha_limite ASC, a.id ASC`,
      valores
    );
    return filas.map(agregarVencida);
  }

  static async crear(datos) {
    const [resultado] = await pool.query(
      `INSERT INTO actividades (proyecto_id, titulo, descripcion, fecha_limite, estado, responsable_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [datos.proyectoId, datos.titulo, datos.descripcion, datos.fechaLimite, datos.estado, datos.responsableId]
    );
    return ActividadModelo.buscarPorId(resultado.insertId);
  }

  static async actualizar(id, campos) {
    const { sqlSet, valores } = construirSet(campos, MAPA_COLUMNAS);
    await pool.query(`UPDATE actividades SET ${sqlSet} WHERE id = ?`, [...valores, id]);
    return ActividadModelo.buscarPorId(id);
  }

  static async eliminar(id) {
    const [resultado] = await pool.query('DELETE FROM actividades WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  }
}

module.exports = ActividadModelo;
