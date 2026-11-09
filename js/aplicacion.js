/**
 * Orquestador: conecta el formulario con la validación, los algoritmos y las
 * vistas. Es el único módulo que conoce a todos los demás.
 */
(function (MI) {
  'use strict';

  const { el, vaciar } = MI.interfaz.dom;
  const { jacobi, gaussSeidel, motorIterativo, analisisConvergencia, reordenamientoFilas } = MI.matematicas;
  const { validadorSistema, interpreteEcuaciones, conversionNumerica } = MI.validacion;
  const { sistemasEjemplo } = MI.datos;

  const METODOS = Object.freeze({ jacobi, 'gauss-seidel': gaussSeidel });
  const $ = (id) => document.getElementById(id);

  const estado = {
    resultados: {},
    analisis: null,
    sistema: null,
    opciones: null,
    variables: [],
    metodoVisible: 'jacobi',
    graficos: null,
  };

    const metodoElegido = () => document.querySelector('input[name="metodo"]:checked').value;

  const formulario = MI.interfaz.crearFormularioSistema($('rejilla-sistema'), marcarDesactualizado);
  const tabla = MI.interfaz.crearTablaIteraciones($('tabla-iteraciones'), (k) => explorador.ir(k));
  const explorador = MI.interfaz.crearExploradorPasos($('explorador-pasos'), alCambiarIteracion);

  function alCambiarIteracion(k) {
    tabla.seleccionar(k);
    if (estado.graficos) estado.graficos.marcar(k);
  }

  function marcarDesactualizado() {
    if (!$('resultados').hidden) $('aviso-desactualizado').hidden = false;
  }

  function mostrarMensajes({ errores = [], advertencias = [], informacion = [], accionReordenar = false }) {
    const zona = $('mensajes');
    vaciar(zona);
    if (errores.length) {
      zona.append(el('div', { class: 'mensaje mensaje-error', role: 'alert' },
        el('strong', {}, errores.length === 1 ? 'Corrige este dato para continuar:' : `Corrige estos ${errores.length} datos para continuar:`),
        el('ul', {}, errores.slice(0, 8).map((e) => el('li', {}, e.mensaje ?? e))),
        errores.length > 8 ? el('span', {}, `Y ${errores.length - 8} más, resaltados en la rejilla.`) : null,
        accionReordenar ? el('button', { type: 'button', class: 'boton boton-pequeno', onclick: reordenarEcuaciones }, 'Reordenar ecuaciones') : null
      ));
    }
    advertencias.forEach((a) => zona.append(el('div', { class: 'mensaje mensaje-advertencia' },
      el('span', {}, a.mensaje ?? a),
      a.accionReordenar ? el('button', { type: 'button', class: 'boton boton-pequeno', onclick: reordenarEcuaciones }, 'Reordenar ecuaciones') : null
    )));
    informacion.forEach((m) => zona.append(el('div', { class: 'mensaje mensaje-info' }, m)));
  }

  function leerEntrada() {
    return {
      ...formulario.leerEntradaSistema(),
      tolerancia: $('campo-tolerancia').value,
      maxIteraciones: $('campo-iteraciones').value,
      decimales: $('campo-decimales').value,
      tipoError: $('selector-tipo-error').value,
    };
  }

  function marcarCamposSimples(errores) {
    const marcar = (id, campo) => $(id).classList.toggle('celda-invalida', errores.some((e) => e.campo === campo));
    marcar('campo-tolerancia', 'tolerancia');
    marcar('campo-iteraciones', 'maxIteraciones');
    marcar('campo-decimales', 'decimales');
  }

  /** La falta de dominancia se advierte sin bloquear: el método todavía puede converger. */
  function advertirDominancia(analisis, A) {
    const { detalleDominanciaFilas, lista } = analisis.condiciones;
    const filasQueFallan = detalleDominanciaFilas.filter((f) => !f.estricta).map((f) => String(f.indice + 1));
    if (filasQueFallan.length === 0) return [];

    const { TIPO, buscarReordenamiento } = reordenamientoFilas;
    const filas = new Intl.ListFormat('es').format(filasQueFallan);
    const dominaPorColumnas = lista.find((c) => c.id === 'dominancia-columnas').cumple;
    const consecuencia = dominaPorColumnas
      ? 'Sí tiene dominancia diagonal estricta por columnas, lo que también garantiza la convergencia.'
      : 'Este criterio no garantiza la convergencia, aunque el método todavía puede converger.';
    return [{
      mensaje: `El sistema no es diagonal dominante: |aᵢᵢ| > Σ|aᵢⱼ| no se cumple en ${filasQueFallan.length === 1 ? 'la fila' : 'las filas'} ${filas}. ${consecuencia}`,
      accionReordenar: buscarReordenamiento(A).tipo === TIPO.DOMINANCIA_ESTRICTA,
    }];
  }

  function advertirSingularidad(referencia) {
    if (!referencia.singular) return [];
    return [referencia.compatible
      ? 'La matriz A es singular y el sistema tiene infinitas soluciones. Si un método se estabiliza, habrá encontrado solo una de ellas.'
      : 'La matriz A es singular y el sistema no tiene solución. Ningún método puede converger a una solución que no existe.'];
  }

  function calcular() {
    const validacion = validadorSistema.validarEntrada(leerEntrada());
    const primeraCelda = formulario.marcarErrores(validacion.errores);
    marcarCamposSimples(validacion.errores);

    if (!validacion.valido) {
      mostrarMensajes({
        errores: validacion.errores,
        advertencias: validacion.advertencias,
        accionReordenar: validacion.errores.some((e) => e.codigo === validadorSistema.CODIGO.DIAGONAL_CERO),
      });
      explorador.detener();
      $('resultados').hidden = true;
      $('aviso-desactualizado').hidden = true;
      if (primeraCelda) primeraCelda.focus({ preventScroll: true });
      return false;
    }

    const { A, b, x0, tolerancia, maxIteraciones, decimales } = validacion.datos;
    const opciones = { tolerancia, maxIteraciones, decimales, tipoError: $('selector-tipo-error').value, norma: $('selector-norma').value };
    const sistema = { A, b, x0 };
    const analisis = analisisConvergencia.analizarSistema(A, b);
    const elegido = metodoElegido();
    const ejecutar = (id) => (elegido === id || elegido === 'comparar' ? motorIterativo.ejecutarMetodo(METODOS[id], sistema, opciones) : null);

    Object.assign(estado, {
      resultados: { jacobi: ejecutar('jacobi'), 'gauss-seidel': ejecutar('gauss-seidel') },
      analisis,
      sistema,
      opciones,
      variables: formulario.obtenerVariables(),
      metodoVisible: elegido === 'comparar' ? estado.metodoVisible : elegido,
    });

    mostrarMensajes({ advertencias: [...validacion.advertencias, ...advertirDominancia(analisis, A), ...advertirSingularidad(analisis.referencia)] });
    $('aviso-desactualizado').hidden = true;
    $('resultados').hidden = false;

    MI.interfaz.informeResultado.mostrarResultado($('tarjetas-resultado'), $('frase-comparacion'), {
      resultados: estado.resultados,
      analisis,
      variables: estado.variables,
    });
    MI.interfaz.mostrarAnalisis($('analisis-convergencia'), analisis);

    $('selector-vista-metodo').hidden = elegido !== 'comparar';
    mostrarMetodoVisible();
    return true;
  }

  function mostrarMetodoVisible() {
    const resultado = estado.resultados[estado.metodoVisible];
    $('selector-vista-metodo').querySelectorAll('button').forEach((boton) => {
      boton.setAttribute('aria-selected', String(boton.dataset.metodo === estado.metodoVisible));
    });

    const { decimales } = estado.opciones;
    tabla.mostrar(resultado, estado.variables, decimales);
    if (estado.graficos) estado.graficos.destruir();
    estado.graficos = MI.graficos.resultados.mostrarGraficos($('zona-graficos'), {
      resultados: estado.resultados,
      visible: resultado,
      variables: estado.variables,
      sistema: estado.sistema,
      referencia: estado.analisis.referencia,
      tolerancia: estado.opciones.tolerancia,
      unidad: motorIterativo.describirMedida(resultado.tipoError, resultado.norma).unidad,
      decimales,
    });

    const panelExplorador = $('titulo-explorador').parentElement;
    panelExplorador.hidden = resultado.iteraciones.length <= 1;
    if (resultado.iteraciones.length > 1) {
      explorador.mostrar({
        resultado,
        sistema: estado.sistema,
        metodo: METODOS[estado.metodoVisible],
        variables: estado.variables,
        decimales,
      });
      alCambiarIteracion(1);
    } else {
      explorador.detener();
    }
  }

  function reordenarEcuaciones() {
    const entrada = formulario.leerEntradaSistema();
    const conversiones = entrada.matriz.map((fila) => fila.map(conversionNumerica.interpretarNumero));
    if (conversiones.flat().some((c) => !c.valido)) {
      const errores = [];
      conversiones.forEach((fila, i) => fila.forEach((c, j) => {
        if (!c.valido) errores.push({ campo: 'A', fila: i, columna: j });
      }));
      formulario.marcarErrores(errores);
      mostrarMensajes({ errores: ['Para reordenar, primero corrige los coeficientes marcados en la matriz A.'] });
      return;
    }

    const A = conversiones.map((fila) => fila.map((c) => c.valor));
    const { TIPO } = reordenamientoFilas;
    const { tipo, permutacion } = reordenamientoFilas.buscarReordenamiento(A);

    if (tipo === TIPO.IMPOSIBLE) {
      mostrarMensajes({ errores: ['Ningún orden de las ecuaciones deja la diagonal sin ceros. Con esta matriz no se pueden aplicar estos métodos.'] });
      return;
    }
    if (tipo === TIPO.SIN_CAMBIOS) {
      mostrarMensajes({ informacion: ['No se encontró un orden mejor para las ecuaciones, así que se dejaron como estaban.'] });
      return;
    }

    formulario.aplicarPermutacion(permutacion);
    calcular();
    $('mensajes').prepend(el('div', { class: 'mensaje mensaje-info' }, tipo === TIPO.DOMINANCIA_ESTRICTA
      ? 'Ecuaciones reordenadas. Ahora la matriz tiene dominancia diagonal estricta por filas.'
      : 'Ecuaciones reordenadas. La diagonal ya no tiene ceros, pero la matriz no tiene dominancia diagonal estricta.'));
  }

  function cargarEjemplo(id) {
    const ejemplo = sistemasEjemplo.find((s) => s.id === id);
    formulario.cargarSistema(ejemplo);
    $('selector-dimension').value = ejemplo.A.length;
    $('selector-ejemplo').value = id;
    $('descripcion-ejemplo').textContent = ejemplo.descripcion;
    $('texto-ecuaciones').value = '';
    mostrarPestana('matriz');
    calcular();
  }

  function olvidarEjemplo() {
    $('selector-ejemplo').value = '';
    $('descripcion-ejemplo').textContent = '';
  }

  function mostrarPestana(nombre) {
    const esMatriz = nombre === 'matriz';
    $('vista-matriz').hidden = !esMatriz;
    $('vista-texto').hidden = esMatriz;
    $('pestana-matriz').setAttribute('aria-selected', String(esMatriz));
    $('pestana-texto').setAttribute('aria-selected', String(!esMatriz));
  }

  function convertirTexto() {
    const resultado = interpreteEcuaciones.interpretarEcuaciones($('texto-ecuaciones').value);
    if (!resultado.valido) {
      mostrarMensajes({ errores: resultado.errores });
      return;
    }
    const { DIMENSION_MINIMA, DIMENSION_MAXIMA } = validadorSistema.LIMITES;
    if (resultado.A.length < DIMENSION_MINIMA || resultado.A.length > DIMENSION_MAXIMA) {
      mostrarMensajes({ errores: [`El sistema debe tener entre ${DIMENSION_MINIMA} y ${DIMENSION_MAXIMA} ecuaciones.`] });
      return;
    }
    formulario.cargarSistema(resultado);
    $('selector-dimension').value = resultado.A.length;
    olvidarEjemplo();
    mostrarPestana('matriz');
    mostrarMensajes({ informacion: [`Se leyeron ${resultado.A.length} ecuaciones con las variables ${resultado.variables.join(', ')}.`] });
    marcarDesactualizado();
  }

  async function copiarTabla(boton) {
    const texto = tabla.obtenerTextoTabla();
    let copiado = false;
    try {
      await navigator.clipboard.writeText(texto);
      copiado = true;
    } catch {
      // Respaldo para navegadores o marcos que bloquean la API del portapapeles.
      const area = el('textarea', { value: texto, style: 'position:fixed;opacity:0' });
      document.body.append(area);
      area.select();
      try {
        copiado = document.execCommand('copy');
      } catch {
        copiado = false;
      }
      area.remove();
    }
    boton.textContent = copiado ? 'Copiada' : 'No se pudo copiar';
    setTimeout(() => { boton.textContent = 'Copiar tabla'; }, 1800);
  }

  function poblarSelectores() {
    $('selector-ejemplo').append(el('option', { value: '' }, 'Sistema propio'));
    sistemasEjemplo.forEach((s) => $('selector-ejemplo').append(el('option', { value: s.id }, s.nombre)));

    const { DIMENSION_MINIMA, DIMENSION_MAXIMA } = validadorSistema.LIMITES;
    for (let n = DIMENSION_MINIMA; n <= DIMENSION_MAXIMA; n++) {
      $('selector-dimension').append(el('option', { value: n }, `${n} × ${n}`));
    }
    Object.entries(motorIterativo.NORMAS).forEach(([id, norma]) => {
      $('selector-norma').append(el('option', { value: id }, norma.nombre));
    });
    $('selector-norma').value = 'infinito';
    Object.entries(motorIterativo.TIPOS_ERROR).forEach(([id, tipo]) => {
      $('selector-tipo-error').append(el('option', { value: id }, tipo.nombre));
    });
  }

  function vincularEventos() {
    $('formulario').addEventListener('submit', (evento) => {
      evento.preventDefault();
      calcular();
    });

    $('selector-ejemplo').addEventListener('change', (evento) => {
      if (evento.target.value) cargarEjemplo(evento.target.value);
      else olvidarEjemplo();
    });
    $('selector-dimension').addEventListener('change', (evento) => {
      formulario.establecerDimension(Number(evento.target.value));
      olvidarEjemplo();
      marcarDesactualizado();
    });

    ['campo-tolerancia', 'campo-iteraciones', 'campo-decimales'].forEach((id) => {
      $(id).addEventListener('input', (evento) => {
        evento.target.classList.remove('celda-invalida');
        marcarDesactualizado();
      });
    });
    ['selector-norma', 'selector-tipo-error'].forEach((id) => $(id).addEventListener('change', marcarDesactualizado));
    document.querySelectorAll('input[name="metodo"]').forEach((r) => r.addEventListener('change', marcarDesactualizado));

    $('pestana-matriz').addEventListener('click', () => mostrarPestana('matriz'));
    $('pestana-texto').addEventListener('click', () => mostrarPestana('texto'));
    $('boton-convertir').addEventListener('click', convertirTexto);

    $('boton-reordenar').addEventListener('click', reordenarEcuaciones);
    $('boton-rellenar').addEventListener('click', () => {
      const cambios = formulario.rellenarVacios();
      mostrarMensajes({ informacion: [cambios ? `Se completaron ${cambios} celdas vacías con 0.` : 'No había celdas vacías.'] });
      if (cambios) marcarDesactualizado();
    });
    $('boton-inicial-ceros').addEventListener('click', () => {
      formulario.iniciarEnCeros();
      marcarDesactualizado();
    });
    $('boton-limpiar').addEventListener('click', () => {
      formulario.limpiarTodo();
      olvidarEjemplo();
      vaciar($('mensajes'));
      marcarDesactualizado();
    });

    $('selector-vista-metodo').addEventListener('click', (evento) => {
      const metodo = evento.target.dataset.metodo;
      if (!metodo) return;
      estado.metodoVisible = metodo;
      mostrarMetodoVisible();
    });

    $('boton-copiar').addEventListener('click', (evento) => copiarTabla(evento.currentTarget));
  }

  function iniciar() {
    MI.interfaz.iniciarNavegacion();
    poblarSelectores();
    vincularEventos();
    MI.interfaz.completarTeoria((id) => {
      cargarEjemplo(id);
      $('laboratorio').scrollIntoView();
    });
    cargarEjemplo('tres-dominante');
  }

  iniciar();
})(window.MetodosIterativos);
