/**
 * Express 4 no atrapa solo los errores de las funciones async, entonces
 * si un controlador lanza un error dentro de un await la petición se queda
 * colgada. Este "envoltorio" le pasa el error a next() automáticamente.
 *
 * Uso: router.get('/', envolverAsync(miControlador));
 */
function envolverAsync(controlador) {
  return (req, res, next) => {
    Promise.resolve(controlador(req, res, next)).catch(next);
  };
}

module.exports = envolverAsync;
