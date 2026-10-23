/**
 * Ayudas pequeñas para armar consultas SQL sin repetir código.
 */

/**
 * Arma la parte "SET columna = ?, columna2 = ?" de un UPDATE usando solo
 * los campos que llegaron en la petición.
 *
 * @param {object} campos - datos que llegan del controlador (en camelCase)
 * @param {object} mapaColumnas - { nombreEnJs: 'nombre_en_bd' }
 *
 * Solo se permiten las columnas que estén en el mapa, así nadie puede
 * mandar un campo raro como "rol" o "id" y modificarlo por la ruta equivocada.
 */
function construirSet(campos, mapaColumnas) {
  const partes = [];
  const valores = [];

  Object.entries(mapaColumnas).forEach(([campoJs, columnaBd]) => {
    if (campos[campoJs] !== undefined) {
      partes.push(`${columnaBd} = ?`);
      valores.push(campos[campoJs]);
    }
  });

  // Guardamos siempre cuándo se modificó el registro
  partes.push('actualizado_en = ?');
  valores.push(fechaHoraActual());

  return { sqlSet: partes.join(', '), valores };
}

/** Fecha y hora en formato DATETIME de MySQL: 'YYYY-MM-DD HH:MM:SS' */
function fechaHoraActual() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { construirSet, fechaHoraActual };
