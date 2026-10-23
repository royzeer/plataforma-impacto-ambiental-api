/**
 * Modelo Proyecto: consultas de la tabla "proyectos".
 */
const { pool } = require('../config/db');
const { construirSet } = require('../utils/sql');

// Traemos también el nombre del responsable para que el front no tenga
// que hacer otra petición solo para mostrarlo en la tarjeta del proyecto.
const SELECT_PROYECTO = `
  SELECT
    p.id, p.codigo, p.nombre, p.descripcion, p.tipo,
    p.municipio, p.departamento, p.latitud, p.longitud,
    p.fecha_inicio AS fechaInicio, p.fecha_fin AS fechaFin,
    p.presupuesto, p.estado,
    p.responsable_id AS responsableId, u.nombre AS responsableNombre,
    p.creado_en AS creadoEn, p.actualizado_en AS actualizadoEn
  FROM proyectos p
  INNER JOIN usuarios u ON u.id = p.responsable_id
`;

const MAPA_COLUMNAS = {
  nombre: 'nombre',
  descripcion: 'descripcion',
  tipo: 'tipo',
  municipio: 'municipio',
  departamento: 'departamento',
  latitud: 'latitud',
  longitud: 'longitud',
  fechaInicio: 'fecha_inicio',
  fechaFin: 'fecha_fin',
  presupuesto: 'presupuesto',
  estado: 'estado',
  responsableId: 'responsable_id'
};

class ProyectoModelo {
  static async buscarPorId(id) {
    const [filas] = await pool.query(`${SELECT_PROYECTO} WHERE p.id = ?`, [id]);
    return filas[0] || null;
  }

  static async listar({ estado, tipo, municipio, buscar, responsableId, limite, offset }) {
    const condiciones = [];
    const valores = [];

    if (estado) {
      condiciones.push('p.estado = ?');
      valores.push(estado);
    }
    if (tipo) {
      condiciones.push('p.tipo = ?');
      valores.push(tipo);
    }
    if (municipio) {
      condiciones.push('p.municipio LIKE ?');
      valores.push(`%${municipio}%`);
    }
    if (responsableId) {
      condiciones.push('p.responsable_id = ?');
      valores.push(responsableId);
    }
    if (buscar) {
      condiciones.push('(p.nombre LIKE ? OR p.codigo LIKE ? OR p.descripcion LIKE ?)');
      valores.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [filas] = await pool.query(
      `${SELECT_PROYECTO} ${where} ORDER BY p.fecha_inicio DESC, p.id DESC LIMIT ? OFFSET ?`,
      [...valores, limite, offset]
    );
    const [conteo] = await pool.query(
      `SELECT COUNT(*) AS total FROM proyectos p ${where}`,
      valores
    );

    return { proyectos: filas, total: Number(conteo[0].total) };
  }

  static async crear(datos) {
    const [resultado] = await pool.query(
      `INSERT INTO proyectos
        (nombre, descripcion, tipo, municipio, departamento, latitud, longitud,
         fecha_inicio, fecha_fin, presupuesto, estado, responsable_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.nombre, datos.descripcion, datos.tipo, datos.municipio, datos.departamento,
        datos.latitud, datos.longitud, datos.fechaInicio, datos.fechaFin,
        datos.presupuesto, datos.estado, datos.responsableId
      ]
    );

    // El código se arma con el año de inicio y el id: PIA-2026-0007
    const id = resultado.insertId;
    const anio = String(datos.fechaInicio).slice(0, 4);
    const codigo = `PIA-${anio}-${String(id).padStart(4, '0')}`;
    await pool.query('UPDATE proyectos SET codigo = ? WHERE id = ?', [codigo, id]);

    return ProyectoModelo.buscarPorId(id);
  }

  static async actualizar(id, campos) {
    const { sqlSet, valores } = construirSet(campos, MAPA_COLUMNAS);
    await pool.query(`UPDATE proyectos SET ${sqlSet} WHERE id = ?`, [...valores, id]);
    return ProyectoModelo.buscarPorId(id);
  }

  static async eliminar(id) {
    // Las tablas hijas (impactos, actividades, monitoreos) tienen
    // ON DELETE CASCADE, entonces MySQL las borra solas.
    const [resultado] = await pool.query('DELETE FROM proyectos WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  }
}

module.exports = ProyectoModelo;
