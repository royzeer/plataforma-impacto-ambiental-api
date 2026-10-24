/**
 * Pruebas unitarias de la matriz de impacto ambiental.
 * No necesitan base de datos: solo prueban la lógica de cálculo.
 */
const {
  calcularImportancia,
  clasificarNivel,
  evaluarCumplimiento
} = require('../../src/utils/matrizImpacto');

describe('calcularImportancia', () => {
  test('multiplica magnitud por probabilidad', () => {
    expect(calcularImportancia(8, 9)).toBe(72);
  });

  test('acepta valores que llegan como texto desde el body', () => {
    expect(calcularImportancia('5', '4')).toBe(20);
  });

  test('el rango va de 1 a 100', () => {
    expect(calcularImportancia(1, 1)).toBe(1);
    expect(calcularImportancia(10, 10)).toBe(100);
  });
});

describe('clasificarNivel', () => {
  test.each([
    [1, 'bajo'],
    [20, 'bajo'],
    [21, 'moderado'],
    [40, 'moderado'],
    [41, 'alto'],
    [70, 'alto'],
    [71, 'critico'],
    [100, 'critico']
  ])('importancia %i -> %s', (importancia, nivelEsperado) => {
    expect(clasificarNivel(importancia)).toBe(nivelEsperado);
  });

  test('caso real: vertimiento con magnitud 8 y probabilidad 9 es crítico', () => {
    expect(clasificarNivel(calcularImportancia(8, 9))).toBe('critico');
  });
});

describe('evaluarCumplimiento', () => {
  test('límite máximo (ej. DBO5): cumple si el valor es menor o igual', () => {
    expect(evaluarCumplimiento(30, 60)).toBe(true);
    expect(evaluarCumplimiento(60, 60)).toBe(true);
    expect(evaluarCumplimiento(85, 60)).toBe(false);
  });

  test('límite mínimo (ej. oxígeno disuelto): cumple si el valor es mayor o igual', () => {
    expect(evaluarCumplimiento(5.2, 4, 'minimo')).toBe(true);
    expect(evaluarCumplimiento(3.1, 4, 'minimo')).toBe(false);
  });

  test('devuelve null cuando no hay límite para comparar', () => {
    expect(evaluarCumplimiento(7, null)).toBeNull();
    expect(evaluarCumplimiento(7, undefined)).toBeNull();
    expect(evaluarCumplimiento(7, '')).toBeNull();
  });
});
