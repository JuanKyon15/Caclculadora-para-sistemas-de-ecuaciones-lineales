/**
 * Completa la teoría con resultados calculados al cargar la página por los
 * mismos algoritmos del laboratorio. Ningún número de estos ejemplos está
 * escrito a mano.
 */
(function (MI) {
  'use strict';

  const { el, vaciar } = MI.interfaz.dom;
  const { formatearNumero, formatearError, formatearRadio } = MI.interfaz.formato;
  const { motorIterativo, jacobi, gaussSeidel, analisisConvergencia } = MI.matematicas;
  const { ESTADO } = motorIterativo;
  const { sistemasEjemplo } = MI.datos;
  const { COLOR_METODO } = MI.graficos.resultados;

  const OPCIONES = Object.freeze({ tolerancia: 1e-6, maxIteraciones: 1000, tipoError: 'absoluto', norma: 'infinito', decimales: null });
  const FILAS_EJEMPLO = 6;

  const buscarEjemplo = (id) => sistemasEjemplo.find((s) => s.id === id);
  const conInicioCero = (s) => ({ A: s.A, b: s.b, x0: s.b.map(() => 0) });
  const correr = (metodo, s) => motorIterativo.ejecutarMetodo(metodo, conInicioCero(s), OPCIONES);

  function crearTablaResumen(resultado, variables) {
    const filas = resultado.iteraciones;
    const visibles = filas.slice(0, FILAS_EJEMPLO);
    const ultima = filas[filas.length - 1];
    const crearFila = (it) => el('tr', {},
      el('td', {}, String(it.k)),
      it.x.map((v) => el('td', {}, formatearNumero(v, 6))),
      el('td', {}, formatearError(it.error)));

    return el('div', { class: 'tabla-desplazable' },
      el('table', { class: 'tabla-compacta' },
        el('thead', {}, el('tr', {}, ['k', ...variables, 'Error'].map((t) => el('th', { scope: 'col' }, t)))),
        el('tbody', {},
          visibles.map(crearFila),
          filas.length > FILAS_EJEMPLO + 1 ? el('tr', {}, el('td', { colSpan: variables.length + 2, style: 'text-align:center' }, '⋮')) : null,
          filas.length > FILAS_EJEMPLO ? crearFila(ultima) : null)
      ));
  }

  function completarEjemplo(idContenedor, metodo, otroMetodo) {
    const sistema = buscarEjemplo('tres-dominante');
    const variables = sistema.variables;
    const resultado = correr(metodo, sistema);
    const contenedor = document.getElementById(idContenedor);
    vaciar(contenedor);

    contenedor.append(
      el('p', {}, el('strong', {}, 'Paso 2. Primera iteración, con los valores numéricos:')),
      MI.interfaz.crearDesglose({
        metodo,
        A: sistema.A,
        b: sistema.b,
        xAnterior: resultado.iteraciones[0].x,
        k: 1,
        variables,
        decimales: 4,
      }),
      el('p', {}, el('strong', {}, 'Paso 3. Se repite hasta cumplir el criterio de parada:')),
      crearTablaResumen(resultado, variables),
      el('p', {}, `Con tolerancia ${formatearError(OPCIONES.tolerancia)} y error absoluto en norma infinito, ${metodo.nombre} se detiene en la iteración ${resultado.iteracionesRealizadas} y ${otroMetodo.nombre} en la iteración ${correr(otroMetodo, sistema).iteracionesRealizadas}. La solución exacta es x = ${sistema.solucionConocida[0]}, y = ${sistema.solucionConocida[1]}, z = ${sistema.solucionConocida[2]}.`)
    );
  }

  function textoEjecucion(resultado) {
    if (resultado.estado === ESTADO.TOLERANCIA_ALCANZADA) return `${resultado.iteracionesRealizadas} iter.`;
    if (resultado.estado === ESTADO.DIVERGENCIA_DETECTADA) return 'Diverge';
    return `Sin llegar en ${resultado.maxIteraciones}`;
  }

  function completarComparacion(alProbarEjemplo) {
    const cuerpo = document.getElementById('comparacion-ejemplos');
    vaciar(cuerpo);
    sistemasEjemplo.filter((s) => s.A.every((fila, i) => fila[i] !== 0)).forEach((sistema) => {
      const analisis = analisisConvergencia.analizarSistema(sistema.A, sistema.b);
      cuerpo.append(el('tr', { dataset: { ejemplo: sistema.id } },
        el('th', { scope: 'row' }, sistema.nombre),
        el('td', {}, formatearRadio(analisis.metodos.jacobi.radioEspectral)),
        el('td', {}, textoEjecucion(correr(jacobi, sistema))),
        el('td', {}, formatearRadio(analisis.metodos['gauss-seidel'].radioEspectral)),
        el('td', {}, textoEjecucion(correr(gaussSeidel, sistema))),
        el('td', {}, el('button', { type: 'button', class: 'boton boton-pequeno', onclick: () => alProbarEjemplo(sistema.id) }, 'Probar'))
      ));
    });
  }

  function dibujarRecorrido() {
    const sistema = buscarEjemplo('dos-variables');
    MI.graficos.dibujarTrayectoria(document.getElementById('trayectoria-comparacion'), {
      A: sistema.A,
      b: sistema.b,
      solucion: sistema.solucionConocida,
      variables: sistema.variables,
      recorridos: [jacobi, gaussSeidel].map((metodo) => ({
        nombre: metodo.nombre,
        color: COLOR_METODO[metodo.id],
        puntos: correr(metodo, sistema).iteraciones.map((it) => it.x),
      })),
    });
  }

  function completarTeoria(alProbarEjemplo) {
    dibujarRecorrido();
    completarEjemplo('ejemplo-jacobi', jacobi, gaussSeidel);
    completarEjemplo('ejemplo-gauss-seidel', gaussSeidel, jacobi);
    completarComparacion(alProbarEjemplo);
  }

  MI.interfaz.completarTeoria = completarTeoria;
})(window.MetodosIterativos);
