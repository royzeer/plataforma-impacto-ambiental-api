/**
 * Conexión a MySQL.
 *
 * Usamos un "pool" de conexiones en vez de una sola conexión porque así
 * varias peticiones pueden consultar la base de datos al mismo tiempo sin
 * esperar a que la anterior termine.
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'impacto_ambiental_db',
  waitForConnections: true,
  connectionLimit: 10,
  // Las fechas llegan como texto 'YYYY-MM-DD' y no como objeto Date,
  // así el front recibe exactamente lo que se guardó (sin líos de zona horaria).
  dateStrings: true,
  // Los DECIMAL llegan como número y no como string.
  decimalNumbers: true
});

/**
 * Hace un SELECT 1 para saber si MySQL responde.
 * Se llama al arrancar el servidor y en GET /api/salud.
 */
async function probarConexion() {
  const [filas] = await pool.query('SELECT 1 AS ok');
  return filas[0].ok === 1;
}

module.exports = { pool, probarConexion };
