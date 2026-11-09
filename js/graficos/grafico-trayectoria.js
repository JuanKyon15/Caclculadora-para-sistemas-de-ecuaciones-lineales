/**
 * Recorrido de las aproximaciones en el plano, para sistemas de 2×2.
 * Cada ecuación se dibuja como una recta y la solución es su intersección.
 */
(function (MI) {
  'use strict';

  const { svg, vaciar } = MI.interfaz.dom;
  const { formatearNumero } = MI.interfaz.formato;

  const ANCHO = 520;
  const ALTO = 340;
  const BORDE = 30;

  /** Corta el recorrido cuando se aleja demasiado, para que la vista siga siendo útil. */
  function recortarRecorrido(puntos, solucion) {
    const distancia = (p) => Math.max(Math.abs(p[0] - solucion[0]), Math.abs(p[1] - solucion[1]));
    const limite = 3 * Math.max(distancia(puntos[0]), 1);
    const recortado = [];
    for (const punto of puntos) {
      if (distancia(punto) > limite) break;
      recortado.push(punto);
      if (recortado.length >= 30) break;
    }
    return recortado.length >= 2 ? recortado : puntos.slice(0, 2);
  }

  /** Extremos del segmento visible de la recta a·x + b·y = c. */
  function extremosRecta([a, b], c, caja) {
    const candidatos = [];
    const dentroX = (x) => x >= caja.xMin - 1e-9 && x <= caja.xMax + 1e-9;
    const dentroY = (y) => y >= caja.yMin - 1e-9 && y <= caja.yMax + 1e-9;
    if (b !== 0) {
      [caja.xMin, caja.xMax].forEach((x) => {
        const y = (c - a * x) / b;
        if (dentroY(y)) candidatos.push([x, y]);
      });
    }
    if (a !== 0) {
      [caja.yMin, caja.yMax].forEach((y) => {
        const x = (c - b * y) / a;
        if (dentroX(x)) candidatos.push([x, y]);
      });
    }
    return candidatos.length >= 2 ? [candidatos[0], candidatos[candidatos.length - 1]] : null;
  }

  /**
   * @param {HTMLElement} contenedor
   * @param {{A:number[][],b:number[],solucion:number[],
   *          recorridos:{nombre:string,color:string,puntos:number[][]}[],
   *          variables:string[]}} datos
   */
  function dibujarTrayectoria(contenedor, datos) {
    const { A, b, solucion, recorridos, variables } = datos;
    const visibles = recorridos.map((r) => ({ ...r, puntos: recortarRecorrido(r.puntos, solucion) }));

    const todos = visibles.flatMap((r) => r.puntos).concat([solucion]);
    const xs = todos.map((p) => p[0]);
    const ys = todos.map((p) => p[1]);
    const relleno = (min, max) => Math.max((max - min) * 0.14, 0.5);
    const rellenoX = relleno(Math.min(...xs), Math.max(...xs));
    const rellenoY = relleno(Math.min(...ys), Math.max(...ys));
    const caja = {
      xMin: Math.min(...xs) - rellenoX,
      xMax: Math.max(...xs) + rellenoX,
      yMin: Math.min(...ys) - rellenoY,
      yMax: Math.max(...ys) + rellenoY,
    };
    const proyectar = ([x, y]) => [
      BORDE + ((x - caja.xMin) / (caja.xMax - caja.xMin)) * (ANCHO - 2 * BORDE),
      ALTO - BORDE - ((y - caja.yMin) / (caja.yMax - caja.yMin)) * (ALTO - 2 * BORDE),
    ];

    const lamina = svg('svg', {
      viewBox: `0 0 ${ANCHO} ${ALTO}`,
      role: 'img',
      'aria-label': `Recorrido de las aproximaciones hacia la solución (${formatearNumero(solucion[0], 3)}, ${formatearNumero(solucion[1], 3)}).`,
    });

    if (caja.xMin < 0 && caja.xMax > 0) {
      const [x] = proyectar([0, 0]);
      lamina.append(svg('line', { class: 'eje-linea', x1: x, x2: x, y1: BORDE, y2: ALTO - BORDE }));
    }
    if (caja.yMin < 0 && caja.yMax > 0) {
      const [, y] = proyectar([0, 0]);
      lamina.append(svg('line', { class: 'eje-linea', x1: BORDE, x2: ANCHO - BORDE, y1: y, y2: y }));
    }

    A.forEach((fila, i) => {
      const extremos = extremosRecta(fila, b[i], caja);
      if (!extremos) return;
      const [p, q] = extremos.map(proyectar);
      lamina.append(svg('line', { class: 'recta', x1: p[0], y1: p[1], x2: q[0], y2: q[1] }));
    });

    visibles.forEach((recorrido) => {
      const proyectados = recorrido.puntos.map(proyectar);
      lamina.append(svg('polyline', {
        points: proyectados.map((p) => p.join(',')).join(' '),
        fill: 'none',
        'stroke-width': 2,
        'stroke-linejoin': 'round',
        style: `stroke:${recorrido.color}`,
      }));
      proyectados.forEach((p, k) => {
        lamina.append(svg('circle', {
          cx: p[0], cy: p[1], r: 4, 'stroke-width': 1.5,
          style: `fill:${recorrido.color};stroke:var(--superficie)`,
        }, svg('title', {}, `${recorrido.nombre}, iteración ${k}: ${variables[0]} = ${formatearNumero(recorrido.puntos[k][0], 4)}, ${variables[1]} = ${formatearNumero(recorrido.puntos[k][1], 4)}`)));
      });
    });

    const [sx, sy] = proyectar(solucion);
    lamina.append(svg('circle', { cx: sx, cy: sy, r: 8, fill: 'none', 'stroke-width': 1.5, style: 'stroke:var(--tinta)' }));

    let posicionLeyenda = BORDE;
    visibles.forEach((recorrido) => {
      lamina.append(
        svg('line', { x1: posicionLeyenda, x2: posicionLeyenda + 16, y1: 14, y2: 14, 'stroke-width': 2, style: `stroke:${recorrido.color}` }),
        svg('text', { class: 'etiqueta-directa', x: posicionLeyenda + 21, y: 18 }, recorrido.nombre)
      );
      posicionLeyenda += 34 + recorrido.nombre.length * 7.5;
    });

    vaciar(contenedor);
    contenedor.append(lamina);
  }

  MI.graficos.dibujarTrayectoria = dibujarTrayectoria;
})(window.MetodosIterativos);
