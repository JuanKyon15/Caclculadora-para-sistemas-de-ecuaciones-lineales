/**
 * Gráfico de líneas en SVG: ejes lineales o logarítmicos, leyenda que oculta
 * series, puntero con lectura de valores y navegación con flechas.
 * No conoce los métodos numéricos: solo dibuja las series que recibe.
 */
(function (MI) {
  'use strict';

  const { el, svg, vaciar } = MI.interfaz.dom;

  const ALTO = 300;
  const MARGEN = { arriba: 12, derecha: 16, abajo: 40, izquierda: 62 };
  const MAX_ETIQUETAS_DIRECTAS = 4;
  const SEPARACION_ETIQUETAS = 15;

  function pasoRedondo(rango, divisiones) {
    const bruto = rango / divisiones;
    const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
    const fraccion = bruto / potencia;
    const factor = fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 5 ? 5 : 10;
    return factor * potencia;
  }

  function dominioLineal(minimo, maximo) {
    if (minimo === maximo) {
      const margen = Math.abs(minimo) * 0.1 || 1;
      return [minimo - margen, maximo + margen];
    }
    const margen = (maximo - minimo) * 0.06;
    return [minimo - margen, maximo + margen];
  }

  function marcasLineales(minimo, maximo, divisiones) {
    const paso = pasoRedondo(maximo - minimo, divisiones);
    const marcas = [];
    const inicio = Math.ceil(minimo / paso - 1e-9);
    for (let i = inicio; i * paso <= maximo + paso * 1e-9; i++) marcas.push(i * paso);
    return { marcas, paso };
  }

  function marcasEnteras(minimo, maximo, divisiones) {
    const paso = Math.max(1, Math.round(pasoRedondo(Math.max(maximo - minimo, 1), divisiones)));
    const marcas = [];
    for (let v = Math.ceil(minimo / paso) * paso; v <= maximo; v += paso) marcas.push(v);
    return marcas;
  }

  function marcasLogaritmicas(exponenteMin, exponenteMax) {
    const salto = Math.max(1, Math.ceil((exponenteMax - exponenteMin) / 6));
    const marcas = [];
    for (let e = exponenteMin; e <= exponenteMax; e += salto) marcas.push(e);
    return marcas;
  }

  function textoPotencia(exponente) {
    return exponente === 0 ? '1' : `1e${String(exponente).replace('-', '−')}`;
  }

  function textoMarcaLineal(valor, paso) {
    if (Math.abs(valor) < paso * 1e-6) return '0';
    const absoluto = Math.abs(valor);
    if (absoluto >= 1e6 || absoluto < 1e-3) return valor.toExponential(1).replace('e+', 'e').replace(/-/g, '−');
    const decimales = Math.max(0, Math.min(6, -Math.floor(Math.log10(paso))));
    return valor.toFixed(decimales).replace('-', '−');
  }

  function construirTrazo(puntos, proyectarX, proyectarY, esValido) {
    let trazo = '';
    let enTramo = false;
    puntos.forEach((p) => {
      if (!esValido(p)) {
        enTramo = false;
        return;
      }
      trazo += `${enTramo ? 'L' : 'M'}${proyectarX(p.x).toFixed(2)} ${proyectarY(p.y).toFixed(2)}`;
      enTramo = true;
    });
    return trazo;
  }

  /** Reduce los puntos que no se distinguirían en pantalla, conservando el último. */
  function adelgazar(puntos, maximo) {
    if (puntos.length <= maximo) return puntos;
    const paso = Math.ceil(puntos.length / maximo);
    const resultado = puntos.filter((_, i) => i % paso === 0);
    if (resultado[resultado.length - 1] !== puntos[puntos.length - 1]) resultado.push(puntos[puntos.length - 1]);
    return resultado;
  }

  /** Separa verticalmente las etiquetas para que no se pisen. */
  function separarEtiquetas(etiquetas, minimo, maximo) {
    const ordenadas = etiquetas.slice().sort((a, b) => a.y - b.y);
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i].y - ordenadas[i - 1].y < SEPARACION_ETIQUETAS) ordenadas[i].y = ordenadas[i - 1].y + SEPARACION_ETIQUETAS;
    }
    const ultima = ordenadas[ordenadas.length - 1];
    if (ultima && ultima.y > maximo) {
      ultima.y = maximo;
      for (let i = ordenadas.length - 2; i >= 0; i--) {
        if (ordenadas[i + 1].y - ordenadas[i].y < SEPARACION_ETIQUETAS) ordenadas[i].y = ordenadas[i + 1].y - SEPARACION_ETIQUETAS;
      }
    }
    if (ordenadas[0] && ordenadas[0].y < minimo) ordenadas[0].y = minimo;
    return ordenadas;
  }

  /**
   * @param {HTMLElement} contenedor
   * @param {{series:{nombre:string,color:string,discontinua?:boolean,puntos:{x:number,y:number}[]}[],
   *          escalaY?:'lineal'|'log', tituloX?:string, referenciasY?:{valor:number,etiqueta?:string}[],
   *          formatearY?:(v:number)=>string, descripcion?:string}} configuracion
   */
  function crearGraficoLineas(contenedor, configuracion) {
    let config = configuracion;
    const ocultas = new Set();
    let marcador = null;
    let indiceActivo = null;
    let geometria = null;
    let anchoAnterior = 0;

    const leyenda = el('div', { class: 'grafico-leyenda' });
    const lienzo = el('div', { class: 'grafico-lienzo', tabIndex: 0, role: 'img' });
    const tooltip = el('div', { class: 'grafico-tooltip', hidden: true });
    const raiz = el('div', { class: 'grafico' }, leyenda, lienzo, tooltip);
    vaciar(contenedor);
    contenedor.append(raiz);

    const seriesVisibles = () => config.series.filter((s) => !ocultas.has(s.nombre));

    function dibujarLeyenda() {
      vaciar(leyenda);
      if (config.series.length < 2) return;
      config.series.forEach((serie) => {
        const clave = el('span', { class: `clave-serie${serie.discontinua ? ' clave-serie-discontinua' : ''}`, style: `border-top-color:${serie.color}` });
        leyenda.append(el('button', {
          type: 'button',
          'aria-pressed': String(!ocultas.has(serie.nombre)),
          title: 'Mostrar u ocultar esta serie',
          onclick: () => {
            if (ocultas.has(serie.nombre)) ocultas.delete(serie.nombre);
            else if (seriesVisibles().length > 1) ocultas.add(serie.nombre);
            dibujarLeyenda();
            dibujar();
          },
        }, clave, serie.nombre));
      });
    }

    function calcularEjeY(series) {
      const esLog = config.escalaY === 'log';
      const valores = series.flatMap((s) => s.puntos.map((p) => p.y)).filter((y) => Number.isFinite(y) && (!esLog || y > 0));
      (config.referenciasY || []).forEach((r) => {
        if (Number.isFinite(r.valor) && (!esLog || r.valor > 0)) valores.push(r.valor);
      });
      if (valores.length === 0) return null;
      const minimo = valores.reduce((a, b) => Math.min(a, b));
      const maximo = valores.reduce((a, b) => Math.max(a, b));

      if (esLog) {
        const exponenteMin = Math.floor(Math.log10(minimo));
        let exponenteMax = Math.ceil(Math.log10(maximo));
        if (exponenteMin === exponenteMax) exponenteMax++;
        return {
          proyectar: (y, alto) => MARGEN.arriba + alto * (1 - (Math.log10(y) - exponenteMin) / (exponenteMax - exponenteMin)),
          marcas: marcasLogaritmicas(exponenteMin, exponenteMax).map((e) => ({ valor: Math.pow(10, e), texto: textoPotencia(e) })),
          esValido: (p) => Number.isFinite(p.y) && p.y > 0,
        };
      }
      const [yMin, yMax] = dominioLineal(minimo, maximo);
      const { marcas, paso } = marcasLineales(yMin, yMax, 5);
      return {
        proyectar: (y, alto) => MARGEN.arriba + alto * (1 - (y - yMin) / (yMax - yMin)),
        marcas: marcas.map((v) => ({ valor: v, texto: textoMarcaLineal(v, paso) })),
        esValido: (p) => Number.isFinite(p.y),
      };
    }

    function dibujar() {
      const ancho = Math.max(lienzo.clientWidth, 280);
      anchoAnterior = lienzo.clientWidth;
      vaciar(lienzo);
      tooltip.hidden = true;
      geometria = null;

      const series = seriesVisibles();
      const ejeY = calcularEjeY(series);
      lienzo.setAttribute('aria-label', config.descripcion || 'Gráfico de líneas');
      if (!ejeY) {
        lienzo.append(el('p', { class: 'nota-tabla' }, 'No hay valores que se puedan representar en esta escala.'));
        return;
      }

      const conEtiquetas = series.length >= 2 && series.length <= MAX_ETIQUETAS_DIRECTAS && ancho >= 420;
      const largoEtiqueta = conEtiquetas ? Math.max(...series.map((s) => s.nombre.length)) * 7.2 + 12 : 0;
      const derecha = MARGEN.derecha + largoEtiqueta;
      const anchoUtil = ancho - MARGEN.izquierda - derecha;
      const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;

      const todosX = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.x)))].sort((a, b) => a - b);
      const xMin = todosX[0];
      const xMax = todosX[todosX.length - 1] === xMin ? xMin + 1 : todosX[todosX.length - 1];
      const proyectarX = (x) => MARGEN.izquierda + (anchoUtil * (x - xMin)) / (xMax - xMin);
      const proyectarY = (y) => ejeY.proyectar(y, altoUtil);

      const lamina = svg('svg', { viewBox: `0 0 ${ancho} ${ALTO}`, 'aria-hidden': 'true' });

      ejeY.marcas.forEach((marca) => {
        const y = proyectarY(marca.valor);
        lamina.append(
          svg('line', { class: 'rejilla-linea', x1: MARGEN.izquierda, x2: ancho - derecha, y1: y, y2: y }),
          svg('text', { x: MARGEN.izquierda - 8, y: y + 4, 'text-anchor': 'end' }, marca.texto)
        );
      });

      const baseY = MARGEN.arriba + altoUtil;
      lamina.append(svg('line', { class: 'eje-linea', x1: MARGEN.izquierda, x2: ancho - derecha, y1: baseY, y2: baseY }));
      marcasEnteras(xMin, xMax, anchoUtil < 300 ? 4 : 8).forEach((valor) => {
        const x = proyectarX(valor);
        lamina.append(
          svg('line', { class: 'eje-linea', x1: x, x2: x, y1: baseY, y2: baseY + 4 }),
          svg('text', { x, y: baseY + 17, 'text-anchor': 'middle' }, valor)
        );
      });
      if (config.tituloX) {
        lamina.append(svg('text', { x: MARGEN.izquierda + anchoUtil / 2, y: ALTO - 5, 'text-anchor': 'middle' }, config.tituloX));
      }

      (config.referenciasY || []).forEach((referencia) => {
        if (!ejeY.esValido({ y: referencia.valor })) return;
        const y = proyectarY(referencia.valor);
        lamina.append(svg('line', { class: 'linea-referencia', x1: MARGEN.izquierda, x2: ancho - derecha, y1: y, y2: y }));
        if (referencia.etiqueta) {
          lamina.append(svg('text', { x: MARGEN.izquierda + 6, y: y - 5 }, referencia.etiqueta));
        }
      });

      if (marcador !== null && marcador >= xMin && marcador <= xMax) {
        const x = proyectarX(marcador);
        lamina.append(svg('line', { class: 'linea-marcador', x1: x, x2: x, y1: MARGEN.arriba, y2: baseY }));
      }

      const maximoPuntos = Math.ceil(anchoUtil * 1.5);
      series.forEach((serie) => {
        const puntos = adelgazar(serie.puntos, maximoPuntos);
        lamina.append(svg('path', {
          d: construirTrazo(puntos, proyectarX, proyectarY, ejeY.esValido),
          fill: 'none',
          'stroke-width': 2,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
          'stroke-dasharray': serie.discontinua ? '6 4' : null,
          style: `stroke:${serie.color}`,
        }));
        if (serie.puntos.length <= 30) {
          serie.puntos.filter(ejeY.esValido).forEach((p) => {
            lamina.append(svg('circle', {
              cx: proyectarX(p.x), cy: proyectarY(p.y), r: 3.2,
              'stroke-width': 1.5,
              style: `fill:${serie.color};stroke:var(--superficie)`,
            }));
          });
        }
      });

      if (conEtiquetas) {
        const etiquetas = series.map((serie) => {
          const validos = serie.puntos.filter(ejeY.esValido);
          const ultimo = validos[validos.length - 1];
          return ultimo ? { nombre: serie.nombre, y: proyectarY(ultimo.y) + 4 } : null;
        }).filter(Boolean);
        separarEtiquetas(etiquetas, MARGEN.arriba + 8, baseY).forEach((e) => {
          lamina.append(svg('text', { class: 'etiqueta-directa', x: ancho - derecha + 8, y: e.y }, e.nombre));
        });
      }

      const capaInteractiva = svg('g');
      lamina.append(capaInteractiva);
      lienzo.append(lamina);

      geometria = { todosX, proyectarX, proyectarY, ejeY, series, capaInteractiva, ancho, baseY };
      if (indiceActivo !== null && indiceActivo >= todosX.length) indiceActivo = null;
    }

    function mostrarPosicion(indice) {
      if (!geometria) return;
      indiceActivo = Math.max(0, Math.min(geometria.todosX.length - 1, indice));
      const { todosX, proyectarX, proyectarY, ejeY, series, capaInteractiva, ancho, baseY } = geometria;
      const valorX = todosX[indiceActivo];
      const x = proyectarX(valorX);

      vaciar(capaInteractiva);
      capaInteractiva.append(svg('line', { class: 'linea-cruz', x1: x, x2: x, y1: MARGEN.arriba, y2: baseY }));

      vaciar(tooltip);
      tooltip.append(el('div', { class: 'tooltip-titulo' }, `Iteración ${valorX}`));
      const formatear = config.formatearY || String;
      series.forEach((serie) => {
        const punto = serie.puntos.find((p) => p.x === valorX);
        if (!punto) return;
        if (ejeY.esValido(punto)) {
          capaInteractiva.append(svg('circle', { cx: x, cy: proyectarY(punto.y), r: 4.5, 'stroke-width': 2, style: `fill:${serie.color};stroke:var(--superficie)` }));
        }
        tooltip.append(el('div', { class: 'tooltip-fila' },
          el('span', { class: `clave-serie${serie.discontinua ? ' clave-serie-discontinua' : ''}`, style: `border-top-color:${serie.color};width:14px` }),
          el('span', { class: 'tooltip-valor' }, formatear(punto.y)),
          el('span', { class: 'tooltip-nombre' }, serie.nombre)
        ));
      });

      tooltip.hidden = false;
      const escala = lienzo.clientWidth / ancho;
      const posicion = x * escala;
      const anchoTooltip = tooltip.offsetWidth;
      const izquierda = posicion + 14 + anchoTooltip > lienzo.clientWidth ? Math.max(0, posicion - anchoTooltip - 14) : posicion + 14;
      tooltip.style.left = `${izquierda}px`;
      tooltip.style.top = `${lienzo.offsetTop + 10}px`;
    }

    function ocultarTooltip() {
      tooltip.hidden = true;
      if (geometria) vaciar(geometria.capaInteractiva);
    }

    function indiceDesdePuntero(evento) {
      if (!geometria) return 0;
      const caja = lienzo.getBoundingClientRect();
      const xSvg = ((evento.clientX - caja.left) / caja.width) * geometria.ancho;
      let mejor = 0;
      let distancia = Infinity;
      geometria.todosX.forEach((valor, i) => {
        const d = Math.abs(geometria.proyectarX(valor) - xSvg);
        if (d < distancia) {
          distancia = d;
          mejor = i;
        }
      });
      return mejor;
    }

    lienzo.addEventListener('pointermove', (e) => mostrarPosicion(indiceDesdePuntero(e)));
    lienzo.addEventListener('pointerleave', ocultarTooltip);
    lienzo.addEventListener('blur', ocultarTooltip);
    lienzo.addEventListener('keydown', (evento) => {
      if (!geometria) return;
      const ultimo = geometria.todosX.length - 1;
      const destinos = {
        ArrowRight: indiceActivo === null ? 0 : indiceActivo + 1,
        ArrowLeft: indiceActivo === null ? ultimo : indiceActivo - 1,
        Home: 0,
        End: ultimo,
      };
      if (evento.key in destinos) {
        evento.preventDefault();
        mostrarPosicion(destinos[evento.key]);
      }
    });

    const observador = new ResizeObserver(() => {
      if (lienzo.clientWidth !== anchoAnterior && lienzo.clientWidth > 0) dibujar();
    });
    observador.observe(lienzo);

    dibujarLeyenda();
    dibujar();

    return {
      actualizar(nuevaConfiguracion) {
        config = { ...config, ...nuevaConfiguracion };
        dibujar();
      },
      marcar(valorX) {
        marcador = valorX;
        dibujar();
      },
      destruir() {
        observador.disconnect();
        vaciar(contenedor);
      },
    };
  }

  MI.graficos.crearGraficoLineas = crearGraficoLineas;
})(window.MetodosIterativos);
