/**
 * Despeje de una variable a partir de su ecuación:
 *
 *     x_i = ( b_i - Σ_{j≠i} a_ij · x_j ) / a_ii
 *
 * Jacobi y Gauss-Seidel comparten esta operación. Solo difieren en qué valor
 * de x_j utilizan, por eso cada método entrega su propia función de lectura.
 */
(function (MI) {
  'use strict';

  const { redondearDecimales } = MI.matematicas.algebraLineal;

  const ORIGEN = Object.freeze({ ANTERIOR: 'anterior', ACTUALIZADO: 'actualizado' });

  /**
   * @param {number[][]} A Matriz de coeficientes.
   * @param {number[]} b Términos independientes.
   * @param {number} i Índice de la variable que se despeja.
   * @param {(j:number)=>number} leerValor Devuelve el valor de x_j que usa el método.
   * @param {(j:number)=>string} leerOrigen Indica si x_j es anterior o actualizado.
   * @param {boolean} conDetalle Si es true, conserva cada término para explicarlo.
   * @param {number|null} decimales Redondeo interno de la variable despejada.
   */
  function despejarVariable(A, b, i, leerValor, leerOrigen, conDetalle, decimales = null) {
    let sumaTerminos = 0;
    const terminos = conDetalle ? [] : null;

    for (let j = 0; j < A.length; j++) {
      if (j === i) continue;
      const valor = leerValor(j);
      sumaTerminos += A[i][j] * valor;
      if (conDetalle) terminos.push({ j, coeficiente: A[i][j], valor, origen: leerOrigen(j) });
    }

    const numerador = b[i] - sumaTerminos;
    const valor = redondearDecimales(numerador / A[i][i], decimales);
    if (!conDetalle) return { valor };
    return { valor, detalle: { i, terminoIndependiente: b[i], terminos, numerador, diagonal: A[i][i], resultado: valor } };
  }

  MI.matematicas.despeje = { despejarVariable, ORIGEN };
})(window.MetodosIterativos);
