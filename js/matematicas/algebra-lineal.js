/**
 * Operaciones de álgebra lineal usadas por los métodos y por el análisis.
 * Módulo puro: no accede al DOM ni guarda estado.
 */
(function (MI) {
  'use strict';

  const EPSILON_MAQUINA = Number.EPSILON;

  function normaInfinito(vector) {
    let maximo = 0;
    for (const componente of vector) {
      const absoluto = Math.abs(componente);
      if (absoluto > maximo) maximo = absoluto;
    }
    return maximo;
  }

  function normaEuclidiana(vector) {
    // Math.hypot evita el desbordamiento intermedio al elevar al cuadrado.
    return Math.hypot(...vector);
  }

  function normaUno(vector) {
    return vector.reduce((suma, componente) => suma + Math.abs(componente), 0);
  }

  /** Norma p. Se escala por el máximo para no desbordar al elevar a la potencia p. */
  function normaP(vector, p) {
    const maximo = normaInfinito(vector);
    if (maximo === 0) return 0;
    const suma = vector.reduce((s, componente) => s + Math.pow(Math.abs(componente) / maximo, p), 0);
    return maximo * Math.pow(suma, 1 / p);
  }

  /**
   * Redondea a una cantidad de decimales, con empates alejándose de cero, como
   * en el cálculo a mano: 3.9484375 con 6 decimales da 3.948438.
   *
   * Primero se limita a 15 cifras significativas para quitar el ruido binario
   * (3.9484374999999996 es en realidad 3.9484375). Con null no se redondea.
   */
  function redondearDecimales(valor, decimales) {
    if (decimales === null || !Number.isFinite(valor)) return valor;
    const texto = String(Math.abs(Number(valor.toPrecision(15))));
    const escalado = texto.includes('e') ? NaN : Math.round(Number(`${texto}e${decimales}`));
    if (!Number.isSafeInteger(escalado)) return Number(valor.toFixed(decimales));
    const redondeado = Math.sign(valor) * Number(`${escalado}e-${decimales}`);
    return redondeado === 0 ? 0 : redondeado;
  }

  function restarVectores(a, b) {
    return a.map((valor, indice) => valor - b[indice]);
  }

  function multiplicarMatrizVector(A, x) {
    return A.map((fila) => fila.reduce((suma, coef, j) => suma + coef * x[j], 0));
  }

  function multiplicarMatrices(A, B) {
    const columnas = B[0].length;
    return A.map((fila) => {
      const resultado = new Array(columnas).fill(0);
      for (let j = 0; j < columnas; j++) {
        for (let k = 0; k < fila.length; k++) resultado[j] += fila[k] * B[k][j];
      }
      return resultado;
    });
  }

  /** Vector residuo r = b - A·x. */
  function calcularResiduo(A, b, x) {
    return restarVectores(b, multiplicarMatrizVector(A, x));
  }

  function copiarMatriz(A) {
    return A.map((fila) => fila.slice());
  }

  function trasponerMatriz(A) {
    return A[0].map((_, j) => A.map((fila) => fila[j]));
  }

  /** Norma inducida infinito: máxima suma absoluta por filas. */
  function normaInfinitoMatriz(A) {
    return Math.max(...A.map((fila) => fila.reduce((s, v) => s + Math.abs(v), 0)));
  }

  /**
   * Resuelve A·x = b por eliminación gaussiana con pivoteo parcial.
   *
   * Es un método directo, independiente de Jacobi y Gauss-Seidel, y sirve como
   * referencia para medir el error real de las aproximaciones. También compara
   * rango(A) con rango(A|b) para distinguir sistemas sin solución de sistemas
   * con infinitas soluciones.
   */
  function resolverPorEliminacion(A, b) {
    const n = A.length;
    const aumentada = A.map((fila, i) => [...fila, b[i]]);
    const escalaA = normaInfinitoMatriz(A) || 1;
    const toleranciaPivote = 8 * n * EPSILON_MAQUINA * escalaA;
    const escalaB = Math.max(normaInfinito(b), escalaA);
    const toleranciaB = 8 * n * EPSILON_MAQUINA * escalaB;

    let filaPivote = 0;
    for (let columna = 0; columna < n && filaPivote < n; columna++) {
      let mejorFila = filaPivote;
      for (let f = filaPivote + 1; f < n; f++) {
        if (Math.abs(aumentada[f][columna]) > Math.abs(aumentada[mejorFila][columna])) mejorFila = f;
      }
      if (Math.abs(aumentada[mejorFila][columna]) <= toleranciaPivote) continue;

      [aumentada[filaPivote], aumentada[mejorFila]] = [aumentada[mejorFila], aumentada[filaPivote]];
      for (let f = filaPivote + 1; f < n; f++) {
        const factor = aumentada[f][columna] / aumentada[filaPivote][columna];
        aumentada[f][columna] = 0;
        for (let c = columna + 1; c <= n; c++) aumentada[f][c] -= factor * aumentada[filaPivote][c];
      }
      filaPivote++;
    }

    const rango = filaPivote;
    if (rango < n) {
      let compatible = true;
      for (let f = rango; f < n; f++) {
        if (Math.abs(aumentada[f][n]) > toleranciaB) compatible = false;
      }
      return { singular: true, compatible, rango, solucion: null };
    }

    const solucion = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let suma = aumentada[i][n];
      for (let j = i + 1; j < n; j++) suma -= aumentada[i][j] * solucion[j];
      solucion[i] = suma / aumentada[i][i];
    }
    return { singular: false, compatible: true, rango, solucion };
  }

  MI.matematicas.algebraLineal = {
    normaInfinito,
    normaEuclidiana,
    normaUno,
    normaP,
    redondearDecimales,
    restarVectores,
    multiplicarMatrizVector,
    multiplicarMatrices,
    calcularResiduo,
    copiarMatriz,
    trasponerMatriz,
    normaInfinitoMatriz,
    resolverPorEliminacion,
  };
})(window.MetodosIterativos);
