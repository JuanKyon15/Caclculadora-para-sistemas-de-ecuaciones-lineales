/**
 * Formulario dinámico del sistema: construye la rejilla A, b y x⁰ según la
 * dimensión elegida, y lee o escribe sus valores.
 */
(function (MI) {
  'use strict';

  const { el, vaciar } = MI.interfaz.dom;
  const { formatearCoeficiente, textoVariable } = MI.interfaz.formato;

  const textoCelda = (valor) => formatearCoeficiente(valor).replace(/−/g, '-');

  function crearFormularioSistema(contenedor, alCambiar) {
    let dimension = 0;
    let nombresVariables = [];
    let celdasA = [];
    let celdasB = [];
    let celdasX0 = [];

    const nombresPorDefecto = (n) => Array.from({ length: n }, (_, i) => `x${i + 1}`);

    function crearCelda(valor, descripcion, esDiagonal) {
      return el('input', {
        type: 'text',
        inputMode: 'text',
        class: `celda${esDiagonal ? ' celda-diagonal' : ''}`,
        value: valor,
        'aria-label': descripcion,
        oninput: (evento) => {
          evento.target.classList.remove('celda-invalida');
          alCambiar();
        },
      });
    }

    function crearBloque(titulo, columnas, encabezados, celdas) {
      return el('div', { class: 'bloque-matriz', style: `--columnas:${columnas}` },
        el('div', { class: 'bloque-titulo' }, titulo),
        el('div', { class: 'encabezados', 'aria-hidden': 'true' }, encabezados.map((t) => el('span', {}, t))),
        el('div', { class: 'corchetes' }, celdas));
    }

    /** Reconstruye la rejilla con los valores indicados. */
    function construir(valoresA, valoresB, valoresX0, nombres) {
      dimension = valoresA.length;
      nombresVariables = nombres;
      const etiquetas = nombres.map(textoVariable);

      celdasA = valoresA.map((fila, i) => fila.map((v, j) => crearCelda(v, `Coeficiente fila ${i + 1}, columna ${j + 1}`, i === j)));
      celdasB = valoresB.map((v, i) => crearCelda(v, `Término independiente de la ecuación ${i + 1}`));
      celdasX0 = valoresX0.map((v, i) => crearCelda(v, `Valor inicial de ${etiquetas[i]}`));

      vaciar(contenedor);
      contenedor.append(el('div', { class: 'rejilla-sistema' },
        crearBloque('A', dimension, etiquetas, celdasA.flat()),
        el('span', { class: 'signo-igual', 'aria-hidden': 'true' }, '='),
        crearBloque('b', 1, [' '], celdasB),
        crearBloque('x⁽⁰⁾', 1, ['inicial'], celdasX0)
      ));
    }

    /** Cambia la dimensión conservando los valores que ya estaban escritos. */
    function establecerDimension(n) {
      const leer = (celda, respaldo) => (celda ? celda.value : respaldo);
      const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => leer(celdasA[i]?.[j], '0')));
      const b = Array.from({ length: n }, (_, i) => leer(celdasB[i], '0'));
      const x0 = Array.from({ length: n }, (_, i) => leer(celdasX0[i], '0'));
      construir(A, b, x0, n === dimension ? nombresVariables : nombresPorDefecto(n));
    }

    function cargarSistema({ A, b, x0, variables }) {
      construir(
        A.map((fila) => fila.map(textoCelda)),
        b.map(textoCelda),
        (x0 || b.map(() => 0)).map(textoCelda),
        variables || nombresPorDefecto(A.length)
      );
    }

    const leerEntradaSistema = () => ({
      matriz: celdasA.map((fila) => fila.map((c) => c.value)),
      terminos: celdasB.map((c) => c.value),
      inicial: celdasX0.map((c) => c.value),
    });

    const todasLasCeldas = () => [...celdasA.flat(), ...celdasB, ...celdasX0];

    function limpiarMarcas() {
      todasLasCeldas().forEach((c) => c.classList.remove('celda-invalida'));
    }

    /** Resalta las celdas señaladas por el validador y devuelve la primera. */
    function marcarErrores(errores) {
      limpiarMarcas();
      const marcadas = [];
      const marcar = (celda) => {
        if (!celda) return;
        celda.classList.add('celda-invalida');
        marcadas.push(celda);
      };
      errores.forEach(({ campo, fila, columna }) => {
        if (campo === 'b') marcar(celdasB[fila]);
        else if (campo === 'x0') marcar(celdasX0[fila]);
        else if (campo === 'A') {
          if (fila !== undefined && columna !== undefined) marcar(celdasA[fila]?.[columna]);
          else if (fila !== undefined) (celdasA[fila] || []).forEach(marcar);
          else if (columna !== undefined) celdasA.forEach((f) => marcar(f[columna]));
        }
      });
      return marcadas[0] || null;
    }

    function rellenarVacios() {
      let cambios = 0;
      todasLasCeldas().forEach((c) => {
        if (c.value.trim() === '') {
          c.value = '0';
          c.classList.remove('celda-invalida');
          cambios++;
        }
      });
      return cambios;
    }

    function limpiarTodo() {
      todasLasCeldas().forEach((c) => {
        c.value = '';
        c.classList.remove('celda-invalida');
      });
    }

    function iniciarEnCeros() {
      celdasX0.forEach((c) => {
        c.value = '0';
        c.classList.remove('celda-invalida');
      });
    }

    /** Reordena filas de A y b. x⁰ no cambia porque pertenece a las variables. */
    function aplicarPermutacion(permutacion) {
      const { matriz, terminos, inicial } = leerEntradaSistema();
      construir(permutacion.map((f) => matriz[f]), permutacion.map((f) => terminos[f]), inicial, nombresVariables);
    }

    return {
      establecerDimension,
      cargarSistema,
      leerEntradaSistema,
      marcarErrores,
      limpiarMarcas,
      rellenarVacios,
      limpiarTodo,
      iniciarEnCeros,
      aplicarPermutacion,
      obtenerDimension: () => dimension,
      obtenerVariables: () => nombresVariables.slice(),
    };
  }

  MI.interfaz.crearFormularioSistema = crearFormularioSistema;
})(window.MetodosIterativos);
