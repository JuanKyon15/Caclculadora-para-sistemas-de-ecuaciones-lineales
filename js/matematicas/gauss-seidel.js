/**
 * Método de Gauss-Seidel.
 *
 *     x_i^(k+1) = ( b_i - Σ_{j<i} a_ij · x_j^(k+1) - Σ_{j>i} a_ij · x_j^(k) ) / a_ii
 *
 * Cada variable se sobrescribe en cuanto se calcula, de modo que las ecuaciones
 * siguientes ya usan su valor nuevo. Por eso el orden de las ecuaciones sí
 * influye en el resultado.
 */
(function (MI) {
  'use strict';

  const { despejarVariable, ORIGEN } = MI.matematicas.despeje;

  function calcularIteracion(A, b, xAnterior, conDetalle = false, decimales = null) {
    const n = b.length;
    const x = xAnterior.slice();
    const detalle = conDetalle ? [] : null;

    for (let i = 0; i < n; i++) {
      const despeje = despejarVariable(
        A,
        b,
        i,
        (j) => x[j],
        (j) => (j < i ? ORIGEN.ACTUALIZADO : ORIGEN.ANTERIOR),
        conDetalle,
        decimales
      );
      x[i] = despeje.valor; // Actualización inmediata: las ecuaciones siguientes usan este valor, ya redondeado.
      if (conDetalle) detalle.push(despeje.detalle);
    }
    return { x, detalle };
  }

  /**
   * Matriz de iteración T_G = -(D + L)⁻¹ U.
   * Cada columna se obtiene por sustitución hacia adelante, sin invertir D + L.
   */
  function construirMatrizIteracion(A) {
    const n = A.length;
    const T = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let columna = 0; columna < n; columna++) {
      for (let i = 0; i < n; i++) {
        let suma = i < columna ? -A[i][columna] : 0; // Entrada de -U.
        for (let j = 0; j < i; j++) suma -= A[i][j] * T[j][columna];
        T[i][columna] = suma / A[i][i];
      }
    }
    return T;
  }

  MI.matematicas.gaussSeidel = {
    id: 'gauss-seidel',
    nombre: 'Gauss-Seidel',
    calcularIteracion,
    construirMatrizIteracion,
  };
})(window.MetodosIterativos);
