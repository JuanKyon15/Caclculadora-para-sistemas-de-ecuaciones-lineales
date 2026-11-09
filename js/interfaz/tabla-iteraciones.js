/** Tabla paginada con el historial de una ejecución. */
(function (MI) {
  'use strict';

  const { el, vaciar } = MI.interfaz.dom;
  const { formatearNumero, formatearError, textoVariable } = MI.interfaz.formato;
  const { describirMedida } = MI.matematicas.motorIterativo;

  const FILAS_POR_PAGINA = 50;

  function crearTablaIteraciones(contenedor, alSeleccionar) {
    let resultado = null;
    let variables = [];
    let decimales = 6;
    let pagina = 0;
    let seleccionada = null;

    const paginasTotales = () => Math.max(1, Math.ceil(resultado.iteraciones.length / FILAS_POR_PAGINA));

    function crearTendencia(actual, anterior) {
      if (actual === null || anterior === null || actual === anterior) return el('span', { class: 'tendencia' });
      const baja = actual < anterior;
      return el('span', {
        class: `tendencia ${baja ? 'tendencia-baja' : 'tendencia-sube'}`,
        title: baja ? 'Menor que en la iteración anterior' : 'Mayor que en la iteración anterior',
      }, baja ? '▼' : '▲');
    }

    function textoCriterio(iteracion) {
      if (iteracion.error === null) return 'Valor inicial';
      return iteracion.cumpleTolerancia ? '≤ tolerancia · se detiene' : '> tolerancia · continúa';
    }

    function crearFila(iteracion, indice) {
      const anterior = indice > 0 ? resultado.iteraciones[indice - 1].error : null;
      const esUltima = indice === resultado.iteraciones.length - 1;
      const clases = [esUltima ? 'fila-final' : '', iteracion.k === seleccionada ? 'fila-seleccionada' : ''].join(' ').trim();
      return el('tr', {
        class: clases,
        dataset: { k: iteracion.k },
        onclick: () => {
          if (iteracion.k > 0) alSeleccionar(iteracion.k);
        },
      },
        el('td', {}, String(iteracion.k)),
        iteracion.x.map((v) => el('td', {}, formatearNumero(v, decimales))),
        el('td', {}, crearTendencia(iteracion.error, anterior), formatearError(iteracion.error), iteracion.errorIndefinido ? '*' : ''),
        el('td', {}, formatearError(iteracion.residuo)),
        el('td', { class: 'criterio' }, textoCriterio(iteracion))
      );
    }

    function dibujar() {
      vaciar(contenedor);
      const criterio = describirMedida(resultado.tipoError, resultado.norma);
      const inicio = pagina * FILAS_POR_PAGINA;
      const visibles = resultado.iteraciones.slice(inicio, inicio + FILAS_POR_PAGINA);

      contenedor.append(el('div', { class: 'envoltura-tabla', tabIndex: 0, 'aria-label': 'Tabla de iteraciones con desplazamiento' },
        el('table', { class: 'tabla-iteraciones' },
          el('thead', {}, el('tr', {},
            el('th', { scope: 'col' }, 'k'),
            variables.map((v) => el('th', { scope: 'col' }, textoVariable(v))),
            el('th', { scope: 'col' }, `Error${criterio.unidad ? ` (${criterio.unidad})` : ''}`),
            el('th', { scope: 'col' }, `Residuo ‖·‖${criterio.subindice}`),
            el('th', { scope: 'col', class: 'criterio' }, 'Criterio de convergencia')
          )),
          el('tbody', {}, visibles.map((it, i) => crearFila(it, inicio + i)))
        )));

      if (paginasTotales() > 1) {
        contenedor.append(el('div', { class: 'paginacion' },
          el('button', { type: 'button', class: 'boton boton-pequeno', disabled: pagina === 0, onclick: () => cambiarPagina(pagina - 1) }, 'Anterior'),
          el('span', {}, `Página ${pagina + 1} de ${paginasTotales()}`),
          el('button', { type: 'button', class: 'boton boton-pequeno', disabled: pagina >= paginasTotales() - 1, onclick: () => cambiarPagina(pagina + 1) }, 'Siguiente')
        ));
      }

      const hayIndefinidos = resultado.iteraciones.some((it) => it.errorIndefinido);
      contenedor.append(el('p', { class: 'nota-tabla' },
        `Error: ${criterio.nombre.toLowerCase()}, ${criterio.formula}. Pulsa una fila para ver su desarrollo.`,
        hayIndefinidos ? ' * El denominador fue cero; en esa fila se usó el cambio absoluto.' : ''
      ));
    }

    function cambiarPagina(nueva) {
      pagina = nueva;
      dibujar();
    }

    function mostrar(nuevoResultado, nuevasVariables, nuevosDecimales) {
      resultado = nuevoResultado;
      variables = nuevasVariables;
      decimales = nuevosDecimales;
      pagina = 0;
      seleccionada = null;
      dibujar();
    }

    function seleccionar(k) {
      seleccionada = k;
      pagina = Math.floor(k / FILAS_POR_PAGINA);
      dibujar();
      const fila = contenedor.querySelector('tr.fila-seleccionada');
      const envoltura = contenedor.querySelector('.envoltura-tabla');
      if (fila && envoltura) {
        // Solo mueve el desplazamiento interno de la tabla, nunca el de la página.
        envoltura.scrollTop = Math.max(0, fila.offsetTop - envoltura.clientHeight / 2);
      }
    }

    /** Texto separado por tabuladores, con precisión completa, para hojas de cálculo. */
    function obtenerTextoTabla() {
      const encabezado = ['k', ...variables, 'error', 'residuo', 'criterio'].join('\t');
      const filas = resultado.iteraciones.map((it) =>
        [it.k, ...it.x, it.error ?? '', it.residuo, textoCriterio(it)].join('\t'));
      return [encabezado, ...filas].join('\n');
    }

    return { mostrar, seleccionar, obtenerTextoTabla };
  }

  MI.interfaz.crearTablaIteraciones = crearTablaIteraciones;
})(window.MetodosIterativos);
