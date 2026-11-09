/**
 * Busca un orden de las ecuaciones que mejore la diagonal.
 *
 * Intercambiar ecuaciones no altera la solución del sistema, pero sí cambia la
 * matriz de iteración y, por tanto, el comportamiento de ambos métodos.
 */
(function (MI) {
  'use strict';

  const TIPO = Object.freeze({
    SIN_CAMBIOS: 'sin-cambios',
    DOMINANCIA_ESTRICTA: 'dominancia-estricta',
    DIAGONAL_NO_NULA: 'diagonal-no-nula',
    IMPOSIBLE: 'imposible',
  });

  /** Columna en la que la fila es estrictamente dominante, o -1 si no existe. */
  function columnaDominante(fila) {
    const sumaTotal = fila.reduce((s, v) => s + Math.abs(v), 0);
    for (let j = 0; j < fila.length; j++) {
      const absoluto = Math.abs(fila[j]);
      if (absoluto > sumaTotal - absoluto) return j;
    }
    return -1;
  }

  function buscarPermutacionDominante(A) {
    const n = A.length;
    const permutacion = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const columna = columnaDominante(A[i]);
      if (columna === -1 || permutacion[columna] !== -1) return null;
      permutacion[columna] = i;
    }
    return permutacion;
  }

  /**
   * Emparejamiento bipartito (caminos aumentantes de Kuhn) entre filas y
   * columnas con coeficiente no nulo. Cada fila prueba primero sus columnas de
   * mayor peso relativo, para favorecer una diagonal fuerte.
   */
  function buscarPermutacionDiagonalNoNula(A) {
    const n = A.length;
    const filaDeColumna = new Array(n).fill(-1);

    const candidatas = A.map((fila) => {
      const total = fila.reduce((s, v) => s + Math.abs(v), 0) || 1;
      return fila
        .map((coef, columna) => ({ columna, peso: Math.abs(coef) / total }))
        .filter((c) => c.peso > 0)
        .sort((a, b) => b.peso - a.peso)
        .map((c) => c.columna);
    });

    function asignar(fila, visitadas) {
      for (const columna of candidatas[fila]) {
        if (visitadas[columna]) continue;
        visitadas[columna] = true;
        if (filaDeColumna[columna] === -1 || asignar(filaDeColumna[columna], visitadas)) {
          filaDeColumna[columna] = fila;
          return true;
        }
      }
      return false;
    }

    for (let fila = 0; fila < n; fila++) {
      if (!asignar(fila, new Array(n).fill(false))) return null;
    }
    return filaDeColumna;
  }

  /**
   * @returns {{tipo:string, permutacion:number[]|null}} `permutacion[i]` es la
   * fila original que debe ocupar la posición i.
   */
  function buscarReordenamiento(A) {
    const esIdentidad = (p) => p.every((fila, i) => fila === i);

    const dominante = buscarPermutacionDominante(A);
    if (dominante) {
      return { tipo: esIdentidad(dominante) ? TIPO.SIN_CAMBIOS : TIPO.DOMINANCIA_ESTRICTA, permutacion: dominante };
    }

    const diagonalNoNula = A.every((fila, i) => fila[i] !== 0);
    if (diagonalNoNula) return { tipo: TIPO.SIN_CAMBIOS, permutacion: A.map((_, i) => i) };

    const noNula = buscarPermutacionDiagonalNoNula(A);
    if (noNula) return { tipo: TIPO.DIAGONAL_NO_NULA, permutacion: noNula };
    return { tipo: TIPO.IMPOSIBLE, permutacion: null };
  }

  MI.matematicas.reordenamientoFilas = { buscarReordenamiento, TIPO };
})(window.MetodosIterativos);
