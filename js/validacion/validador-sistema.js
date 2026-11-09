/**
 * Validación de los datos del sistema y de los parámetros de iteración.
 *
 * Recibe los textos tal como los escribió el usuario y devuelve datos numéricos
 * listos para calcular, junto con errores (bloquean la ejecución) y advertencias
 * (permiten ejecutar, pero el usuario debe conocerlas).
 */
(function (MI) {
  'use strict';

  const { interpretarNumero, describirMotivo } = MI.validacion.conversionNumerica;

  const LIMITES = Object.freeze({
    DIMENSION_MINIMA: 2,
    DIMENSION_MAXIMA: 10,
    ITERACIONES_MAXIMAS: 10000,
    TOLERANCIA_MINIMA_RECOMENDADA: 1e-15,
    DECIMALES_MAXIMOS: 15,
  });

  const CODIGO = Object.freeze({
    DIMENSIONES: 'dimensiones-incompatibles',
    VALOR_INVALIDO: 'valor-invalido',
    DIAGONAL_CERO: 'diagonal-cero',
    TOLERANCIA: 'tolerancia-invalida',
    ITERACIONES: 'iteraciones-invalidas',
    DECIMALES: 'decimales-invalidos',
  });

  function crearColector() {
    const errores = [];
    const advertencias = [];
    return {
      errores,
      advertencias,
      agregarError: (codigo, campo, mensaje, posicion = {}) => errores.push({ codigo, campo, mensaje, ...posicion }),
      agregarAdvertencia: (codigo, mensaje) => advertencias.push({ codigo, mensaje }),
    };
  }

  function validarDimensiones(entrada, colector) {
    const { matriz, terminos, inicial } = entrada;
    if (!Array.isArray(matriz) || matriz.length === 0) {
      colector.agregarError(CODIGO.DIMENSIONES, 'A', 'La matriz A no tiene filas.');
      return false;
    }
    const n = matriz.length;
    let compatibles = true;

    if (n < LIMITES.DIMENSION_MINIMA || n > LIMITES.DIMENSION_MAXIMA) {
      colector.agregarError(CODIGO.DIMENSIONES, 'A', `El sistema debe tener entre ${LIMITES.DIMENSION_MINIMA} y ${LIMITES.DIMENSION_MAXIMA} ecuaciones; tiene ${n}.`);
      compatibles = false;
    }
    matriz.forEach((fila, i) => {
      if (!Array.isArray(fila) || fila.length !== n) {
        colector.agregarError(CODIGO.DIMENSIONES, 'A', `La fila ${i + 1} de A tiene ${Array.isArray(fila) ? fila.length : 0} coeficientes y debería tener ${n}. La matriz debe ser cuadrada.`, { fila: i });
        compatibles = false;
      }
    });
    if (!Array.isArray(terminos) || terminos.length !== n) {
      colector.agregarError(CODIGO.DIMENSIONES, 'b', `El vector b debe tener ${n} componentes, una por ecuación.`);
      compatibles = false;
    }
    if (!Array.isArray(inicial) || inicial.length !== n) {
      colector.agregarError(CODIGO.DIMENSIONES, 'x0', `El vector inicial debe tener ${n} componentes, una por variable.`);
      compatibles = false;
    }
    return compatibles;
  }

  function convertirCelda(texto, descripcion, campo, posicion, colector) {
    const resultado = interpretarNumero(texto);
    if (resultado.valido) return resultado.valor;
    colector.agregarError(CODIGO.VALOR_INVALIDO, campo, `${descripcion} ${describirMotivo(resultado.motivo)}.`, posicion);
    return null;
  }

  function validarTolerancia(texto, colector) {
    const resultado = interpretarNumero(texto);
    if (!resultado.valido) {
      colector.agregarError(CODIGO.TOLERANCIA, 'tolerancia', `La tolerancia ${describirMotivo(resultado.motivo)}.`);
      return null;
    }
    if (resultado.valor <= 0) {
      colector.agregarError(CODIGO.TOLERANCIA, 'tolerancia', 'La tolerancia debe ser mayor que cero.');
      return null;
    }
    if (resultado.valor < LIMITES.TOLERANCIA_MINIMA_RECOMENDADA) {
      colector.agregarAdvertencia('tolerancia-muy-pequena', 'La tolerancia está por debajo de la precisión habitual de los números de doble precisión. El error puede no llegar a ese valor por el redondeo.');
    }
    if (resultado.valor >= 1) {
      colector.agregarAdvertencia('tolerancia-grande', 'La tolerancia es 1 o mayor. Con el error absoluto, la iteración puede detenerse lejos de la solución.');
    }
    return resultado.valor;
  }

  function validarIteraciones(texto, colector) {
    const resultado = interpretarNumero(texto);
    if (!resultado.valido) {
      colector.agregarError(CODIGO.ITERACIONES, 'maxIteraciones', `El máximo de iteraciones ${describirMotivo(resultado.motivo)}.`);
      return null;
    }
    if (!Number.isInteger(resultado.valor) || resultado.valor < 1) {
      colector.agregarError(CODIGO.ITERACIONES, 'maxIteraciones', 'El máximo de iteraciones debe ser un entero positivo.');
      return null;
    }
    if (resultado.valor > LIMITES.ITERACIONES_MAXIMAS) {
      colector.agregarError(CODIGO.ITERACIONES, 'maxIteraciones', `El máximo de iteraciones no puede superar ${LIMITES.ITERACIONES_MAXIMAS}.`);
      return null;
    }
    return resultado.valor;
  }

  function validarDecimales(texto, colector) {
    const resultado = interpretarNumero(texto);
    if (!resultado.valido) {
      colector.agregarError(CODIGO.DECIMALES, 'decimales', `El número de decimales ${describirMotivo(resultado.motivo)}.`);
      return null;
    }
    if (!Number.isInteger(resultado.valor) || resultado.valor < 0 || resultado.valor > LIMITES.DECIMALES_MAXIMOS) {
      colector.agregarError(CODIGO.DECIMALES, 'decimales', `El número de decimales debe ser un entero entre 0 y ${LIMITES.DECIMALES_MAXIMOS}.`);
      return null;
    }
    return resultado.valor;
  }

  /** El menor cambio distinto de cero entre valores con d decimales es 10^-d. */
  function advertirToleranciaInalcanzable(tolerancia, decimales, tipoError, colector) {
    if (tolerancia === null || decimales === null || tipoError !== 'absoluto') return;
    if (tolerancia < Math.pow(10, -decimales)) {
      colector.agregarAdvertencia('tolerancia-menor-que-redondeo', `Con ${decimales} decimales, el menor cambio posible entre iteraciones es 1e-${decimales}. Esta tolerancia solo se cumplirá cuando dos iteraciones coincidan exactamente.`);
    }
  }

  function validarEstructura(A, colector) {
    const n = A.length;
    const escala = Math.max(...A.flat().map(Math.abs));

    A.forEach((fila, i) => {
      if (fila.every((v) => v === 0)) {
        colector.agregarError(CODIGO.VALOR_INVALIDO, 'A', `La fila ${i + 1} de A es completamente nula: esa ecuación no aporta información sobre las variables.`, { fila: i });
      } else if (fila[i] === 0) {
        colector.agregarError(CODIGO.DIAGONAL_CERO, 'A', `El coeficiente diagonal a${i + 1},${i + 1} es cero y no se puede despejar la variable ${i + 1}. Prueba a reordenar las ecuaciones.`, { fila: i, columna: i });
      } else if (Math.abs(fila[i]) < 1e-12 * escala) {
        colector.agregarAdvertencia('diagonal-casi-cero', `El coeficiente diagonal a${i + 1},${i + 1} es muy pequeño frente al resto de la matriz. Dividir entre él amplifica los errores de redondeo.`);
      }
    });

    for (let j = 0; j < n; j++) {
      if (A.every((fila) => fila[j] === 0)) {
        colector.agregarError(CODIGO.VALOR_INVALIDO, 'A', `La columna ${j + 1} de A es completamente nula: la variable ${j + 1} no aparece en ninguna ecuación.`, { columna: j });
      }
    }
  }

  /**
   * @param {{matriz:string[][],terminos:string[],inicial:string[],tolerancia:string,maxIteraciones:string,decimales:string,tipoError?:string}} entrada
   */
  function validarEntrada(entrada) {
    const colector = crearColector();
    const dimensionesCorrectas = validarDimensiones(entrada, colector);
    const tolerancia = validarTolerancia(entrada.tolerancia, colector);
    const maxIteraciones = validarIteraciones(entrada.maxIteraciones, colector);
    const decimales = validarDecimales(entrada.decimales, colector);
    advertirToleranciaInalcanzable(tolerancia, decimales, entrada.tipoError, colector);

    if (!dimensionesCorrectas) return { valido: false, errores: colector.errores, advertencias: colector.advertencias, datos: null };

    const A = entrada.matriz.map((fila, i) =>
      fila.map((celda, j) => convertirCelda(celda, `El coeficiente a${i + 1},${j + 1}`, 'A', { fila: i, columna: j }, colector))
    );
    const b = entrada.terminos.map((celda, i) => convertirCelda(celda, `El término independiente b${i + 1}`, 'b', { fila: i }, colector));
    const x0 = entrada.inicial.map((celda, i) => convertirCelda(celda, `El valor inicial de la variable ${i + 1}`, 'x0', { fila: i }, colector));

    const matrizNumerica = A.flat().every((v) => v !== null);
    if (matrizNumerica) validarEstructura(A, colector);

    const valido = colector.errores.length === 0;
    return {
      valido,
      errores: colector.errores,
      advertencias: colector.advertencias,
      datos: valido ? { A, b, x0, tolerancia, maxIteraciones, decimales } : null,
    };
  }

  MI.validacion.validadorSistema = { validarEntrada, LIMITES, CODIGO };
})(window.MetodosIterativos);
