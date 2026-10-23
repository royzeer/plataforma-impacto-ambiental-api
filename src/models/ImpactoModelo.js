/**
 * Modelo Impacto: consultas de la tabla "impactos_ambientales".
 */
const { pool } = require('../config/db');
const { construirSet } = require('../utils/sql');

const SELECT_IMPACTO = `
  SELECT
    id, proyecto_id AS proyectoId, componente, descripcion, naturaleza,
    magnitud, probabilidad, importancia, nivel,
    medida_manejo AS medidaManejo,
    creado_en AS creadoEn, actualizado_en AS actualizadoEn
  FROM impactos_ambientales
`;

const MAPA_COLUMNAS = {
  componente: 'componente',
  descripcion: 'descripcion',
  naturaleza: 'naturaleza',
  magnitud: 'magnitud',
  probabilidad: 'probabilidad',
  importancia: 'importancia',
  nivel: 'nivel',
  medidaManejo: 'medida_manejo'
};

class ImpactoModelo {
  static async buscarPorId(id) {
    const [filas] = await pool.query(`${SELECT_IMPACTO} WHERE id = ?`, [id]);
    return filas[0] || null;
  }

  static async listarPorProyecto(proyectoId, { componente, nivel, naturaleza }) {
    const condiciones = ['proyecto_id = ?'];
    const valores = [proyectoId];

    if (componente) {
      condiciones.push('componente = ?');
      valores.push(componente);
    }
    if (nivel) {
      condiciones.push('nivel = ?');
      valores.push(nivel);
    }
    if (naturaleza) {
      condiciones.push('naturaleza = ?');
      valores.push(naturaleza);
    }

    // Los más importantes primero, que son los que hay que atender ya
    const [filas] = await pool.query(
      `${SELECT_IMPACTO} WHERE ${condiciones.join(' AND ')} ORDER BY importancia DESC, id ASC`,
      valores
    );
    return filas;
  }

  static async crear(datos) {
    const [resultado] = await pool.query(
      `INSERT INTO impactos_ambientales
        (proyecto_id, componente, descripcion, naturaleza, magnitud,
         probabilidad, importancia, nivel, medida_manejo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.proyectoId, datos.componente, datos.descripcion, datos.naturaleza,
        datos.magnitud, datos.probabilidad, datos.importancia, datos.nivel, datos.medidaManejo
      ]
    );
    return ImpactoModelo.buscarPorId(resultado.insertId);
  }

  static async actualizar(id, campos) {
    const { sqlSet, valores } = construirSet(campos, MAPA_COLUMNAS);
    await pool.query(`UPDATE impactos_ambientales SET ${sqlSet} WHERE id = ?`, [...valores, id]);
    return ImpactoModelo.buscarPorId(id);
  }

  static async eliminar(id) {
    const [resultado] = await pool.query('DELETE FROM impactos_ambientales WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  }
}

module.exports = ImpactoModelo;
