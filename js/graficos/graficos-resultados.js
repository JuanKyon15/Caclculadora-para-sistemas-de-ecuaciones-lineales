/**
 * Convierte los resultados reales de los algoritmos en series para los gráficos
 * del laboratorio. Aquí no se genera ningún dato: todo proviene de `iteraciones`.
 */
(function (MI) {
  'use strict';

  const { el, vaciar } = MI.interfaz.dom;
  const { formatearNumero, formatearError, textoVariable } = MI.interfaz.formato;
  const { crearGraficoLineas, dibujarTrayectoria } = MI.graficos;

  const COLOR_METODO = Object.freeze({ jacobi: 'var(--serie-1)', 'gauss-seidel': 'var(--serie-2)' });
  const CANTIDAD_COLORES = 8;

  /** A partir de la novena variable se repiten colores con trazo discontinuo. */
  const estiloVariable = (indice) => ({
    color: `var(--serie-${(indice % CANTIDAD_COLORES) + 1})`,
    discontinua: indice >= CANTIDAD_COLORES,
  });

  function seriesDeVariables(resultado, variables) {
    return variables.map((nombre, i) => ({
      nombre: textoVariable(nombre),
      ...estiloVariable(i),
      puntos: resultado.iteraciones.map((it) => ({ x: it.k, y: it.x[i] })),
    }));
  }

  function serieDeError(resultado, nombre, color) {
    return {
      nombre,
      color,
      puntos: resultado.iteraciones.filter((it) => it.error !== null).map((it) => ({ x: it.k, y: it.error })),
    };
  }

  function crearBloque(titulo, pie, ancho, alCambiarEscala) {
    const destino = el('div');
    const cabecera = el('div', { class: 'bloque-grafico-cabecera' }, el('h4', {}, titulo));
    if (alCambiarEscala) {
      const crearBoton = (etiqueta, escala, activo) => el('button', {
        type: 'button',
        'aria-pressed': String(activo),
        onclick: (evento) => {
          const elegido = evento.currentTarget;
          elegido.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === elegido)));
          alCambiarEscala(escala);
        },
      }, etiqueta);
      cabecera.append(el('div', { class: 'interruptor', role: 'group', 'aria-label': 'Escala del eje vertical' },
        crearBoton('Logarítmica', 'log', true), crearBoton('Lineal', 'lineal', false)));
    }
    const bloque = el('div', { class: `bloque-grafico${ancho ? ' bloque-grafico-ancho' : ''}` }, cabecera, destino, pie ? el('p', { class: 'pie-grafico' }, pie) : null);
    return { bloque, destino };
  }

  /**
   * @returns {{marcar:(k:number)=>void, destruir:()=>void}}
   */
  function mostrarGraficos(contenedor, datos) {
    const { resultados, visible, variables, sistema, referencia, tolerancia, unidad, decimales } = datos;
    const marcables = [];
    const todos = [];
    vaciar(contenedor);

    const lineaTolerancia = { valor: tolerancia, etiqueta: 'tolerancia' };
    const conUnidad = (v) => formatearError(v) + (unidad || '');

    // 1. Evolución de las variables.
    const referenciasSolucion = referencia.solucion && variables.length <= 4 ? referencia.solucion.map((valor) => ({ valor })) : [];
    const aproximaciones = crearBloque(
      `Aproximaciones de las variables · ${visible.nombreMetodo}`,
      referenciasSolucion.length ? 'Las líneas punteadas marcan la solución obtenida por eliminación gaussiana.' : null,
      false
    );
    contenedor.append(aproximaciones.bloque);
    const graficoVariables = crearGraficoLineas(aproximaciones.destino, {
      series: seriesDeVariables(visible, variables),
      tituloX: 'Iteración k',
      referenciasY: referenciasSolucion,
      formatearY: (v) => formatearNumero(v, decimales),
      descripcion: `Evolución de cada variable por iteración con ${visible.nombreMetodo}.`,
    });
    marcables.push(graficoVariables);
    todos.push(graficoVariables);

    // 2. Error por iteración.
    let graficoError = null;
    const bloqueError = crearBloque(
      `Error en cada iteración · ${visible.nombreMetodo}`,
      'Un error exactamente igual a cero no se puede dibujar en escala logarítmica.',
      false,
      (escala) => graficoError.actualizar({ escalaY: escala })
    );
    contenedor.append(bloqueError.bloque);
    graficoError = crearGraficoLineas(bloqueError.destino, {
      series: [serieDeError(visible, 'Error', COLOR_METODO[visible.metodoId])],
      escalaY: 'log',
      tituloX: 'Iteración k',
      referenciasY: [lineaTolerancia],
      formatearY: conUnidad,
      descripcion: `Error por iteración con ${visible.nombreMetodo}, en escala logarítmica.`,
    });
    marcables.push(graficoError);
    todos.push(graficoError);

    // 3. Comparación entre métodos.
    if (resultados.jacobi && resultados['gauss-seidel']) {
      let graficoComparacion = null;
      const bloque = crearBloque(
        'Comparación del error: Jacobi y Gauss-Seidel',
        'Cuanto más pronunciada es la caída, más rápida es la convergencia.',
        true,
        (escala) => graficoComparacion.actualizar({ escalaY: escala })
      );
      contenedor.append(bloque.bloque);
      graficoComparacion = crearGraficoLineas(bloque.destino, {
        series: [
          serieDeError(resultados.jacobi, 'Jacobi', COLOR_METODO.jacobi),
          serieDeError(resultados['gauss-seidel'], 'Gauss-Seidel', COLOR_METODO['gauss-seidel']),
        ],
        escalaY: 'log',
        tituloX: 'Iteración k',
        referenciasY: [lineaTolerancia],
        formatearY: conUnidad,
        descripcion: 'Error por iteración de ambos métodos, en escala logarítmica.',
      });
      todos.push(graficoComparacion);
    } else {
      contenedor.append(el('p', { class: 'nota-tabla bloque-grafico-ancho' }, 'Selecciona «Comparar ambos» y calcula de nuevo para superponer los errores de los dos métodos.'));
    }

    // 4. Recorrido en el plano (solo sistemas de 2×2 con solución única).
    if (variables.length === 2 && referencia.solucion) {
      const bloque = crearBloque('Recorrido en el plano', 'Cada recta es una ecuación. El círculo marca la solución.', true);
      const lienzo = el('div', { class: 'trayectoria', style: 'max-width:640px' });
      bloque.destino.append(lienzo);
      contenedor.append(bloque.bloque);
      dibujarTrayectoria(lienzo, {
        A: sistema.A,
        b: sistema.b,
        solucion: referencia.solucion,
        variables: variables.map(textoVariable),
        recorridos: Object.values(resultados).filter(Boolean).map((r) => ({
          nombre: r.nombreMetodo,
          color: COLOR_METODO[r.metodoId],
          puntos: r.iteraciones.map((it) => it.x),
        })),
      });
    }

    return {
      marcar: (k) => marcables.forEach((g) => g.marcar(k)),
      destruir: () => todos.forEach((g) => g.destruir()),
    };
  }

  MI.graficos.resultados = { mostrarGraficos, COLOR_METODO };
})(window.MetodosIterativos);
