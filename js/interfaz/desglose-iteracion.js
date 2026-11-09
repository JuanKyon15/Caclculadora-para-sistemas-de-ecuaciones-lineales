/**
 * Muestra con números cómo se calculó cada variable en una iteración.
 * Los valores salen del modo detallado de los mismos algoritmos.
 */
(function (MI) {
  'use strict';

  const { el } = MI.interfaz.dom;
  const { formatearNumero, formatearCoeficiente, textoVariable } = MI.interfaz.formato;

  function variableConIteracion(nombre, k) {
    return el('span', {}, textoVariable(nombre), el('sup', {}, `(${k})`));
  }

  function crearTermino(termino, decimales) {
    const coeficiente = formatearCoeficiente(termino.coeficiente);
    const texto = termino.coeficiente < 0 ? `(${coeficiente})` : coeficiente;
    const claseValor = termino.origen === 'actualizado' ? 'valor-actualizado' : 'valor-anterior';
    return [' − ', texto, '·', el('span', { class: `valor ${claseValor}` }, formatearNumero(termino.valor, decimales))];
  }

  function crearEcuacion(detalle, variables, k, decimales) {
    const terminosVisibles = detalle.terminos.filter((t) => t.coeficiente !== 0);
    return el('div', { class: 'ecuacion-paso' },
      variableConIteracion(variables[detalle.i], k),
      '=',
      el('span', { class: 'fraccion' },
        el('span', { class: 'fraccion-numerador' }, formatearCoeficiente(detalle.terminoIndependiente), terminosVisibles.map((t) => crearTermino(t, decimales))),
        el('span', { class: 'fraccion-denominador' }, formatearCoeficiente(detalle.diagonal))
      ),
      '=',
      el('span', { class: 'resultado-paso' }, formatearNumero(detalle.resultado, decimales))
    );
  }

  /** @param {{metodo:object,A:number[][],b:number[],xAnterior:number[],k:number,variables:string[],decimales:number,decimalesInternos?:number|null}} datos */
  function crearDesglose({ metodo, A, b, xAnterior, k, variables, decimales, decimalesInternos = null }) {
    const { detalle } = metodo.calcularIteracion(A, b, xAnterior, true, decimalesInternos);
    const usaActualizados = metodo.id === 'gauss-seidel';

    return el('div', { class: 'desglose' },
      el('div', { class: 'leyenda-valores' },
        el('span', {}, el('span', { class: 'valor valor-anterior' }, `iteración ${k - 1}`), 'valor anterior'),
        usaActualizados ? el('span', {}, el('span', { class: 'valor valor-actualizado' }, `iteración ${k}`), 'valor recién actualizado') : null
      ),
      el('div', { class: 'desglose-filas' }, detalle.map((d) => crearEcuacion(d, variables, k, decimales)))
    );
  }

  MI.interfaz.crearDesglose = crearDesglose;
})(window.MetodosIterativos);
