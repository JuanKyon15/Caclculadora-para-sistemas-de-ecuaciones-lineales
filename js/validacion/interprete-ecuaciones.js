/**
 * Convierte ecuaciones escritas como texto ("2x + y = 5") en A y b.
 *
 * Admite coeficientes decimales con punto o coma, fracciones ("1/2x"), el signo
 * "*" opcional, variables con subíndice (x1, x_2) y términos en ambos lados.
 */
(function (MI) {
  'use strict';

  const PATRON_TERMINO = /^([+-]*)((?:\d+(?:[.,]\d*)?|[.,]\d+)(?:\/(?:\d+(?:[.,]\d*)?|[.,]\d+))?)?(\*)?([a-zA-Z](?:_?\d+)?)?/;

  function normalizarLado(texto) {
    return texto.replace(/−/g, '-').replace(/[·×]/g, '*').replace(/\s+/g, '');
  }

  function leerCoeficiente(textoNumero) {
    if (!textoNumero) return 1;
    const [numerador, denominador] = textoNumero.replace(/,/g, '.').split('/').map(Number);
    if (denominador === undefined) return numerador;
    if (denominador === 0) throw new Error('hay una división entre cero');
    return numerador / denominador;
  }

  /** Acumula los términos de un lado. `signoLado` es -1 para el lado derecho. */
  function leerLado(textoOriginal, signoLado, coeficientes, acumulado) {
    let resto = normalizarLado(textoOriginal);
    if (resto === '') throw new Error('falta un lado de la igualdad');
    let esPrimero = true;
    let constante = acumulado;

    while (resto.length > 0) {
      const coincidencia = resto.match(PATRON_TERMINO);
      const [texto, signos, numero, asterisco, variable] = coincidencia;

      if (!numero && !variable) throw new Error(`no se entiende «${resto}»`);
      if (asterisco && !variable) throw new Error('falta la variable después de «*»');
      if (!esPrimero && signos === '') throw new Error(`falta un signo antes de «${resto}»`);

      const signoTermino = (signos.match(/-/g) || []).length % 2 === 0 ? 1 : -1;
      const valor = signoLado * signoTermino * leerCoeficiente(numero);

      if (variable) {
        const nombre = variable.replace('_', '');
        coeficientes.set(nombre, (coeficientes.get(nombre) ?? 0) + valor);
      } else {
        constante += valor;
      }
      resto = resto.slice(texto.length);
      esPrimero = false;
    }
    return constante;
  }

  function compararVariables(a, b) {
    const partes = (nombre) => [nombre[0], Number(nombre.slice(1) || 0)];
    const [letraA, indiceA] = partes(a);
    const [letraB, indiceB] = partes(b);
    return letraA === letraB ? indiceA - indiceB : letraA.localeCompare(letraB);
  }

  /**
   * @returns {{valido:true,A:number[][],b:number[],variables:string[]}|{valido:false,errores:string[]}}
   */
  function interpretarEcuaciones(texto) {
    const lineas = String(texto).split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
    if (lineas.length === 0) return { valido: false, errores: ['Escribe al menos una ecuación por línea.'] };

    const errores = [];
    const ecuaciones = [];

    lineas.forEach((linea, indice) => {
      const lados = linea.split('=');
      if (lados.length !== 2) {
        errores.push(`Línea ${indice + 1}: debe tener exactamente un signo «=».`);
        return;
      }
      try {
        const coeficientes = new Map();
        // Los términos se pasan a la izquierda; la constante queda a la derecha con signo opuesto.
        const constante = leerLado(lados[1], -1, coeficientes, leerLado(lados[0], 1, coeficientes, 0));
        ecuaciones.push({ coeficientes, termino: -constante });
      } catch (error) {
        errores.push(`Línea ${indice + 1}: ${error.message}.`);
      }
    });

    if (errores.length) return { valido: false, errores };

    const variables = [...new Set(ecuaciones.flatMap((e) => [...e.coeficientes.keys()]))].sort(compararVariables);
    if (variables.length !== ecuaciones.length) {
      return {
        valido: false,
        errores: [`Dimensiones incompatibles: hay ${ecuaciones.length} ecuaciones y ${variables.length} variables (${variables.join(', ') || 'ninguna'}). Estos métodos necesitan un sistema cuadrado.`],
      };
    }

    return {
      valido: true,
      variables,
      A: ecuaciones.map((e) => variables.map((v) => e.coeficientes.get(v) ?? 0)),
      b: ecuaciones.map((e) => e.termino),
    };
  }

  MI.validacion.interpreteEcuaciones = { interpretarEcuaciones };
})(window.MetodosIterativos);
