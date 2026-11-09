/** Índice lateral con la sección activa y cambio de tema claro/oscuro. */
(function (MI) {
  'use strict';

  const CLAVE_TEMA = 'metodos-iterativos-tema';

  function leerTemaGuardado() {
    try {
      return localStorage.getItem(CLAVE_TEMA);
    } catch {
      return null;
    }
  }

  function guardarTema(tema) {
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // El navegador puede bloquear el almacenamiento; el tema sigue funcionando en esta visita.
    }
  }

  function temaActual() {
    const explicito = document.documentElement.dataset.theme;
    if (explicito) return explicito;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function iniciarTema() {
    const boton = document.getElementById('cambiar-tema');
    const actualizarEtiqueta = () => {
      boton.textContent = temaActual() === 'dark' ? 'Tema claro' : 'Tema oscuro';
    };
    const guardado = leerTemaGuardado();
    if (guardado) document.documentElement.dataset.theme = guardado;
    actualizarEtiqueta();
    boton.addEventListener('click', () => {
      const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = nuevo;
      guardarTema(nuevo);
      actualizarEtiqueta();
    });
  }

  function iniciarSeccionActiva() {
    const enlaces = [...document.querySelectorAll('#navegacion a')];
    const secciones = enlaces.map((a) => document.querySelector(a.getAttribute('href')));
    const marcar = (seccion) => {
      enlaces.forEach((a) => {
        if (a.getAttribute('href') === `#${seccion.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    const observador = new IntersectionObserver((entradas) => {
      const visible = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) marcar(visible.target);
    }, { rootMargin: '-15% 0px -70% 0px' });
    secciones.forEach((s) => observador.observe(s));
  }

  MI.interfaz.iniciarNavegacion = function iniciarNavegacion() {
    iniciarTema();
    iniciarSeccionActiva();
  };
})(window.MetodosIterativos);
