/** Presentación de números y nombres de variables. */
(function (MI) {
  'use strict';

  const SUBINDICES = '₀₁₂₃₄₅₆₇₈₉';

  const conMenosTipografico = (texto) => texto.replace(/-/g, '−');

  /** Número con decimales fijos; pasa a notación científica fuera de rango. */
  function formatearNumero(valor, decimales = 6) {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    if (!Number.isFinite(valor)) return valor > 0 ? '∞' : '−∞';
    if (valor === 0) return (0).toFixed(decimales);
    const absoluto = Math.abs(valor);
    if (absoluto >= 1e7 || absoluto < Math.pow(10, -decimales)) {
      return conMenosTipografico(valor.toExponential(Math.min(decimales, 4)).replace('e+', 'e'));
    }
    return conMenosTipografico(valor.toFixed(decimales));
  }

  /** Errores y residuos: siempre en notación científica, para compararlos a simple vista. */
  function formatearError(valor) {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    if (!Number.isFinite(valor)) return '∞';
    if (valor === 0) return '0';
    return conMenosTipografico(valor.toExponential(3).replace('e+', 'e'));
  }

  /** Coeficientes tal como los escribió el usuario, sin ceros de relleno. */
  function formatearCoeficiente(valor) {
    if (!Number.isFinite(valor)) return '—';
    return conMenosTipografico(String(Number(valor.toPrecision(10))).replace('e+', 'e'));
  }

  /** Convierte "x1" en "x₁". */
  function textoVariable(nombre) {
    return nombre.replace(/\d/g, (d) => SUBINDICES[Number(d)]);
  }

  /** Radio espectral: por debajo de 10⁻⁴ el redondeo domina el valor calculado. */
  function formatearRadio(radio) {
    if (!Number.isFinite(radio)) return 'no calculado';
    if (radio < 1e-4) return '≈ 0';
    return radio.toFixed(6);
  }

  MI.interfaz.formato = { formatearNumero, formatearError, formatearCoeficiente, textoVariable, formatearRadio };
})(window.MetodosIterativos);
