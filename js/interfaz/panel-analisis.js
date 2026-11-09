/**
 * Presenta el análisis de convergencia separando el criterio exacto (radio
 * espectral) de las condiciones suficientes.
 */
(function (MI) {
  'use strict';

  const { el, vaciar } = MI.interfaz.dom;
  const { formatearNumero, formatearRadio } = MI.interfaz.formato;
  const { CLASIFICACION_RADIO } = MI.matematicas.analisisConvergencia;

  const TEXTO_RADIO = Object.freeze({
    [CLASIFICACION_RADIO.MENOR_QUE_UNO]: { tono: 'exito', etiqueta: 'ρ(T) < 1', texto: 'Converge desde cualquier x⁽⁰⁾, salvo por los efectos del redondeo.' },
    [CLASIFICACION_RADIO.MAYOR_QUE_UNO]: { tono: 'peligro', etiqueta: 'ρ(T) > 1', texto: 'No converge para un x⁽⁰⁾ general. Solo podría hacerlo desde valores iniciales especiales.' },
    [CLASIFICACION_RADIO.FRONTERA]: { tono: 'alerta', etiqueta: 'ρ(T) ≈ 1', texto: 'Caso frontera: no hay convergencia general y el redondeo impide afinar la conclusión.' },
    [CLASIFICACION_RADIO.NO_CALCULADO]: { tono: 'neutra', etiqueta: 'Sin calcular', texto: 'No fue posible calcular el radio espectral de esta matriz.' },
  });

  function crearTarjetaRadio(analisisMetodo) {
    const info = TEXTO_RADIO[analisisMetodo.clasificacion];
    const porDigito = analisisMetodo.iteracionesPorDigito;
    return el('div', { class: 'radio-tarjeta', dataset: { metodo: analisisMetodo.id } },
      el('div', { class: 'radio-cabecera' },
        el('strong', {}, analisisMetodo.nombre),
        el('span', { class: `pastilla pastilla-${info.tono}` }, info.etiqueta)
      ),
      el('div', { class: 'radio-valor' }, `ρ(T) = ${formatearRadio(analisisMetodo.radioEspectral)}`),
      el('div', {}, info.texto),
      porDigito !== null && analisisMetodo.radioEspectral >= 1e-4
        ? el('div', {}, `Cerca de ${porDigito < 10 ? porDigito.toFixed(1) : Math.round(porDigito)} iteraciones por cada dígito correcto.`)
        : null
    );
  }

  function crearTablaCondiciones(condiciones) {
    const nombreAplica = (lista) => (lista.length === 2 ? 'Ambos' : lista[0] === 'jacobi' ? 'Jacobi' : 'Gauss-Seidel');
    return el('div', { class: 'tabla-desplazable' },
      el('table', { class: 'tabla-teoria' },
        el('thead', {}, el('tr', {},
          el('th', { scope: 'col' }, 'Condición'),
          el('th', { scope: 'col' }, 'Garantiza'),
          el('th', { scope: 'col' }, 'Este sistema'))),
        el('tbody', {}, condiciones.lista.map((c) => el('tr', { dataset: { condicion: c.id } },
          el('td', {}, el('div', {}, c.nombre), el('div', { class: 'ayuda' }, c.descripcion)),
          el('td', {}, nombreAplica(c.aplicaA)),
          el('td', {}, el('span', { class: `pastilla pastilla-${c.cumple ? 'exito' : 'neutra'}` }, c.cumple ? 'Cumple' : 'No cumple'))
        )))
      ));
  }

  function crearMatrizNumeros(T) {
    return el('div', { class: 'matriz-numeros', style: `grid-template-columns:repeat(${T.length},auto)` },
      T.flat().map((v) => el('span', {}, formatearNumero(v, 4))));
  }

  function textoValoresPropios(valores) {
    return valores.map((v) => {
      const real = formatearNumero(v.real, 4);
      if (Math.abs(v.imaginaria) < 1e-12) return real;
      return `${real} ${v.imaginaria < 0 ? '−' : '+'} ${formatearNumero(Math.abs(v.imaginaria), 4)}i`;
    }).join(' ;  ');
  }

  function crearDetalles(analisis) {
    const filas = analisis.condiciones.detalleDominanciaFilas;
    return el('details', {},
      el('summary', {}, 'Ver dominancia por fila, matrices de iteración y valores propios'),
      el('div', { class: 'detalles-tecnicos' },
        el('div', { class: 'tabla-desplazable' },
          el('table', { class: 'tabla-compacta' },
            el('thead', {}, el('tr', {}, ['Fila', '|aᵢᵢ|', 'Σ|aᵢⱼ|, j ≠ i', 'Estricta'].map((t) => el('th', { scope: 'col' }, t)))),
            el('tbody', {}, filas.map((f) => el('tr', {},
              el('td', {}, String(f.indice + 1)),
              el('td', {}, formatearNumero(f.diagonal, 4)),
              el('td', {}, formatearNumero(f.sumaResto, 4)),
              el('td', {}, f.estricta ? 'sí' : 'no')
            ))))),
        Object.values(analisis.metodos).map((m) => el('div', {},
          el('h4', {}, `Matriz de iteración de ${m.nombre}`),
          el('div', { class: 'tabla-desplazable' }, crearMatrizNumeros(m.matrizIteracion)),
          el('p', { class: 'ayuda' }, `‖T‖∞ = ${formatearNumero(m.normaInfinitoT, 4)}. Valores propios: ${textoValoresPropios(m.valoresPropios) || 'no calculados'}.`)
        ))
      ));
  }

  function mostrarAnalisis(contenedor, analisis) {
    vaciar(contenedor);
    contenedor.append(el('div', { class: 'analisis' },
      el('div', {},
        el('h4', {}, 'Criterio exacto: radio espectral'),
        el('p', { class: 'analisis-explicacion' }, 'Depende solo de la matriz A y decide si el método converge para cualquier valor inicial.')),
      el('div', { class: 'radios' }, Object.values(analisis.metodos).map(crearTarjetaRadio)),
      el('div', {},
        el('h4', {}, 'Condiciones suficientes'),
        el('p', { class: 'analisis-explicacion' }, 'Si una se cumple, la convergencia está garantizada. Si no se cumple, no se puede concluir nada: el método todavía puede converger.')),
      crearTablaCondiciones(analisis.condiciones),
      crearDetalles(analisis)
    ));
  }

  MI.interfaz.mostrarAnalisis = mostrarAnalisis;
})(window.MetodosIterativos);
