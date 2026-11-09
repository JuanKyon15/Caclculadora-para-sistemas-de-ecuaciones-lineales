/**
 * Método de Jacobi.
 *
 *     x_i^(k+1) = ( b_i - Σ_{j≠i} a_ij · x_j^(k) ) / a_ii
 *
 * Todas las variables de la iteración k+1 se calculan únicamente con valores
 * de la iteración k. El orden de las ecuaciones dentro de la iteración no
 * influye en el resultado.
 */
(function (MI) {
  'use strict';

  const { despejarVariable, ORIGEN } = MI.matematicas.despeje;

  function calcularIteracion(A, b, xAnterior, conDetalle = false, decimales = null) {
    const n = b.length;
    const xNuevo = new Array(n);
    const detalle = conDetalle ? [] : null;

    for (let i = 0; i < n; i++) {
      const despeje = despejarVariable(A, b, i, (j) => xAnterior[j], () => ORIGEN.ANTERIOR, conDetalle, decimales);
      xNuevo[i] = despeje.valor;
      if (conDetalle) detalle.push(despeje.detalle);
    }
    return { x: xNuevo, detalle };
  }

  /** Matriz de iteración T_J = -D⁻¹(L + U). */
  function construirMatrizIteracion(A) {
    return A.map((fila, i) => fila.map((coef, j) => (i === j ? 0 : -coef / A[i][i])));
  }

  MI.matematicas.jacobi = {
    id: 'jacobi',
    nombre: 'Jacobi',
    calcularIteracion,
    construirMatrizIteracion,
  };
})(window.MetodosIterativos);
