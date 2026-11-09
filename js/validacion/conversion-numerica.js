/**
 * Conversión estricta de texto a número.
 *
 * parseFloat no sirve para validar: acepta "12abc" como 12. Aquí todo el texto
 * debe ser un número. Se acepta la coma decimal, notación científica y fracciones.
 */
(function (MI) {
  'use strict';

  const PATRON_NUMERO = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;
  const PATRON_FRACCION = /^([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+))\/((?:\d+(?:[.,]\d*)?|[.,]\d+))$/;

  const aNumero = (texto) => Number(texto.replace(',', '.'));

  /** @returns {{valido:true,valor:number}|{valido:false,motivo:string}} */
  function interpretarNumero(textoOriginal) {
    const texto = String(textoOriginal ?? '').trim().replace(/−/g, '-');
    if (texto === '') return { valido: false, motivo: 'vacio' };

    const fraccion = texto.match(PATRON_FRACCION);
    if (fraccion) {
      const denominador = aNumero(fraccion[2]);
      if (denominador === 0) return { valido: false, motivo: 'division-por-cero' };
      return { valido: true, valor: aNumero(fraccion[1]) / denominador };
    }

    if (!PATRON_NUMERO.test(texto)) return { valido: false, motivo: 'no-numerico' };
    const valor = aNumero(texto);
    if (!Number.isFinite(valor)) return { valido: false, motivo: 'fuera-de-rango' };
    return { valido: true, valor };
  }

  const MENSAJES = Object.freeze({
    vacio: 'está vacío',
    'no-numerico': 'no es un número válido',
    'division-por-cero': 'tiene una división entre cero',
    'fuera-de-rango': 'está fuera del rango representable',
  });

  MI.validacion.conversionNumerica = {
    interpretarNumero,
    describirMotivo: (motivo) => MENSAJES[motivo] ?? 'no es válido',
  };
})(window.MetodosIterativos);
