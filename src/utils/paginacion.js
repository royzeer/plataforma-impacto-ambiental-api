/**
 * Lee ?pagina=2&limite=10 de la URL y calcula el OFFSET para el SQL.
 * Ponemos un máximo de 50 por página para que nadie pida 10.000 filas de golpe.
 */
function obtenerPaginacion(query) {
  let pagina = parseInt(query.pagina, 10);
  let limite = parseInt(query.limite, 10);

  if (Number.isNaN(pagina) || pagina < 1) pagina = 1;
  if (Number.isNaN(limite) || limite < 1) limite = 10;
  if (limite > 50) limite = 50;

  return { pagina, limite, offset: (pagina - 1) * limite };
}

function construirMetaPaginacion(total, pagina, limite) {
  return {
    total,
    pagina,
    limite,
    totalPaginas: Math.max(1, Math.ceil(total / limite))
  };
}

module.exports = { obtenerPaginacion, construirMetaPaginacion };
