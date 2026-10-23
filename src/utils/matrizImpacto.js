/**
 * Cálculo de la importancia de un impacto ambiental.
 *
 * En la carrera de Ingeniería Ambiental se usan matrices como la de Conesa,
 * que tienen muchos atributos (intensidad, extensión, momento, persistencia...).
 * Para la plataforma hicimos una versión simplificada, fácil de entender
 * para cualquier usuario:
 *
 *   importancia = magnitud (1-10) x probabilidad (1-10)   ->  1 a 100
 *
 * Y con ese número lo clasificamos en un nivel:
 *   1  - 20  -> bajo
 *   21 - 40  -> moderado
 *   41 - 70  -> alto
 *   71 - 100 -> critico
 *
 * Ejemplo: vertimiento de aguas residuales con magnitud 8 y probabilidad 9
 *          -> 8 x 9 = 72 -> crítico.
 */

const RANGOS_NIVEL = [
  { hasta: 20, nivel: 'bajo' },
  { hasta: 40, nivel: 'moderado' },
  { hasta: 70, nivel: 'alto' },
  { hasta: 100, nivel: 'critico' }
];

function calcularImportancia(magnitud, probabilidad) {
  return Number(magnitud) * Number(probabilidad);
}

function clasificarNivel(importancia) {
  const rango = RANGOS_NIVEL.find((r) => importancia <= r.hasta);
  return rango ? rango.nivel : 'critico';
}

/**
 * Dice si una medición cumple con la norma.
 * Devuelve null si no hay límite con qué comparar.
 */
function evaluarCumplimiento(valor, limitePermisible, tipoLimite = 'maximo') {
  if (limitePermisible === null || limitePermisible === undefined || limitePermisible === '') {
    return null;
  }
  const medido = Number(valor);
  const limite = Number(limitePermisible);
  return tipoLimite === 'minimo' ? medido >= limite : medido <= limite;
}

module.exports = { calcularImportancia, clasificarNivel, evaluarCumplimiento };
