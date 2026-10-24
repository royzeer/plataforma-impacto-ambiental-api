/**
 * Pruebas unitarias del validador propio y de la paginación.
 */
const {
  validar,
  validarOFallar,
  obtenerIdValido,
  limpiarTexto,
  esFechaValida
} = require('../../src/utils/validaciones');
const { obtenerPaginacion, construirMetaPaginacion } = require('../../src/utils/paginacion');
const { ErrorApi } = require('../../src/utils/respuesta');

const REGLAS_PROYECTO = {
  nombre: { requerido: true, tipo: 'texto', min: 3, max: 150 },
  correo: { tipo: 'correo' },
  presupuesto: { tipo: 'numero', min: 0 },
  fechaInicio: { requerido: true, tipo: 'fecha' },
  estado: { opciones: ['planeacion', 'ejecucion', 'finalizado'] }
};

describe('validar', () => {
  test('no devuelve errores cuando los datos son correctos', () => {
    const errores = validar(
      { nombre: 'Planta de tratamiento', fechaInicio: '2026-03-15', estado: 'planeacion' },
      REGLAS_PROYECTO
    );
    expect(errores).toEqual([]);
  });

  test('marca los campos obligatorios que faltan', () => {
    const errores = validar({}, REGLAS_PROYECTO);
    const campos = errores.map((e) => e.campo);
    expect(campos).toEqual(expect.arrayContaining(['nombre', 'fechaInicio']));
  });

  test('valida longitud, correo, números y opciones', () => {
    const errores = validar(
      {
        nombre: 'ab',
        correo: 'no-es-correo',
        presupuesto: -5,
        fechaInicio: '2026-03-15',
        estado: 'inventado'
      },
      REGLAS_PROYECTO
    );
    expect(errores.map((e) => e.campo).sort()).toEqual(['correo', 'estado', 'nombre', 'presupuesto']);
  });

  test('en modo parcial solo valida los campos que llegan', () => {
    expect(validar({ estado: 'ejecucion' }, REGLAS_PROYECTO, true)).toEqual([]);
  });
});

describe('validarOFallar', () => {
  test('lanza un ErrorApi 400 con la lista de errores', () => {
    expect.assertions(3);
    try {
      validarOFallar({}, REGLAS_PROYECTO);
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorApi);
      expect(error.codigoEstado).toBe(400);
      expect(error.errores.length).toBeGreaterThan(0);
    }
  });
});

describe('esFechaValida', () => {
  test('acepta fechas reales en formato AAAA-MM-DD', () => {
    expect(esFechaValida('2026-02-28')).toBe(true);
  });

  test('rechaza fechas imposibles o con otro formato', () => {
    expect(esFechaValida('2026-02-31')).toBe(false);
    expect(esFechaValida('15/03/2026')).toBe(false);
    expect(esFechaValida(20260315)).toBe(false);
  });
});

describe('obtenerIdValido y limpiarTexto', () => {
  test('convierte el :id de la URL a número', () => {
    expect(obtenerIdValido('12')).toBe(12);
  });

  test('rechaza ids que no son enteros positivos', () => {
    ['0', '-3', 'abc', '1.5'].forEach((valor) => {
      expect(() => obtenerIdValido(valor)).toThrow(ErrorApi);
    });
  });

  test('quita espacios sobrantes solo a los textos', () => {
    expect(limpiarTexto('  hola  ')).toBe('hola');
    expect(limpiarTexto(5)).toBe(5);
  });
});

describe('paginación', () => {
  test('usa página 1 y límite 10 por defecto', () => {
    expect(obtenerPaginacion({})).toEqual({ pagina: 1, limite: 10, offset: 0 });
  });

  test('calcula el offset y pone un tope de 50 por página', () => {
    expect(obtenerPaginacion({ pagina: '3', limite: '20' })).toEqual({ pagina: 3, limite: 20, offset: 40 });
    expect(obtenerPaginacion({ limite: '1000' }).limite).toBe(50);
  });

  test('arma los metadatos con el total de páginas', () => {
    expect(construirMetaPaginacion(45, 2, 10)).toEqual({
      total: 45,
      pagina: 2,
      limite: 10,
      totalPaginas: 5
    });
    expect(construirMetaPaginacion(0, 1, 10).totalPaginas).toBe(1);
  });
});
