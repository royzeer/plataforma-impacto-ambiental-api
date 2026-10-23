/**
 * Devuelve la fecha de hoy en formato AAAA-MM-DD usando la hora de Colombia
 * (UTC-5). Si usáramos toISOString() directo, después de las 7 p.m. nos
 * daría la fecha de mañana porque esa función trabaja en UTC.
 */
function obtenerFechaHoy() {
  const ahoraColombia = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return ahoraColombia.toISOString().slice(0, 10);
}

module.exports = { obtenerFechaHoy };
