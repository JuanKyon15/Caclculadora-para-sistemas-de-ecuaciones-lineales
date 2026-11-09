/** Recorre las iteraciones una a una y muestra su desarrollo numérico. */
(function (MI) {
  'use strict';

  const { el, vaciar } = MI.interfaz.dom;
  const { formatearError } = MI.interfaz.formato;
  const { describirMedida } = MI.matematicas.motorIterativo;

  const MILISEGUNDOS_POR_PASO = 1100;

  function crearExploradorPasos(contenedor, alCambiarIteracion) {
    let datos = null;
    let k = 1;
    let temporizador = null;

    const botones = {};
    const crearBoton = (clave, texto, accion) => {
      botones[clave] = el('button', { type: 'button', class: 'boton boton-pequeno', onclick: accion }, texto);
      return botones[clave];
    };

    const deslizador = el('input', {
      type: 'range',
      min: 1,
      step: 1,
      'aria-label': 'Iteración mostrada',
      oninput: (evento) => {
        detener();
        ir(Number(evento.target.value));
      },
    });
    const posicion = el('span', { class: 'explorador-posicion' });
    const cuerpo = el('div');
    const resumen = el('div', { class: 'explorador-resumen' });

    contenedor.append(el('div', { class: 'explorador' },
      el('div', { class: 'explorador-controles' },
        crearBoton('inicio', 'Primera', () => { detener(); ir(1); }),
        crearBoton('anterior', 'Anterior', () => { detener(); ir(k - 1); }),
        crearBoton('reproducir', 'Reproducir', alternarReproduccion),
        crearBoton('siguiente', 'Siguiente', () => { detener(); ir(k + 1); }),
        crearBoton('final', 'Última', () => { detener(); ir(ultimaIteracion()); }),
        deslizador,
        posicion),
      cuerpo,
      resumen
    ));

    function ultimaIteracion() {
      return datos ? datos.resultado.iteraciones.length - 1 : 1;
    }

    function detener() {
      if (temporizador !== null) clearInterval(temporizador);
      temporizador = null;
      botones.reproducir.textContent = 'Reproducir';
    }

    function alternarReproduccion() {
      if (temporizador !== null) {
        detener();
        return;
      }
      if (k >= ultimaIteracion()) ir(1);
      botones.reproducir.textContent = 'Pausar';
      temporizador = setInterval(() => {
        if (k >= ultimaIteracion()) {
          detener();
          return;
        }
        ir(k + 1);
      }, MILISEGUNDOS_POR_PASO);
    }

    function dibujar() {
      const { resultado, sistema, metodo, variables, decimales } = datos;
      const ultima = ultimaIteracion();
      const iteracion = resultado.iteraciones[k];
      const { unidad } = describirMedida(resultado.tipoError, resultado.norma);

      deslizador.max = ultima;
      deslizador.value = k;
      posicion.textContent = `Iteración ${k} de ${ultima}`;
      botones.inicio.disabled = k <= 1;
      botones.anterior.disabled = k <= 1;
      botones.siguiente.disabled = k >= ultima;
      botones.final.disabled = k >= ultima;
      botones.reproducir.disabled = ultima <= 1;

      vaciar(cuerpo);
      cuerpo.append(MI.interfaz.crearDesglose({
        metodo,
        A: sistema.A,
        b: sistema.b,
        xAnterior: resultado.iteraciones[k - 1].x,
        k,
        variables,
        decimales,
        decimalesInternos: resultado.decimales,
      }));

      vaciar(resumen);
      resumen.append(
        el('span', {}, 'Error ', el('strong', {}, `${formatearError(iteracion.error)}${unidad}`)),
        el('span', {}, 'Residuo ', el('strong', {}, formatearError(iteracion.residuo))),
        el('span', {}, iteracion.cumpleTolerancia ? 'Cumple la tolerancia: el método se detiene aquí.' : 'No cumple la tolerancia.')
      );
    }

    function ir(destino) {
      if (!datos) return;
      k = Math.max(1, Math.min(ultimaIteracion(), destino));
      dibujar();
      alCambiarIteracion(k);
    }

    return {
      /** @param {{resultado:object,sistema:object,metodo:object,variables:string[],decimales:number}} nuevosDatos */
      mostrar(nuevosDatos) {
        detener();
        datos = nuevosDatos;
        k = 1;
        dibujar();
      },
      ir(destino) {
        detener();
        ir(destino);
      },
      detener,
    };
  }

  MI.interfaz.crearExploradorPasos = crearExploradorPasos;
})(window.MetodosIterativos);
