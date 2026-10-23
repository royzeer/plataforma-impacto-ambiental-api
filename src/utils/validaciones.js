/**
 * Validador sencillo hecho por nosotros.
 *
 * Al principio pensamos usar express-validator, pero para lo que
 * necesitábamos era más fácil (y lo entendemos mejor) tener una función
 * propia que recibe el cuerpo de la petición y un objeto de reglas.
 *
 * Ejemplo de reglas:
 *   {
 *     nombre: { requerido: true, tipo: 'texto', min: 3, max: 150 },
 *     estado: { opciones: ['planeacion', 'ejecucion'] }
 *   }
 *
 * Devuelve un arreglo de errores: [{ campo, mensaje }]. Si está vacío,
 * todo está bien.
 */
const { ErrorApi } = require('./respuesta');

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(valor) {
  if (typeof valor !== 'string' || !REGEX_FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  // Esto evita que pasen fechas como 2026-02-31
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
}

function estaVacio(valor) {
  return valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '');
}

function validarCampo(campo, valor, regla) {
  if (estaVacio(valor)) {
    return regla.requerido ? `El campo ${campo} es obligatorio` : null;
  }

  switch (regla.tipo) {
    case 'texto':
      if (typeof valor !== 'string') return `El campo ${campo} debe ser texto`;
      if (regla.min && valor.trim().length < regla.min) {
        return `El campo ${campo} debe tener mínimo ${regla.min} caracteres`;
      }
      if (regla.max && valor.trim().length > regla.max) {
        return `El campo ${campo} debe tener máximo ${regla.max} caracteres`;
      }
      break;
    case 'correo':
      if (typeof valor !== 'string' || !REGEX_CORREO.test(valor)) {
        return `El campo ${campo} debe ser un correo válido`;
      }
      break;
    case 'numero':
    case 'entero': {
      const numero = Number(valor);
      if (typeof valor === 'boolean' || Number.isNaN(numero)) return `El campo ${campo} debe ser numérico`;
      if (regla.tipo === 'entero' && !Number.isInteger(numero)) {
        return `El campo ${campo} debe ser un número entero`;
      }
      if (regla.min !== undefined && numero < regla.min) {
        return `El campo ${campo} debe ser mayor o igual a ${regla.min}`;
      }
      if (regla.max !== undefined && numero > regla.max) {
        return `El campo ${campo} debe ser menor o igual a ${regla.max}`;
      }
      break;
    }
    case 'fecha':
      if (!esFechaValida(valor)) return `El campo ${campo} debe ser una fecha válida con formato AAAA-MM-DD`;
      break;
    default:
      break;
  }

  if (regla.opciones && !regla.opciones.includes(valor)) {
    return `El campo ${campo} solo acepta: ${regla.opciones.join(', ')}`;
  }
  return null;
}

/**
 * @param {object} cuerpo  - normalmente req.body
 * @param {object} reglas  - reglas por campo
 * @param {boolean} parcial - true en las actualizaciones: solo se validan
 *                           los campos que vienen, ninguno es obligatorio.
 */
function validar(cuerpo, reglas, parcial = false) {
  const errores = [];
  const datos = cuerpo || {};

  Object.entries(reglas).forEach(([campo, regla]) => {
    if (parcial && datos[campo] === undefined) return;
    const reglaAplicada = parcial ? { ...regla, requerido: false } : regla;
    const mensaje = validarCampo(campo, datos[campo], reglaAplicada);
    if (mensaje) errores.push({ campo, mensaje });
  });

  return errores;
}

/** Igual que validar(), pero lanza un 400 si hay errores. */
function validarOFallar(cuerpo, reglas, parcial = false) {
  const errores = validar(cuerpo, reglas, parcial);
  if (errores.length > 0) {
    throw new ErrorApi(400, 'Hay datos inválidos en la petición', errores);
  }
}

/** Revisa que un :id de la URL sea un entero positivo. */
function obtenerIdValido(valor, nombre = 'id') {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorApi(400, `El parámetro ${nombre} debe ser un número entero positivo`);
  }
  return id;
}

/** Limpia espacios de los textos para no guardar "  hola  ". */
function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : valor;
}

module.exports = {
  validar,
  validarOFallar,
  obtenerIdValido,
  limpiarTexto,
  esFechaValida
};
