/**
 * Análisis teórico de convergencia, previo a la ejecución.
 *
 * Distingue tres niveles de información que no deben confundirse:
 *
 *  1. Condiciones suficientes (dominancia diagonal, matriz definida positiva,
 *     ‖T‖∞ < 1). Si se cumplen, hay garantía. Si NO se cumplen, no se concluye
 *     nada: el método todavía puede converger.
 *  2. Condición necesaria y suficiente: ρ(T) < 1 para todo x⁽⁰⁾.
 *  3. Comportamiento observado en una ejecución concreta (motor-iterativo.js),
 *     que depende además de x⁽⁰⁾, la tolerancia y el máximo de iteraciones.
 */
(function (MI) {
  'use strict';

  const { normaInfinitoMatriz, resolverPorEliminacion, trasponerMatriz } = MI.matematicas.algebraLineal;
  const { calcularRadioEspectral } = MI.matematicas.valoresPropios;

  const CLASIFICACION_RADIO = Object.freeze({
    MENOR_QUE_UNO: 'menor-que-uno',
    MAYOR_QUE_UNO: 'mayor-que-uno',
    FRONTERA: 'frontera',
    NO_CALCULADO: 'no-calculado',
  });

  /** Banda alrededor de 1 donde el redondeo impide decidir si ρ < 1. */
  const BANDA_FRONTERA = 1e-8;
  const HOLGURA_COMPARACION = 16 * Number.EPSILON;

  function compararDominancia(matriz) {
    return matriz.map((fila, i) => {
      const diagonal = Math.abs(fila[i]);
      const sumaResto = fila.reduce((s, v, j) => (j === i ? s : s + Math.abs(v)), 0);
      const margenRedondeo = HOLGURA_COMPARACION * (diagonal + sumaResto);
      return {
        indice: i,
        diagonal,
        sumaResto,
        estricta: diagonal - sumaResto > margenRedondeo,
        debil: diagonal - sumaResto >= -margenRedondeo,
      };
    });
  }

  /** Una matriz es irreducible si el grafo de sus entradas no nulas es fuertemente conexo. */
  function esIrreducible(A) {
    const n = A.length;
    const alcanzaTodos = (entradaNoNula) => {
      const visitado = new Array(n).fill(false);
      const pila = [0];
      visitado[0] = true;
      while (pila.length) {
        const nodo = pila.pop();
        for (let j = 0; j < n; j++) {
          if (!visitado[j] && j !== nodo && entradaNoNula(nodo, j)) {
            visitado[j] = true;
            pila.push(j);
          }
        }
      }
      return visitado.every(Boolean);
    };
    return alcanzaTodos((i, j) => A[i][j] !== 0) && alcanzaTodos((i, j) => A[j][i] !== 0);
  }

  function esSimetrica(A) {
    const escala = Math.max(...A.flat().map(Math.abs), 1);
    for (let i = 0; i < A.length; i++) {
      for (let j = i + 1; j < A.length; j++) {
        if (Math.abs(A[i][j] - A[j][i]) > 1e-12 * escala) return false;
      }
    }
    return true;
  }

  /** Prueba de definida positiva mediante la factorización de Cholesky. */
  function esDefinidaPositiva(A) {
    const n = A.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let suma = A[i][j];
        for (let k = 0; k < j; k++) suma -= L[i][k] * L[j][k];
        if (i === j) {
          if (suma <= 0) return false;
          L[i][i] = Math.sqrt(suma);
        } else {
          L[i][j] = suma / L[j][j];
        }
      }
    }
    return true;
  }

  function clasificarRadio(radio) {
    if (!Number.isFinite(radio)) return CLASIFICACION_RADIO.NO_CALCULADO;
    if (Math.abs(radio - 1) <= BANDA_FRONTERA) return CLASIFICACION_RADIO.FRONTERA;
    return radio < 1 ? CLASIFICACION_RADIO.MENOR_QUE_UNO : CLASIFICACION_RADIO.MAYOR_QUE_UNO;
  }

  function analizarMetodo(metodo, A) {
    const T = metodo.construirMatrizIteracion(A);
    let radio = NaN;
    let valores = [];
    try {
      ({ radio, valores } = calcularRadioEspectral(T));
    } catch (error) {
      // Se informa como "no calculado": el resto del análisis sigue siendo válido.
      console.warn(`No se pudo calcular ρ(T) para ${metodo.nombre}:`, error);
    }
    const normaT = normaInfinitoMatriz(T);
    return {
      id: metodo.id,
      nombre: metodo.nombre,
      matrizIteracion: T,
      normaInfinitoT: normaT,
      radioEspectral: radio,
      valoresPropios: valores,
      clasificacion: clasificarRadio(radio),
      iteracionesPorDigito: radio > 0 && radio < 1 ? 1 / -Math.log10(radio) : null,
    };
  }

  function construirCondicionesSuficientes(A, jacobi, gaussSeidel) {
    const porFilas = compararDominancia(A);
    const porColumnas = compararDominancia(trasponerMatriz(A));
    const irreducible = esIrreducible(A);
    const simetrica = esSimetrica(A);
    const definidaPositiva = simetrica && esDefinidaPositiva(A);

    const estrictaFilas = porFilas.every((f) => f.estricta);
    const estrictaColumnas = porColumnas.every((f) => f.estricta);
    const irreducibleDominante =
      irreducible &&
      ((porFilas.every((f) => f.debil) && porFilas.some((f) => f.estricta)) ||
        (porColumnas.every((f) => f.debil) && porColumnas.some((f) => f.estricta)));

    let dosDmenosADefinida = false;
    if (definidaPositiva) {
      const dosDmenosA = A.map((fila, i) => fila.map((v, j) => (i === j ? v : -v)));
      dosDmenosADefinida = esDefinidaPositiva(dosDmenosA);
    }

    return {
      detalleDominanciaFilas: porFilas,
      simetrica,
      definidaPositiva,
      irreducible,
      lista: [
        {
          id: 'dominancia-filas',
          nombre: 'Dominancia diagonal estricta por filas',
          cumple: estrictaFilas,
          aplicaA: ['jacobi', 'gauss-seidel'],
          descripcion: '|aᵢᵢ| > Σ|aᵢⱼ| (j ≠ i) en todas las filas.',
        },
        {
          id: 'dominancia-columnas',
          nombre: 'Dominancia diagonal estricta por columnas',
          cumple: estrictaColumnas,
          aplicaA: ['jacobi', 'gauss-seidel'],
          descripcion: '|aⱼⱼ| > Σ|aᵢⱼ| (i ≠ j) en todas las columnas.',
        },
        {
          id: 'irreducible-dominante',
          nombre: 'Irreducible y diagonalmente dominante',
          cumple: irreducibleDominante,
          aplicaA: ['jacobi', 'gauss-seidel'],
          descripcion: 'Dominancia débil con al menos una desigualdad estricta, en una matriz irreducible.',
        },
        {
          id: 'simetrica-definida-positiva',
          nombre: 'Simétrica y definida positiva',
          cumple: definidaPositiva,
          aplicaA: ['gauss-seidel'],
          descripcion: 'Garantiza Gauss-Seidel. Para Jacobi no basta.',
        },
        {
          id: 'jacobi-definida-positiva',
          nombre: 'A y 2D − A simétricas definidas positivas',
          cumple: definidaPositiva && dosDmenosADefinida,
          aplicaA: ['jacobi'],
          descripcion: 'Condición adicional que garantiza Jacobi en matrices simétricas.',
        },
        {
          id: 'norma-jacobi',
          nombre: '‖T_J‖∞ < 1',
          cumple: jacobi.normaInfinitoT < 1,
          aplicaA: ['jacobi'],
          descripcion: 'Cualquier norma inducida menor que 1 implica ρ(T) < 1.',
        },
        {
          id: 'norma-gauss-seidel',
          nombre: '‖T_G‖∞ < 1',
          cumple: gaussSeidel.normaInfinitoT < 1,
          aplicaA: ['gauss-seidel'],
          descripcion: 'Cualquier norma inducida menor que 1 implica ρ(T) < 1.',
        },
      ],
    };
  }

  /**
   * @param {number[][]} A Matriz con diagonal no nula.
   * @param {number[]} b Términos independientes.
   */
  function analizarSistema(A, b) {
    const jacobi = analizarMetodo(MI.matematicas.jacobi, A);
    const gaussSeidel = analizarMetodo(MI.matematicas.gaussSeidel, A);
    const condiciones = construirCondicionesSuficientes(A, jacobi, gaussSeidel);

    const garantias = (id) => condiciones.lista.filter((c) => c.cumple && c.aplicaA.includes(id));
    jacobi.garantias = garantias('jacobi');
    gaussSeidel.garantias = garantias('gauss-seidel');

    return {
      referencia: resolverPorEliminacion(A, b),
      condiciones,
      metodos: { jacobi, 'gauss-seidel': gaussSeidel },
    };
  }

  MI.matematicas.analisisConvergencia = { analizarSistema, CLASIFICACION_RADIO };
})(window.MetodosIterativos);
