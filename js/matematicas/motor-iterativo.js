/**
 * Bucle común de los métodos iterativos: ejecuta las iteraciones, mide el error,
 * aplica el criterio de parada y clasifica cómo terminó la ejecución.
 *
 * El motor no sabe cómo actualiza cada método: recibe un objeto con la función
 * `calcularIteracion` (jacobi.js o gauss-seidel.js).
 */
(function (MI) {
  'use strict';

  const {
    normaUno, normaEuclidiana, normaP, normaInfinito, calcularResiduo, redondearDecimales,
  } = MI.matematicas.algebraLineal;

  const ESTADO = Object.freeze({
    TOLERANCIA_ALCANZADA: 'tolerancia-alcanzada',
    MAXIMO_ITERACIONES: 'maximo-iteraciones',
    DIVERGENCIA_DETECTADA: 'divergencia-detectada',
  });

  const TENDENCIA = Object.freeze({
    DECRECIENTE: 'decreciente',
    CRECIENTE: 'creciente',
    ESTANCADA: 'estancada',
    INSUFICIENTE: 'insuficiente',
  });

  /** Factor sobre la escala del problema a partir del cual se declara divergencia. */
  const FACTOR_DIVERGENCIA = 1e30;

  const NORMAS = Object.freeze({
    1: { nombre: 'Norma 1', subindice: '₁', medir: normaUno },
    2: { nombre: 'Norma 2 (euclidiana)', subindice: '₂', medir: normaEuclidiana },
    3: { nombre: 'Norma 3', subindice: '₃', medir: (vector) => normaP(vector, 3) },
    infinito: { nombre: 'Norma infinito', subindice: '∞', medir: normaInfinito },
  });

  const TIPOS_ERROR = Object.freeze({
    absoluto: { nombre: 'Absoluto', unidad: '' },
    relativo: { nombre: 'Relativo', unidad: '' },
    porcentual: { nombre: 'Relativo porcentual', unidad: '%' },
  });

  /**
   * Mide el cambio entre dos iteraciones en la norma elegida.
   *
   * Con redondeo interno, cada diferencia se redondea también: dos valores con
   * d decimales difieren en un múltiplo exacto de 10^-d, y así el ruido binario
   * de la resta no decide si se cumple la tolerancia.
   *
   * `indefinido` indica que el denominador fue cero y se usó el cambio absoluto.
   */
  function medirError(xNuevo, xAnterior, { tipoError, norma, decimales = null }) {
    const medirNorma = NORMAS[norma].medir;
    const diferencias = xNuevo.map((valor, i) => redondearDecimales(valor - xAnterior[i], decimales));
    const cambio = medirNorma(diferencias);
    if (tipoError === 'absoluto') return { valor: cambio, indefinido: false };

    const denominador = medirNorma(xNuevo);
    if (denominador === 0) return { valor: cambio, indefinido: cambio !== 0 };
    const relativo = cambio / denominador;
    return { valor: tipoError === 'porcentual' ? relativo * 100 : relativo, indefinido: false };
  }

  /** Nombre, fórmula y unidad de una medida de error, para mostrarlos en pantalla. */
  function describirMedida(tipoError, norma) {
    const { subindice, nombre: nombreNorma } = NORMAS[norma];
    const { nombre: nombreTipo, unidad } = TIPOS_ERROR[tipoError];
    const cambio = `‖x⁽ᵏ⁺¹⁾ − x⁽ᵏ⁾‖${subindice}`;
    const relativa = `${cambio} / ‖x⁽ᵏ⁺¹⁾‖${subindice}`;
    const formula = { absoluto: cambio, relativo: relativa, porcentual: `${relativa} · 100` }[tipoError];
    return { nombre: `${nombreTipo}, ${nombreNorma.toLowerCase()}`, formula, unidad, subindice };
  }

  function vectorEsFinito(vector) {
    return vector.every(Number.isFinite);
  }

  /**
   * Escala natural del problema: evita declarar divergencia en sistemas cuya
   * solución legítima es simplemente muy grande.
   */
  function calcularLimiteDivergencia(A, b, x0) {
    const cocientes = b.map((termino, i) => termino / A[i][i]);
    return FACTOR_DIVERGENCIA * Math.max(1, normaInfinito(x0), normaInfinito(cocientes));
  }

  /**
   * Describe el comportamiento del error en las últimas iteraciones mediante
   * su factor medio de reducción. Solo describe lo observado; no es una prueba.
   */
  function clasificarTendencia(iteraciones) {
    const errores = iteraciones.filter((it) => it.error !== null).map((it) => it.error);
    if (errores.length < 3) return { tendencia: TENDENCIA.INSUFICIENTE, factorObservado: null };

    const ventana = Math.min(10, errores.length - 1);
    const final = errores[errores.length - 1];
    const inicial = errores[errores.length - 1 - ventana];
    if (!(final > 0) || !(inicial > 0)) return { tendencia: TENDENCIA.INSUFICIENTE, factorObservado: null };

    const factor = Math.pow(final / inicial, 1 / ventana);
    if (factor < 0.9999) return { tendencia: TENDENCIA.DECRECIENTE, factorObservado: factor };
    if (factor > 1.0001) return { tendencia: TENDENCIA.CRECIENTE, factorObservado: factor };
    return { tendencia: TENDENCIA.ESTANCADA, factorObservado: factor };
  }

  /**
   * Ejecuta un método iterativo.
   *
   * @param {{id:string,nombre:string,calcularIteracion:Function}} metodo
   * @param {{A:number[][],b:number[],x0:number[]}} sistema
   * @param {{tolerancia:number,maxIteraciones:number,tipoError:string,norma:string,decimales?:number|null}} opciones
   *        `decimales` activa el redondeo interno; null conserva la precisión completa.
   */
  function ejecutarMetodo(metodo, sistema, opciones) {
    const { A, b, x0 } = sistema;
    const { tolerancia, maxIteraciones, tipoError, norma, decimales = null } = opciones;
    if (!NORMAS[norma]) throw new Error(`Norma desconocida: ${norma}`);
    if (!TIPOS_ERROR[tipoError]) throw new Error(`Tipo de error desconocido: ${tipoError}`);

    const limiteDivergencia = calcularLimiteDivergencia(A, b, x0);
    const medirResiduo = (x) => NORMAS[norma].medir(calcularResiduo(A, b, x));

    const iteraciones = [{
      k: 0, x: x0.slice(), error: null, errorIndefinido: false, residuo: medirResiduo(x0), cumpleTolerancia: false,
    }];

    let estado = ESTADO.MAXIMO_ITERACIONES;
    let xAnterior = x0.slice();

    for (let k = 1; k <= maxIteraciones; k++) {
      const xNuevo = metodo.calcularIteracion(A, b, xAnterior, false, decimales).x;

      // Sin valores finitos no hay aproximación que mostrar: se conserva la última válida.
      if (!vectorEsFinito(xNuevo)) {
        estado = ESTADO.DIVERGENCIA_DETECTADA;
        break;
      }

      const medicion = medirError(xNuevo, xAnterior, { tipoError, norma, decimales });
      const cumpleTolerancia = medicion.valor <= tolerancia;
      iteraciones.push({
        k,
        x: xNuevo,
        error: medicion.valor,
        errorIndefinido: medicion.indefinido,
        residuo: medirResiduo(xNuevo),
        cumpleTolerancia,
      });

      if (cumpleTolerancia) {
        estado = ESTADO.TOLERANCIA_ALCANZADA;
        break;
      }
      if (normaInfinito(xNuevo) > limiteDivergencia) {
        estado = ESTADO.DIVERGENCIA_DETECTADA;
        break;
      }
      xAnterior = xNuevo;
    }

    const ultima = iteraciones[iteraciones.length - 1];
    const { tendencia, factorObservado } = clasificarTendencia(iteraciones);

    return {
      metodoId: metodo.id,
      nombreMetodo: metodo.nombre,
      estado,
      tendencia,
      factorObservado,
      iteraciones,
      iteracionesRealizadas: ultima.k,
      xFinal: ultima.x,
      errorFinal: ultima.error,
      residuoFinal: ultima.residuo,
      tolerancia,
      maxIteraciones,
      tipoError,
      norma,
      decimales,
    };
  }

  MI.matematicas.motorIterativo = {
    ejecutarMetodo, medirError, describirMedida, ESTADO, TENDENCIA, NORMAS, TIPOS_ERROR,
  };
})(window.MetodosIterativos);
