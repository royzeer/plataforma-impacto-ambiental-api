/**
 * Modelo Usuario: todas las consultas SQL de la tabla "usuarios".
 *
 * Los modelos son clases con métodos estáticos (no hace falta crear
 * instancias). Los controladores nunca escriben SQL, siempre llaman a estos
 * métodos. Así, si mañana cambiamos de base de datos, solo tocamos esta capa.
 */
const { pool } = require('../config/db');
const { construirSet } = require('../utils/sql');

// Nunca devolvemos el password_hash en estas columnas.
const COLUMNAS_PUBLICAS = `
  id, nombre, correo, rol, activo,
  creado_en AS creadoEn, actualizado_en AS actualizadoEn
`;

const MAPA_COLUMNAS = {
  nombre: 'nombre',
  correo: 'correo',
  passwordHash: 'password_hash',
  rol: 'rol',
  activo: 'activo'
};

// MySQL guarda el booleano como 0/1, lo convertimos a true/false
function formatearUsuario(fila) {
  if (!fila) return null;
  return { ...fila, activo: Boolean(fila.activo) };
}

class UsuarioModelo {
  static async buscarPorId(id) {
    const [filas] = await pool.query(`SELECT ${COLUMNAS_PUBLICAS} FROM usuarios WHERE id = ?`, [id]);
    return formatearUsuario(filas[0]);
  }

  /** Esta sí trae el hash, porque se usa en el login para comparar la contraseña. */
  static async buscarPorCorreoConPassword(correo) {
    const [filas] = await pool.query(
      `SELECT ${COLUMNAS_PUBLICAS}, password_hash AS passwordHash FROM usuarios WHERE correo = ?`,
      [correo]
    );
    return formatearUsuario(filas[0]);
  }

  static async existeCorreo(correo, idExcluido = 0) {
    const [filas] = await pool.query(
      'SELECT id FROM usuarios WHERE correo = ? AND id <> ?',
      [correo, idExcluido]
    );
    return filas.length > 0;
  }

  static async crear({ nombre, correo, passwordHash, rol }) {
    const [resultado] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre, correo, passwordHash, rol]
    );
    return UsuarioModelo.buscarPorId(resultado.insertId);
  }

  static async listar({ rol, activo, buscar, limite, offset }) {
    const condiciones = [];
    const valores = [];

    if (rol) {
      condiciones.push('rol = ?');
      valores.push(rol);
    }
    if (activo !== undefined) {
      condiciones.push('activo = ?');
      valores.push(activo ? 1 : 0);
    }
    if (buscar) {
      condiciones.push('(nombre LIKE ? OR correo LIKE ?)');
      valores.push(`%${buscar}%`, `%${buscar}%`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [filas] = await pool.query(
      `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ${where} ORDER BY nombre ASC LIMIT ? OFFSET ?`,
      [...valores, limite, offset]
    );
    const [conteo] = await pool.query(`SELECT COUNT(*) AS total FROM usuarios ${where}`, valores);

    return { usuarios: filas.map(formatearUsuario), total: Number(conteo[0].total) };
  }

  static async actualizar(id, campos) {
    const { sqlSet, valores } = construirSet(campos, MAPA_COLUMNAS);
    await pool.query(`UPDATE usuarios SET ${sqlSet} WHERE id = ?`, [...valores, id]);
    return UsuarioModelo.buscarPorId(id);
  }
}

module.exports = UsuarioModelo;
