/**
 * Configuración de MathJax. Debe cargarse antes de la biblioteca.
 */
window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'input'],
  },
  svg: {
    fontCache: 'global',
  },
};

/** Avisa en la página si la biblioteca de fórmulas no se pudo descargar. */
window.avisarFallaMathJax = function avisarFallaMathJax() {
  const aviso = document.getElementById('aviso-formulas');
  if (aviso) aviso.hidden = false;
};
