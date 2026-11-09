/**
 * Sistemas de prueba. Solo contienen enunciados: las iteraciones, los errores y
 * los radios espectrales siempre los calcula la aplicación.
 */
(function (MI) {
  'use strict';

  MI.datos.sistemasEjemplo = [
    {
      id: 'dos-variables',
      nombre: '2×2 con dominancia diagonal',
      descripcion: 'El sistema 2x + y = 5, x + 3y = 6. Cumple la condición suficiente.',
      variables: ['x', 'y'],
      A: [[2, 1], [1, 3]],
      b: [5, 6],
      solucionConocida: [9 / 5, 7 / 5],
    },
    {
      id: 'tres-dominante',
      nombre: '3×3 con dominancia diagonal',
      descripcion: 'Caso típico de clase. Es el ejemplo desarrollado en la teoría.',
      variables: ['x', 'y', 'z'],
      A: [[4, -1, 1], [4, -8, 1], [-2, 1, 5]],
      b: [7, -21, 15],
      solucionConocida: [2, 4, 3],
    },
    {
      id: 'cuatro-dominante',
      nombre: '4×4 con dominancia diagonal',
      descripcion: 'Un sistema más grande en el que ambos métodos convergen.',
      A: [[10, -1, 2, 0], [-1, 11, -1, 3], [2, -1, 10, -1], [0, 3, -1, 8]],
      b: [6, 25, -11, 15],
      solucionConocida: [1, 2, -1, 1],
    },
    {
      id: 'solo-gauss-seidel',
      nombre: 'Solo converge Gauss-Seidel',
      descripcion: 'Jacobi diverge (ρ > 1) y Gauss-Seidel converge. No hay dominancia diagonal.',
      A: [[2, -1, 1], [2, 2, 2], [-1, -1, 2]],
      b: [-1, 4, -5],
      solucionConocida: [1, 2, -1],
    },
    {
      id: 'solo-jacobi',
      nombre: 'Solo converge Jacobi',
      descripcion: 'Contraejemplo: Gauss-Seidel no siempre es mejor. Aquí diverge y Jacobi termina en 3 pasos.',
      A: [[1, 2, -2], [1, 1, 1], [2, 2, 1]],
      b: [1, 3, 5],
      solucionConocida: [1, 1, 1],
    },
    {
      id: 'definida-positiva',
      nombre: 'Simétrica definida positiva',
      descripcion: 'Sin dominancia diagonal. Gauss-Seidel tiene garantía y Jacobi diverge.',
      A: [[1, 0.6, 0.6], [0.6, 1, 0.6], [0.6, 0.6, 1]],
      b: [4, 4.4, 4.8],
      solucionConocida: [1, 2, 3],
    },
    {
      id: 'convergencia-lenta',
      nombre: 'Convergencia muy lenta',
      descripcion: 'ρ cercano a 1. Un cambio pequeño entre iteraciones no implica estar cerca de la solución.',
      variables: ['x', 'y'],
      A: [[1, -0.99], [-0.99, 1]],
      b: [0.01, 0.01],
      solucionConocida: [1, 1],
    },
    {
      id: 'reordenar-dominancia',
      nombre: 'Mal ordenado: ambos divergen',
      descripcion: 'Ambos divergen en este orden. Usa «Reordenar ecuaciones» para obtener dominancia.',
      variables: ['x', 'y'],
      A: [[1, 3], [4, 1]],
      b: [4, 5],
      solucionConocida: [1, 1],
    },
    {
      id: 'diagonal-cero',
      nombre: 'Diagonal con cero',
      descripcion: 'El validador lo rechaza. Reordenar las ecuaciones lo hace resoluble.',
      A: [[0, 2, 1], [4, 1, -1], [1, -1, 3]],
      b: [7, 3, 8],
      solucionConocida: [1, 2, 3],
    },
  ];
})(window.MetodosIterativos);
