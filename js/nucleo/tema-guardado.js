/** Aplica en la página principal el tema elegido antes en la calculadora. */
(function () {
  'use strict';
  try {
    const tema = localStorage.getItem('metodos-iterativos-tema');
    if (tema) document.documentElement.dataset.theme = tema;
  } catch {
    // Sin acceso al almacenamiento se usa el tema del sistema.
  }
})();
