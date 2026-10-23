/**
 * Formato único de respuesta para toda la API.
 *
 * Decidimos que TODAS las respuestas tengan la misma forma para que en el
 * front (React) no tengamos que adivinar dónde viene cada cosa:
 *
 *   { ok: true,  mensaje: '...', datos: {...} }          -> todo bien
 *   { ok: false, mensaje: '...', errores: [...] }         -> algo falló
 */

function responderExito(res, codigoEstado, mensaje, datos = null, extra = {}) {
  const cuerpo = { ok: true, mensaje };
  if (datos !== null) cuerpo.datos = datos;
  return res.status(codigoEstado).json({ ...cuerpo, ...extra });
}

/**
 * Error "controlado" de la API. Lo lanzamos desde los controladores
 * (throw new ErrorApi(404, 'Proyecto no encontrado')) y el middleware
 * manejadorErrores se encarga de convertirlo en una respuesta JSON.
 */
class ErrorApi extends Error {
  constructor(codigoEstado, mensaje, errores = null) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigoEstado = codigoEstado;
    this.errores = errores;
  }
}

module.exports = { responderExito, ErrorApi };
