/** Ayudas para construir el DOM sin concatenar HTML. */
(function (MI) {
  'use strict';

  /**
   * Crea un elemento. `propiedades` admite class, dataset, atributos y on*.
   * Los hijos pueden ser nodos, textos, listas o valores nulos.
   */
  function el(etiqueta, propiedades = {}, ...hijos) {
    const elemento = document.createElement(etiqueta);
    Object.entries(propiedades).forEach(([clave, valor]) => {
      if (valor === undefined || valor === null || valor === false) return;
      if (clave === 'class') elemento.className = valor;
      else if (clave === 'dataset') Object.assign(elemento.dataset, valor);
      else if (clave === 'style') elemento.style.cssText = valor;
      else if (clave.startsWith('on')) elemento.addEventListener(clave.slice(2), valor);
      else if (clave.startsWith('aria-') || clave === 'role') elemento.setAttribute(clave, valor);
      else if (clave in elemento) elemento[clave] = valor;
      else elemento.setAttribute(clave, valor === true ? '' : valor);
    });
    agregar(elemento, hijos);
    return elemento;
  }

  function agregar(padre, hijos) {
    hijos.flat(Infinity).forEach((hijo) => {
      if (hijo === null || hijo === undefined || hijo === false) return;
      padre.append(hijo instanceof Node ? hijo : String(hijo));
    });
  }

  function vaciar(elemento) {
    elemento.replaceChildren();
  }

  const NS_SVG = 'http://www.w3.org/2000/svg';

  function svg(etiqueta, atributos = {}, ...hijos) {
    const elemento = document.createElementNS(NS_SVG, etiqueta);
    Object.entries(atributos).forEach(([clave, valor]) => {
      if (valor === undefined || valor === null) return;
      if (clave === 'style') elemento.style.cssText = valor;
      else elemento.setAttribute(clave, valor);
    });
    agregar(elemento, hijos);
    return elemento;
  }

  MI.interfaz.dom = { el, svg, vaciar };
})(window.MetodosIterativos);
