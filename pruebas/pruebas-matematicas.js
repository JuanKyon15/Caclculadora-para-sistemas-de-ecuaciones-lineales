/**
 * Suite de pruebas. Se ejecuta en el navegador abriendo pruebas/pruebas.html.
 * Los resultados esperados provienen de soluciones exactas conocidas o de
 * cálculos hechos a mano, nunca de la propia salida del programa.
 */
(function (MI) {
  'use strict';

  const { algebraLineal, jacobi, gaussSeidel, motorIterativo, valoresPropios, analisisConvergencia, reordenamientoFilas } = MI.matematicas;
  const { validadorSistema, interpreteEcuaciones, conversionNumerica } = MI.validacion;
  const { ESTADO, TENDENCIA, ejecutarMetodo } = motorIterativo;

  const grupos = [];
  let grupoActual = null;

  function grupo(nombre, definir) {
    grupoActual = { nombre, pruebas: [] };
    grupos.push(grupoActual);
    definir();
  }

  function prueba(nombre, funcion) {
    try {
      funcion();
      grupoActual.pruebas.push({ nombre, correcta: true });
    } catch (error) {
      grupoActual.pruebas.push({ nombre, correcta: false, mensaje: error.message });
    }
  }

  function afirmar(condicion, mensaje) {
    if (!condicion) throw new Error(mensaje || 'La condición no se cumple.');
  }

  function afirmarCerca(obtenido, esperado, tolerancia = 1e-9, etiqueta = 'valor') {
    afirmar(Math.abs(obtenido - esperado) <= tolerancia, `${etiqueta}: se obtuvo ${obtenido} y se esperaba ${esperado} (±${tolerancia}).`);
  }

  function afirmarVectorCerca(obtenido, esperado, tolerancia = 1e-9) {
    afirmar(obtenido.length === esperado.length, 'Los vectores tienen distinta longitud.');
    obtenido.forEach((v, i) => afirmarCerca(v, esperado[i], tolerancia, `componente ${i}`));
  }

  function afirmarIgual(obtenido, esperado, etiqueta = 'valor') {
    afirmar(obtenido === esperado, `${etiqueta}: se obtuvo ${obtenido} y se esperaba ${esperado}.`);
  }

  const ejemplo = (id) => MI.datos.sistemasEjemplo.find((s) => s.id === id);
  const opcionesBase = { tolerancia: 1e-10, maxIteraciones: 5000, tipoError: 'absoluto', norma: 'infinito' };

  function correr(metodo, sistema, opciones = {}) {
    const x0 = opciones.x0 || sistema.b.map(() => 0);
    return ejecutarMetodo(metodo, { A: sistema.A, b: sistema.b, x0 }, { ...opcionesBase, ...opciones });
  }

  const entradaValida = () => ({
    matriz: [['2', '1'], ['1', '3']],
    terminos: ['5', '6'],
    inicial: ['0', '0'],
    tolerancia: '1e-6',
    maxIteraciones: '100',
    decimales: '8',
    tipoError: 'absoluto',
  });

  const tieneCodigo = (resultado, codigo) => resultado.errores.some((e) => e.codigo === codigo);
  const { CODIGO } = validadorSistema;

  grupo('1. Primera iteración calculada a mano', () => {
    const A = [[4, -1, 1], [4, -8, 1], [-2, 1, 5]];
    const b = [7, -21, 15];
    const x0 = [1, 2, 2];

    prueba('Jacobi usa solo valores anteriores', () => {
      // x = (7 + 2 - 2)/4 = 1.75; y = (21 + 4 + 2)/8 = 3.375; z = (15 + 2 - 2)/5 = 3
      afirmarVectorCerca(jacobi.calcularIteracion(A, b, x0).x, [1.75, 3.375, 3], 1e-14);
    });
    prueba('Gauss-Seidel usa los valores recién actualizados', () => {
      // x = 1.75; y = (21 + 4·1.75 + 2)/8 = 3.75; z = (15 + 2·1.75 - 3.75)/5 = 2.95
      afirmarVectorCerca(gaussSeidel.calcularIteracion(A, b, x0).x, [1.75, 3.75, 2.95], 1e-14);
    });
    prueba('Jacobi no modifica el vector recibido', () => {
      const copia = x0.slice();
      jacobi.calcularIteracion(A, b, copia);
      afirmarVectorCerca(copia, x0, 0);
    });
    prueba('Gauss-Seidel no modifica el vector recibido', () => {
      const copia = x0.slice();
      gaussSeidel.calcularIteracion(A, b, copia);
      afirmarVectorCerca(copia, x0, 0);
    });
    prueba('El detalle de Jacobi coincide con el cálculo y marca todo como anterior', () => {
      const { x, detalle } = jacobi.calcularIteracion(A, b, x0, true);
      detalle.forEach((d, i) => {
        afirmarCerca(d.resultado, x[i], 0);
        d.terminos.forEach((t) => afirmarIgual(t.origen, 'anterior'));
      });
    });
    prueba('El detalle de Gauss-Seidel marca como actualizado cada j < i', () => {
      const { x, detalle } = gaussSeidel.calcularIteracion(A, b, x0, true);
      detalle.forEach((d, i) => {
        afirmarCerca(d.resultado, x[i], 0);
        d.terminos.forEach((t) => afirmarIgual(t.origen, t.j < i ? 'actualizado' : 'anterior'));
      });
    });
    prueba('El cálculo con detalle y sin detalle da el mismo resultado', () => {
      afirmarVectorCerca(gaussSeidel.calcularIteracion(A, b, x0, true).x, gaussSeidel.calcularIteracion(A, b, x0).x, 0);
      afirmarVectorCerca(jacobi.calcularIteracion(A, b, x0, true).x, jacobi.calcularIteracion(A, b, x0).x, 0);
    });
  });

  grupo('2. Convergencia a soluciones exactas conocidas', () => {
    ['dos-variables', 'tres-dominante', 'cuatro-dominante'].forEach((id) => {
      const sistema = ejemplo(id);
      [jacobi, gaussSeidel].forEach((metodo) => {
        prueba(`${metodo.nombre} resuelve ${sistema.nombre}`, () => {
          const r = correr(metodo, sistema);
          afirmarIgual(r.estado, ESTADO.TOLERANCIA_ALCANZADA, 'estado');
          afirmarVectorCerca(r.xFinal, sistema.solucionConocida, 1e-8);
        });
      });
    });
    prueba('Gauss-Seidel converge en el sistema donde Jacobi diverge', () => {
      const s = ejemplo('solo-gauss-seidel');
      afirmarVectorCerca(correr(gaussSeidel, s).xFinal, s.solucionConocida, 1e-8);
      afirmarIgual(correr(jacobi, s).estado, ESTADO.DIVERGENCIA_DETECTADA, 'estado de Jacobi');
    });
    prueba('Jacobi termina en pocas iteraciones donde Gauss-Seidel diverge', () => {
      const s = ejemplo('solo-jacobi');
      const r = correr(jacobi, s);
      afirmarVectorCerca(r.xFinal, s.solucionConocida, 1e-12);
      afirmar(r.iteracionesRealizadas <= 4, `Jacobi usó ${r.iteracionesRealizadas} iteraciones.`);
      afirmarIgual(correr(gaussSeidel, s).estado, ESTADO.DIVERGENCIA_DETECTADA, 'estado de Gauss-Seidel');
    });
    prueba('Matriz simétrica definida positiva: Gauss-Seidel converge', () => {
      const s = ejemplo('definida-positiva');
      afirmarVectorCerca(correr(gaussSeidel, s).xFinal, s.solucionConocida, 1e-8);
    });
    prueba('Si x⁽⁰⁾ es la solución, se detiene en la primera iteración con error cero', () => {
      const s = ejemplo('tres-dominante');
      [jacobi, gaussSeidel].forEach((m) => {
        const r = correr(m, s, { x0: s.solucionConocida });
        afirmarIgual(r.iteracionesRealizadas, 1, 'iteraciones');
        afirmarCerca(r.errorFinal, 0, 1e-15);
      });
    });
  });

  grupo('3. Cálculo de errores y residuos', () => {
    const anterior = [1, -2, 4];
    const nuevo = [1.5, -2, 2]; // Diferencia: (0.5, 0, -2)
    const medir = (tipoError, norma, n = nuevo, a = anterior) => motorIterativo.medirError(n, a, { tipoError, norma });

    prueba('Norma 1 de la diferencia', () => afirmarCerca(medir('absoluto', '1').valor, 2.5, 1e-15));
    prueba('Norma 2 de la diferencia', () => afirmarCerca(medir('absoluto', '2').valor, Math.sqrt(4.25), 1e-14));
    prueba('Norma 3 de la diferencia', () => afirmarCerca(medir('absoluto', '3').valor, Math.cbrt(8.125), 1e-14));
    prueba('Norma infinito de la diferencia', () => afirmarCerca(medir('absoluto', 'infinito').valor, 2, 1e-15));
    prueba('La norma 3 no desborda con valores enormes', () => afirmarCerca(algebraLineal.normaP([1e200, 1e200], 3) / 1e200, Math.cbrt(2), 1e-12));
    prueba('Error relativo en norma infinito', () => afirmarCerca(medir('relativo', 'infinito').valor, 1, 1e-15));
    prueba('Error relativo en norma 1', () => afirmarCerca(medir('relativo', '1').valor, 2.5 / 5.5, 1e-14));
    prueba('Error relativo porcentual en norma 2', () => afirmarCerca(medir('porcentual', '2').valor, (Math.sqrt(4.25) / Math.sqrt(10.25)) * 100, 1e-11));
    prueba('El error relativo con vector nuevo nulo no divide entre cero', () => {
      const m = medir('relativo', 'infinito', [0, 0], [1, 2]);
      afirmar(Number.isFinite(m.valor) && m.indefinido, 'Debe ser finito y marcarse como indefinido.');
    });
    prueba('El residuo se mide en la norma elegida', () => {
      const s = ejemplo('dos-variables');
      // Con x⁽⁰⁾ = 0 el residuo es b = (5, 6).
      afirmarCerca(correr(jacobi, s, { norma: '1' }).iteraciones[0].residuo, 11, 1e-14);
      afirmarCerca(correr(jacobi, s, { norma: '2' }).iteraciones[0].residuo, Math.sqrt(61), 1e-14);
      afirmarCerca(correr(jacobi, s, { norma: '3' }).iteraciones[0].residuo, Math.cbrt(341), 1e-13);
    });
    prueba('Cada error de la tabla coincide con la diferencia entre filas consecutivas', () => {
      const r = correr(gaussSeidel, ejemplo('tres-dominante'));
      for (let i = 1; i < r.iteraciones.length; i++) {
        const delta = algebraLineal.normaInfinito(algebraLineal.restarVectores(r.iteraciones[i].x, r.iteraciones[i - 1].x));
        afirmarCerca(r.iteraciones[i].error, delta, 1e-15);
      }
    });
    prueba('El residuo de cada fila es ‖b − A·x‖∞', () => {
      const s = ejemplo('tres-dominante');
      const r = correr(jacobi, s);
      r.iteraciones.forEach((it) => {
        afirmarCerca(it.residuo, algebraLineal.normaInfinito(algebraLineal.calcularResiduo(s.A, s.b, it.x)), 1e-14);
      });
    });
    prueba('La fila k = 0 no tiene error', () => afirmarIgual(correr(jacobi, ejemplo('dos-variables')).iteraciones[0].error, null));
  });

  grupo('4. Criterio de parada', () => {
    const s = ejemplo('tres-dominante');
    prueba('Se detiene en la primera iteración con error ≤ tolerancia', () => {
      const r = correr(jacobi, s, { tolerancia: 1e-4 });
      const ultima = r.iteraciones[r.iteraciones.length - 1];
      afirmar(ultima.error <= 1e-4, 'La última fila debe cumplir.');
      afirmar(r.iteraciones.slice(1, -1).every((it) => it.error > 1e-4), 'Ninguna fila previa debe cumplir.');
    });
    prueba('Una tolerancia igual al error también se considera alcanzada', () => {
      const primero = correr(jacobi, s, { maxIteraciones: 1 }).iteraciones[1].error;
      afirmarIgual(correr(jacobi, s, { tolerancia: primero }).iteracionesRealizadas, 1, 'iteraciones');
    });
    prueba('Respeta el máximo de iteraciones', () => {
      const r = correr(jacobi, s, { maxIteraciones: 3 });
      afirmarIgual(r.estado, ESTADO.MAXIMO_ITERACIONES, 'estado');
      afirmarIgual(r.iteracionesRealizadas, 3, 'iteraciones');
      afirmarIgual(r.iteraciones.length, 4, 'filas incluyendo k = 0');
    });
    prueba('Alcanzar la tolerancia justo en la última iteración cuenta como alcanzada', () => {
      const referencia = correr(gaussSeidel, s, { tolerancia: 1e-6 });
      const r = correr(gaussSeidel, s, { tolerancia: 1e-6, maxIteraciones: referencia.iteracionesRealizadas });
      afirmarIgual(r.estado, ESTADO.TOLERANCIA_ALCANZADA, 'estado');
    });
    prueba('Al agotar iteraciones en un caso convergente, la tendencia es decreciente', () => {
      afirmarIgual(correr(jacobi, s, { maxIteraciones: 8 }).tendencia, TENDENCIA.DECRECIENTE, 'tendencia');
    });
    prueba('Al agotar iteraciones en un caso divergente, la tendencia es creciente', () => {
      afirmarIgual(correr(jacobi, ejemplo('reordenar-dominancia'), { maxIteraciones: 8 }).tendencia, TENDENCIA.CRECIENTE, 'tendencia');
    });
    prueba('Con convergencia lenta, un paso pequeño no implica error real pequeño', () => {
      const lento = ejemplo('convergencia-lenta');
      const r = correr(jacobi, lento, { tolerancia: 1e-4 });
      afirmarIgual(r.estado, ESTADO.TOLERANCIA_ALCANZADA, 'estado');
      const errorReal = algebraLineal.normaInfinito(algebraLineal.restarVectores(r.xFinal, lento.solucionConocida));
      afirmar(errorReal > 1e-3, `El error real debería superar ampliamente la tolerancia; es ${errorReal}.`);
    });
  });

  grupo('5. Sistemas sin condiciones suficientes y divergencia', () => {
    prueba('Detecta divergencia antes de producir valores no finitos', () => {
      const r = correr(jacobi, ejemplo('reordenar-dominancia'));
      afirmarIgual(r.estado, ESTADO.DIVERGENCIA_DETECTADA, 'estado');
      afirmar(r.xFinal.every(Number.isFinite), 'La última aproximación debe ser finita.');
    });
    prueba('Sin dominancia diagonal, Gauss-Seidel aún puede converger', () => {
      const s = ejemplo('solo-gauss-seidel');
      const analisis = analisisConvergencia.analizarSistema(s.A, s.b);
      afirmar(!analisis.condiciones.lista.find((c) => c.id === 'dominancia-filas').cumple, 'No debe haber dominancia.');
      afirmarIgual(correr(gaussSeidel, s).estado, ESTADO.TOLERANCIA_ALCANZADA, 'estado');
    });
    prueba('Con ρ(T) > 1 puede converger si x⁽⁰⁾ es especial', () => {
      const s = ejemplo('solo-gauss-seidel');
      afirmarIgual(correr(jacobi, s, { x0: s.solucionConocida }).estado, ESTADO.TOLERANCIA_ALCANZADA, 'estado');
    });
    prueba('Sistema incompatible: no se declara convergencia', () => {
      const s = { A: [[1, 1], [1, 1]], b: [2, 3] };
      afirmar(correr(gaussSeidel, s, { maxIteraciones: 200 }).estado !== ESTADO.TOLERANCIA_ALCANZADA, 'No debe alcanzar la tolerancia.');
      const a = analisisConvergencia.analizarSistema(s.A, s.b);
      afirmar(a.referencia.singular && !a.referencia.compatible, 'Debe clasificarse como singular incompatible.');
    });
    prueba('Sistema con infinitas soluciones: se clasifica como singular compatible', () => {
      const a = analisisConvergencia.analizarSistema([[1, 1], [2, 2]], [2, 4]);
      afirmar(a.referencia.singular && a.referencia.compatible, 'Debe ser singular compatible.');
      afirmarIgual(a.referencia.rango, 1, 'rango');
    });
  });

  grupo('6. Análisis de convergencia', () => {
    const hallar = (analisis, id) => analisis.condiciones.lista.find((c) => c.id === id);
    prueba('Dominancia estricta por filas', () => {
      const s = ejemplo('tres-dominante');
      afirmar(hallar(analisisConvergencia.analizarSistema(s.A, s.b), 'dominancia-filas').cumple);
    });
    prueba('La igualdad no es dominancia estricta', () => {
      afirmar(!hallar(analisisConvergencia.analizarSistema([[2, 2], [1, 3]], [1, 1]), 'dominancia-filas').cumple);
    });
    prueba('Dominancia por columnas sin dominancia por filas', () => {
      const a = analisisConvergencia.analizarSistema([[3, 2, 2], [1, 4, 0], [1, 1, 5]], [1, 1, 1]);
      afirmar(!hallar(a, 'dominancia-filas').cumple && hallar(a, 'dominancia-columnas').cumple);
    });
    prueba('Irreducible con dominancia débil', () => {
      const A = [[2, -1, 0], [-1, 2, -1], [0, -1, 2]];
      const a = analisisConvergencia.analizarSistema(A, [1, 0, 1]);
      afirmar(!hallar(a, 'dominancia-filas').cumple && hallar(a, 'irreducible-dominante').cumple);
    });
    prueba('Una matriz reducible no cumple la condición de irreducibilidad', () => {
      const a = analisisConvergencia.analizarSistema([[2, 0, 0], [0, 2, -2], [0, 1, 1]], [1, 1, 1]);
      afirmar(!a.condiciones.irreducible);
    });
    prueba('Definida positiva garantiza Gauss-Seidel, no Jacobi', () => {
      const s = ejemplo('definida-positiva');
      const a = analisisConvergencia.analizarSistema(s.A, s.b);
      afirmar(hallar(a, 'simetrica-definida-positiva').cumple);
      afirmar(!hallar(a, 'jacobi-definida-positiva').cumple);
      afirmar(a.metodos['gauss-seidel'].garantias.length > 0);
    });
    prueba('Radio espectral de Jacobi en matriz 2×2 (ρ = 1/√6)', () => {
      const s = ejemplo('dos-variables');
      afirmarCerca(analisisConvergencia.analizarSistema(s.A, s.b).metodos.jacobi.radioEspectral, 1 / Math.sqrt(6), 1e-12);
    });
    prueba('Radio espectral de Gauss-Seidel en matriz 2×2 (ρ = 1/6)', () => {
      const s = ejemplo('dos-variables');
      afirmarCerca(analisisConvergencia.analizarSistema(s.A, s.b).metodos['gauss-seidel'].radioEspectral, 1 / 6, 1e-12);
    });
    prueba('Radio espectral con valores propios complejos (ρ = √5/2)', () => {
      const s = ejemplo('solo-gauss-seidel');
      const a = analisisConvergencia.analizarSistema(s.A, s.b);
      afirmarCerca(a.metodos.jacobi.radioEspectral, Math.sqrt(5) / 2, 1e-10);
      afirmarCerca(a.metodos['gauss-seidel'].radioEspectral, 0.5, 1e-10);
    });
    prueba('Radio espectral de Jacobi nilpotente y Gauss-Seidel ρ = 2', () => {
      const s = ejemplo('solo-jacobi');
      const a = analisisConvergencia.analizarSistema(s.A, s.b);
      afirmar(a.metodos.jacobi.radioEspectral < 1e-3, `ρ(T_J) = ${a.metodos.jacobi.radioEspectral}`);
      afirmarCerca(a.metodos['gauss-seidel'].radioEspectral, 2, 1e-4);
    });
    prueba('ρ(T) = 1 se clasifica como frontera', () => {
      const a = analisisConvergencia.analizarSistema([[1, 1], [1, 1]], [2, 2]);
      afirmarIgual(a.metodos.jacobi.clasificacion, analisisConvergencia.CLASIFICACION_RADIO.FRONTERA, 'clasificación');
    });
    prueba('Valores propios de una matriz de rotación (±i)', () => {
      const v = valoresPropios.calcularValoresPropios([[0, -1], [1, 0]]);
      afirmarCerca(Math.abs(v[0].imaginaria), 1, 1e-14);
      afirmarCerca(v[0].real, 0, 1e-14);
    });
    prueba('Matriz de Gauss-Seidel coincide con −(D+L)⁻¹U en un caso a mano', () => {
      // A = [[2,1],[1,3]] → T_G = [[0,-1/2],[0,1/6]]
      const T = gaussSeidel.construirMatrizIteracion([[2, 1], [1, 3]]);
      afirmarVectorCerca(T.flat(), [0, -0.5, 0, 1 / 6], 1e-14);
    });
    prueba('Iterar con la matriz T equivale a ejecutar el método', () => {
      const s = ejemplo('cuatro-dominante');
      [jacobi, gaussSeidel].forEach((m) => {
        const T = m.construirMatrizIteracion(s.A);
        const c = m.calcularIteracion(s.A, s.b, s.b.map(() => 0)).x; // c = T·0 + c
        const x = [3, -1, 2, 5];
        const viaT = algebraLineal.multiplicarMatrizVector(T, x).map((v, i) => v + c[i]);
        afirmarVectorCerca(m.calcularIteracion(s.A, s.b, x).x, viaT, 1e-13);
      });
    });
    prueba('La solución de referencia por eliminación es correcta', () => {
      const s = ejemplo('cuatro-dominante');
      afirmarVectorCerca(algebraLineal.resolverPorEliminacion(s.A, s.b).solucion, s.solucionConocida, 1e-12);
    });
  });

  grupo('7. Validaciones de entrada', () => {
    const validar = (cambios) => validadorSistema.validarEntrada({ ...entradaValida(), ...cambios });

    prueba('Acepta una entrada correcta', () => {
      const r = validar({});
      afirmar(r.valido);
      afirmarVectorCerca(r.datos.b, [5, 6], 0);
    });
    prueba('Rechaza filas de longitud distinta', () => afirmar(tieneCodigo(validar({ matriz: [['2', '1'], ['1']] }), CODIGO.DIMENSIONES)));
    prueba('Rechaza matriz no cuadrada', () => afirmar(tieneCodigo(validar({ matriz: [['2', '1', '3'], ['1', '3', '1']] }), CODIGO.DIMENSIONES)));
    prueba('Rechaza b de dimensión incompatible', () => afirmar(tieneCodigo(validar({ terminos: ['5'] }), CODIGO.DIMENSIONES)));
    prueba('Rechaza x⁰ de dimensión incompatible', () => afirmar(tieneCodigo(validar({ inicial: ['0', '0', '0'] }), CODIGO.DIMENSIONES)));
    prueba('Rechaza diagonal cero e indica la posición', () => {
      const r = validar({ matriz: [['0', '1'], ['1', '3']] });
      const error = r.errores.find((e) => e.codigo === CODIGO.DIAGONAL_CERO);
      afirmar(error && error.fila === 0 && error.columna === 0);
    });
    prueba('Rechaza texto no numérico', () => afirmar(tieneCodigo(validar({ matriz: [['abc', '1'], ['1', '3']] }), CODIGO.VALOR_INVALIDO)));
    prueba('Rechaza número seguido de texto', () => afirmar(tieneCodigo(validar({ terminos: ['12abc', '6'] }), CODIGO.VALOR_INVALIDO)));
    prueba('Rechaza celdas vacías', () => afirmar(tieneCodigo(validar({ inicial: ['', '0'] }), CODIGO.VALOR_INVALIDO)));
    prueba('Rechaza valores no representables', () => afirmar(tieneCodigo(validar({ terminos: ['1e999', '6'] }), CODIGO.VALOR_INVALIDO)));
    ['0', '-1e-6', 'abc', ''].forEach((t) => prueba(`Rechaza la tolerancia «${t}»`, () => afirmar(tieneCodigo(validar({ tolerancia: t }), CODIGO.TOLERANCIA))));
    ['0', '-5', '2.5', 'abc', '', '10001'].forEach((t) => prueba(`Rechaza el máximo de iteraciones «${t}»`, () => afirmar(tieneCodigo(validar({ maxIteraciones: t }), CODIGO.ITERACIONES))));
    prueba('Advierte sobre una tolerancia grande sin bloquear', () => {
      const r = validar({ tolerancia: '2' });
      afirmar(r.valido && r.advertencias.length > 0);
    });
    prueba('Rechaza fila completamente nula', () => afirmar(tieneCodigo(validar({ matriz: [['0', '0'], ['1', '3']] }), CODIGO.VALOR_INVALIDO)));
    prueba('Conversión: coma decimal', () => afirmarCerca(conversionNumerica.interpretarNumero('2,5').valor, 2.5, 0));
    prueba('Conversión: notación científica', () => afirmarCerca(conversionNumerica.interpretarNumero('1e-6').valor, 1e-6, 0));
    prueba('Conversión: fracción', () => afirmarCerca(conversionNumerica.interpretarNumero('-1/4').valor, -0.25, 0));
    prueba('Conversión: rechaza división entre cero', () => afirmar(!conversionNumerica.interpretarNumero('1/0').valido));
    prueba('Conversión: rechaza dos puntos decimales', () => afirmar(!conversionNumerica.interpretarNumero('1.2.3').valido));
  });

  grupo('8. Intérprete de ecuaciones', () => {
    const leer = interpreteEcuaciones.interpretarEcuaciones;
    prueba('Interpreta el ejemplo del enunciado', () => {
      const r = leer('2x + y = 5\nx + 3y = 6');
      afirmar(r.valido);
      afirmarVectorCerca(r.A.flat(), [2, 1, 1, 3], 0);
      afirmarVectorCerca(r.b, [5, 6], 0);
    });
    prueba('Signos negativos y coeficientes implícitos', () => {
      const r = leer('x - y = 1\n-x + 2y = 0');
      afirmarVectorCerca(r.A.flat(), [1, -1, -1, 2], 0);
    });
    prueba('Variables con subíndice en orden natural (x2 antes de x10)', () => {
      const r = leer('x10 + x2 = 1\nx2 - x10 = 3');
      afirmarIgual(r.variables.join(','), 'x2,x10');
    });
    prueba('Términos en ambos lados', () => {
      const r = leer('2x + 1 = y + 6\nx = 3y - 2');
      afirmarVectorCerca(r.A.flat(), [2, -1, 1, -3], 0);
      afirmarVectorCerca(r.b, [5, -2], 0);
    });
    prueba('Decimales con coma, fracciones y asterisco', () => {
      const r = leer('2,5x + 1/2y = 1\n3*x - 0.25*y = 2');
      afirmarVectorCerca(r.A.flat(), [2.5, 0.5, 3, -0.25], 0);
    });
    prueba('Una variable ausente toma coeficiente cero', () => {
      const r = leer('x + y = 1\ny + z = 2\nx + z = 3');
      afirmarVectorCerca(r.A.flat(), [1, 1, 0, 0, 1, 1, 1, 0, 1], 0);
    });
    prueba('Rechaza más variables que ecuaciones', () => afirmar(!leer('x + y + z = 1\nx - y = 2').valido));
    prueba('Rechaza una línea sin igualdad', () => afirmar(!leer('2x + y\nx + 3y = 6').valido));
    prueba('Rechaza términos sin signo entre ellos', () => afirmar(!leer('2x 3y = 1\nx + y = 1').valido));
    prueba('Rechaza símbolos desconocidos', () => afirmar(!leer('2x + $y = 1\nx + y = 1').valido));
    prueba('Rechaza dos igualdades', () => afirmar(!leer('x = y = 1\nx + y = 2').valido));
  });

  grupo('9. Reordenamiento de ecuaciones', () => {
    const { buscarReordenamiento, TIPO } = reordenamientoFilas;
    const aplicar = (s, p) => ({ A: p.map((f) => s.A[f]), b: p.map((f) => s.b[f]) });

    prueba('Encuentra dominancia estricta', () => {
      const s = ejemplo('reordenar-dominancia');
      const r = buscarReordenamiento(s.A);
      afirmarIgual(r.tipo, TIPO.DOMINANCIA_ESTRICTA, 'tipo');
      const nuevo = aplicar(s, r.permutacion);
      afirmarVectorCerca(correr(jacobi, nuevo).xFinal, s.solucionConocida, 1e-8);
    });
    prueba('Corrige un cero en la diagonal sin cambiar la solución', () => {
      const s = ejemplo('diagonal-cero');
      const r = buscarReordenamiento(s.A);
      const nuevo = aplicar(s, r.permutacion);
      afirmar(nuevo.A.every((f, i) => f[i] !== 0), 'La diagonal debe quedar sin ceros.');
      afirmarVectorCerca(correr(gaussSeidel, nuevo).xFinal, s.solucionConocida, 1e-8);
    });
    prueba('No cambia un sistema ya dominante', () => afirmarIgual(buscarReordenamiento(ejemplo('tres-dominante').A).tipo, TIPO.SIN_CAMBIOS, 'tipo'));
    prueba('Informa cuando es imposible', () => afirmarIgual(buscarReordenamiento([[0, 1, 1], [0, 2, 1], [0, 1, 3]]).tipo, TIPO.IMPOSIBLE, 'tipo'));
  });

  grupo('10. Redondeo interno', () => {
    const { redondearDecimales: redondear } = algebraLineal;
    [[1.005, 2, 1.01], [2.625, 2, 2.63], [-2.5, 0, -3], [3.9484375, 6, 3.948438], [3.9484374999999996, 6, 3.948438], [1e-9, 3, 0], [-1e-9, 3, 0], [1e25, 2, 1e25], [12345.678, 1, 12345.7]].forEach(([valor, d, esperado]) => {
      prueba(`Redondea ${valor} a ${d} decimales`, () => afirmar(redondear(valor, d) === esperado, `Se obtuvo ${redondear(valor, d)}.`));
    });
    prueba('Sin decimales indicados conserva el valor', () => afirmar(redondear(1 / 3, null) === 1 / 3));
    const A = [[3, 1], [9, 1]];
    const b = [1, 0];
    prueba('Gauss-Seidel usa el valor ya redondeado', () => {
      // x = 1/3 → 0.3; y = (0 - 9·0.3)/1 = -2.7. Sin redondeo interno, y sería -3.
      afirmarVectorCerca(gaussSeidel.calcularIteracion(A, b, [0, 0], false, 1).x, [0.3, -2.7], 1e-14);
    });
    prueba('Jacobi redondea cada variable', () => {
      afirmarVectorCerca(jacobi.calcularIteracion(A, b, [1, 1], false, 2).x, [0, -9], 1e-14);
      afirmarVectorCerca(jacobi.calcularIteracion(A, b, [0.5, 0.5], false, 2).x, [0.17, -4.5], 1e-14);
    });
    prueba('El desglose muestra el valor redondeado', () => {
      const { detalle, x } = gaussSeidel.calcularIteracion(A, b, [0, 0], true, 1);
      afirmarCerca(detalle[1].resultado, x[1], 0);
      afirmarCerca(detalle[1].terminos[0].valor, 0.3, 1e-14);
    });
    prueba('Cada aproximación tiene como máximo los decimales pedidos', () => {
      const r = correr(gaussSeidel, ejemplo('tres-dominante'), { decimales: 3, tolerancia: 1e-3 });
      r.iteraciones.forEach((it) => it.x.forEach((v) => afirmarCerca(v, Number(v.toFixed(3)), 0)));
    });
    prueba('Con d decimales el error absoluto es múltiplo exacto de 10^-d', () => {
      const r = correr(jacobi, ejemplo('tres-dominante'), { decimales: 4, tolerancia: 1e-4 });
      r.iteraciones.slice(1).forEach((it) => afirmarCerca(it.error, Number(it.error.toFixed(4)), 0));
      afirmarIgual(r.estado, ESTADO.TOLERANCIA_ALCANZADA, 'estado');
    });
    prueba('Sin redondeo interno el resultado no cambia', () => {
      const s = ejemplo('tres-dominante');
      afirmarVectorCerca(correr(jacobi, s, { decimales: null }).xFinal, correr(jacobi, s).xFinal, 0);
    });
    prueba('Con pocos decimales la solución queda cerca de la exacta', () => {
      const s = ejemplo('tres-dominante');
      afirmarVectorCerca(correr(gaussSeidel, s, { decimales: 3, tolerancia: 1e-3 }).xFinal, s.solucionConocida, 2e-3);
    });
    ['-1', '16', '2.5', 'abc', ''].forEach((t) => prueba(`Rechaza «${t}» como número de decimales`, () => {
      const r = validadorSistema.validarEntrada({ ...entradaValida(), decimales: t });
      afirmar(tieneCodigo(r, CODIGO.DECIMALES));
    }));
    prueba('Advierte si la tolerancia absoluta es menor que el redondeo', () => {
      const r = validadorSistema.validarEntrada({ ...entradaValida(), decimales: '4', tolerancia: '1e-6' });
      afirmar(r.valido && r.advertencias.some((a) => a.codigo === 'tolerancia-menor-que-redondeo'));
    });
    prueba('No advierte si la tolerancia es compatible con el redondeo', () => {
      const r = validadorSistema.validarEntrada({ ...entradaValida(), decimales: '8', tolerancia: '1e-6' });
      afirmar(!r.advertencias.some((a) => a.codigo === 'tolerancia-menor-que-redondeo'));
    });
  });

  grupo('11. Integridad de los sistemas de ejemplo', () => {
    MI.datos.sistemasEjemplo.forEach((s) => {
      prueba(`${s.nombre}: la solución conocida satisface A·x = b`, () => {
        const residuo = algebraLineal.normaInfinito(algebraLineal.calcularResiduo(s.A, s.b, s.solucionConocida));
        afirmar(residuo < 1e-12, `Residuo ${residuo}`);
      });
    });
  });

  function mostrarResultados() {
    const contenedor = document.getElementById('resultados');
    let total = 0;
    let fallidas = 0;

    grupos.forEach((g) => {
      const titulo = document.createElement('h2');
      titulo.textContent = g.nombre;
      const lista = document.createElement('ul');
      g.pruebas.forEach((p) => {
        total++;
        if (!p.correcta) fallidas++;
        const item = document.createElement('li');
        item.className = p.correcta ? 'bien' : 'mal';
        item.textContent = p.nombre;
        if (!p.correcta) {
          const detalle = document.createElement('span');
          detalle.className = 'detalle';
          detalle.textContent = p.mensaje;
          item.appendChild(detalle);
        }
        lista.appendChild(item);
      });
      contenedor.append(titulo, lista);
    });

    document.getElementById('resumen').textContent = fallidas === 0
      ? `${total} de ${total} pruebas correctas.`
      : `${fallidas} de ${total} pruebas fallaron.`;
    window.resultadoPruebas = { total, fallidas, grupos };
  }

  mostrarResultados();
})(window.MetodosIterativos);
