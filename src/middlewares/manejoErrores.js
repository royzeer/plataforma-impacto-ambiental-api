/**
 * Manejo centralizado de errores.
 *
 * En vez de poner try/catch con res.status(500) en cada controlador,
 * todos los errores llegan aquí con next(error) y este middleware decide
 * qué código HTTP y qué mensaje devolver.
 */
const { ErrorApi } = require('../utils/respuesta');

// Se ejecuta cuando ninguna ruta coincidió con la URL pedida.
function rutaNoEncontrada(req, res, next) {
  next(new ErrorApi(404, `La ruta ${req.method} ${req.originalUrl} no existe en la API`));
}

// eslint-disable-next-line no-unused-vars
function manejadorErrores(error, req, res, next) {
  // 1. Errores que lanzamos nosotros a propósito
  if (error instanceof ErrorApi) {
    const cuerpo = { ok: false, mensaje: error.message };
    if (error.errores) cuerpo.errores = error.errores;
    return res.status(error.codigoEstado).json(cuerpo);
  }

  // 2. JSON mal escrito en el body (por ejemplo, una coma de más en Postman)
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, mensaje: 'El cuerpo de la petición no es un JSON válido' });
  }

  // 3. Errores conocidos de MySQL
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ ok: false, mensaje: 'Ya existe un registro con ese valor único' });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ ok: false, mensaje: 'El registro relacionado no existe' });
  }

  // 4. Cualquier otra cosa: error interno. Lo mostramos en consola para
  //    poder depurarlo, pero al cliente no le mandamos detalles técnicos.
  console.error('[ERROR NO CONTROLADO]', error);
  return res.status(500).json({ ok: false, mensaje: 'Ocurrió un error interno en el servidor' });
}

module.exports = { rutaNoEncontrada, manejadorErrores };
