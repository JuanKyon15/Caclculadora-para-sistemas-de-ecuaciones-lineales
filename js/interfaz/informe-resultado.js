/**
 * Redacta lo ocurrido en una ejecución. El texto se limita a lo observado y no
 * afirma convergencia general a partir de una sola ejecución.
 */
(function (MI) {
  'use strict';

  const { el, vaciar } = MI.interfaz.dom;
  const { formatearNumero, formatearError, textoVariable, formatearRadio } = MI.interfaz.formato;
  const { ESTADO, TENDENCIA, NORMAS, describirMedida } = MI.matematicas.motorIterativo;
  const { CLASIFICACION_RADIO } = MI.matematicas.analisisConvergencia;
  const { normaInfinito, restarVectores } = MI.matematicas.algebraLineal;

  const medirEnNorma = (resultado, vector) => NORMAS[resultado.norma].medir(vector);
  const { COLOR_METODO } = MI.graficos.resultados;

  function calcularErrorReal(resultado, referencia) {
    return referencia.solucion ? medirEnNorma(resultado, restarVectores(resultado.xFinal, referencia.solucion)) : null;
  }

  function ultimoPaso(resultado) {
    const filas = resultado.iteraciones;
    if (filas.length < 2) return null;
    return medirEnNorma(resultado, restarVectores(filas[filas.length - 1].x, filas[filas.length - 2].x));
  }

  function describirTolerancia(resultado, analisisMetodo, referencia) {
    const { unidad } = describirMedida(resultado.tipoError, resultado.norma);
    const notas = [];
    const errorReal = calcularErrorReal(resultado, referencia);
    const paso = ultimoPaso(resultado);

    if (errorReal !== null && paso !== null && paso > 0 && errorReal > 5 * paso && errorReal > 1e-12) {
      notas.push(`La distancia real a la solución (${formatearError(errorReal)}) es unas ${Math.round(errorReal / paso)} veces el último cambio entre iteraciones. La convergencia es lenta y la tolerancia subestima el error.`);
    }
    if (analisisMetodo.clasificacion === CLASIFICACION_RADIO.MAYOR_QUE_UNO) {
      notas.push(`Con ρ(T) = ${formatearRadio(analisisMetodo.radioEspectral)} no hay convergencia general. Este resultado se debe al valor inicial particular.`);
    }
    if (referencia.singular) {
      notas.push('La matriz es singular: esta aproximación es solo una de las infinitas soluciones.');
    }
    return {
      tono: 'exito',
      etiqueta: 'Tolerancia alcanzada',
      titulo: `Se detuvo en la iteración ${resultado.iteracionesRealizadas}`,
      texto: `El error ${formatearError(resultado.errorFinal)}${unidad} es menor o igual que la tolerancia ${formatearError(resultado.tolerancia)}${unidad}. La sucesión se estabilizó bajo estas condiciones.`,
      notas,
    };
  }

  function estimarIteracionesRestantes(resultado) {
    const { factorObservado, errorFinal, tolerancia } = resultado;
    if (!(factorObservado > 0 && factorObservado < 1) || !(errorFinal > 0)) return null;
    return Math.ceil(Math.log(tolerancia / errorFinal) / Math.log(factorObservado));
  }

  function describirMaximo(resultado) {
    const notas = [];
    const base = `Se realizaron las ${resultado.maxIteraciones} iteraciones permitidas y el error final (${formatearError(resultado.errorFinal)}) sigue por encima de la tolerancia.`;
    const etiqueta = 'Máximo de iteraciones';

    if (resultado.tipoError !== 'absoluto' && normaInfinito(resultado.xFinal) < 1e-8) {
      notas.push('La aproximación es casi cero y el error relativo no resulta adecuado en ese caso. Prueba con un error absoluto.');
    }

    switch (resultado.tendencia) {
      case TENDENCIA.DECRECIENTE: {
        const restantes = estimarIteracionesRestantes(resultado);
        if (restantes !== null) notas.push(`Al ritmo observado harían falta unas ${restantes} iteraciones más.`);
        return {
          tono: 'alerta',
          etiqueta,
          titulo: 'El error disminuye, pero no llegó a la tolerancia',
          texto: `${base} Cada iteración multiplica el error por un factor medio de ${resultado.factorObservado.toFixed(4)}.`,
          notas,
        };
      }
      case TENDENCIA.CRECIENTE:
        return {
          tono: 'peligro',
          etiqueta,
          titulo: 'El error está creciendo',
          texto: `${base} Cada iteración multiplica el error por un factor medio de ${resultado.factorObservado.toFixed(4)}, un comportamiento divergente.`,
          notas,
        };
      case TENDENCIA.ESTANCADA:
        return {
          tono: 'alerta',
          etiqueta,
          titulo: 'El error no cambia',
          texto: `${base} El error se mantiene casi constante: la sucesión oscila o se estancó.${resultado.decimales !== null ? ` El redondeo a ${resultado.decimales} decimales puede ser la causa.` : ''}`,
          notas,
        };
      default:
        return { tono: 'alerta', etiqueta, titulo: 'Hay pocas iteraciones para sacar conclusiones', texto: base, notas };
    }
  }

  function describirDivergencia(resultado) {
    return {
      tono: 'peligro',
      etiqueta: 'Divergencia detectada',
      titulo: `El cálculo se detuvo en la iteración ${resultado.iteracionesRealizadas}`,
      texto: 'Las aproximaciones crecieron mucho más allá de la escala del problema, por lo que continuar no tiene sentido numérico.',
      notas: [],
    };
  }

  function describirEjecucion(resultado, analisisMetodo, referencia) {
    if (resultado.estado === ESTADO.TOLERANCIA_ALCANZADA) return describirTolerancia(resultado, analisisMetodo, referencia);
    if (resultado.estado === ESTADO.DIVERGENCIA_DETECTADA) return describirDivergencia(resultado);
    return describirMaximo(resultado);
  }

  function crearDato(etiqueta, valor) {
    return [el('dt', {}, etiqueta), el('dd', {}, valor)];
  }

  function crearTarjeta(resultado, analisisMetodo, referencia, variables) {
    const descripcion = describirEjecucion(resultado, analisisMetodo, referencia);
    const { unidad, subindice } = describirMedida(resultado.tipoError, resultado.norma);
    const errorReal = calcularErrorReal(resultado, referencia);

    return el('article', { class: 'tarjeta', dataset: { metodo: resultado.metodoId, estado: resultado.estado } },
      el('div', { class: 'tarjeta-cabecera' },
        el('span', { class: 'tarjeta-nombre' },
          el('span', { class: 'clave-metodo', style: `background:${COLOR_METODO[resultado.metodoId]}` }),
          resultado.nombreMetodo),
        el('span', { class: `pastilla pastilla-${descripcion.tono}` }, descripcion.etiqueta)
      ),
      el('div', { class: 'tarjeta-titulo' }, descripcion.titulo),
      el('p', { class: 'tarjeta-texto' }, descripcion.texto),
      el('dl', { class: 'datos-resultado' },
        crearDato('Aproximación', el('span', { class: 'vector-final' }, resultado.xFinal.map((v, i) => el('span', {}, `${textoVariable(variables[i])} = ${formatearNumero(v, resultado.decimales ?? 6)}`)))),
        crearDato('Iteraciones', String(resultado.iteracionesRealizadas)),
        crearDato('Error final', `${formatearError(resultado.errorFinal)}${unidad}`),
        crearDato(`Residuo ‖b − Ax‖${subindice}`, formatearError(resultado.residuoFinal)),
        errorReal !== null ? crearDato('Distancia a la solución directa', formatearError(errorReal)) : null
      ),
      descripcion.notas.length ? el('ul', { class: 'tarjeta-notas' }, descripcion.notas.map((n) => el('li', {}, n))) : null
    );
  }

  /** Frase de síntesis cuando se ejecutaron ambos métodos. */
  function redactarComparacion(jacobi, gaussSeidel) {
    const alcanzo = (r) => r.estado === ESTADO.TOLERANCIA_ALCANZADA;
    if (alcanzo(jacobi) && alcanzo(gaussSeidel)) {
      const nJ = jacobi.iteracionesRealizadas;
      const nG = gaussSeidel.iteracionesRealizadas;
      if (nJ === nG) return `Ambos métodos necesitaron ${nJ} iteraciones.`;
      const [masRapido, nMenor, otro, nMayor] = nG < nJ ? ['Gauss-Seidel', nG, 'Jacobi', nJ] : ['Jacobi', nJ, 'Gauss-Seidel', nG];
      return `${masRapido} alcanzó la tolerancia en ${nMenor} iteraciones y ${otro} en ${nMayor}.`;
    }
    if (alcanzo(jacobi)) return 'Solo Jacobi alcanzó la tolerancia con estos datos.';
    if (alcanzo(gaussSeidel)) return 'Solo Gauss-Seidel alcanzó la tolerancia con estos datos.';
    return 'Ninguno de los dos métodos alcanzó la tolerancia con estos datos.';
  }

  function mostrarResultado(contenedor, fraseElemento, datos) {
    const { resultados, analisis, variables } = datos;
    vaciar(contenedor);
    Object.values(resultados).filter(Boolean).forEach((resultado) => {
      contenedor.append(crearTarjeta(resultado, analisis.metodos[resultado.metodoId], analisis.referencia, variables));
    });

    const comparar = resultados.jacobi && resultados['gauss-seidel'];
    fraseElemento.hidden = !comparar;
    fraseElemento.textContent = comparar ? redactarComparacion(resultados.jacobi, resultados['gauss-seidel']) : '';
  }

  MI.interfaz.informeResultado = { mostrarResultado, describirEjecucion, redactarComparacion };
})(window.MetodosIterativos);
