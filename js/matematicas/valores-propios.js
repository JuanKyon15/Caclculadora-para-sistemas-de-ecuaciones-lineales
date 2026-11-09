/**
 * Valores propios de una matriz real cuadrada, incluidos los complejos.
 *
 * Se reduce la matriz a forma de Hessenberg con reflexiones de Householder y
 * luego se aplica el algoritmo QR de doble desplazamiento de Francis, siguiendo
 * la organización clásica de EISPACK (rutinas orthes y hqr).
 *
 * El método de la potencia no serviría aquí: las matrices de iteración suelen
 * tener pares complejos dominantes, y en ese caso no converge.
 */
(function (MI) {
  'use strict';

  const EPSILON = Number.EPSILON;
  const MAXIMO_PASOS_POR_VALOR = 200;

  function reducirAHessenberg(matriz) {
    const H = matriz.map((fila) => fila.slice());
    const n = H.length;
    const reflector = new Array(n).fill(0);

    for (let m = 1; m < n - 1; m++) {
      let escala = 0;
      for (let i = m; i < n; i++) escala += Math.abs(H[i][m - 1]);
      if (escala === 0) continue;

      let h = 0;
      for (let i = n - 1; i >= m; i--) {
        reflector[i] = H[i][m - 1] / escala;
        h += reflector[i] * reflector[i];
      }
      let g = Math.sqrt(h);
      if (reflector[m] > 0) g = -g;
      h -= reflector[m] * g;
      reflector[m] -= g;

      for (let j = m; j < n; j++) {
        let f = 0;
        for (let i = n - 1; i >= m; i--) f += reflector[i] * H[i][j];
        f /= h;
        for (let i = m; i < n; i++) H[i][j] -= f * reflector[i];
      }
      for (let i = 0; i < n; i++) {
        let f = 0;
        for (let j = n - 1; j >= m; j--) f += reflector[j] * H[i][j];
        f /= h;
        for (let j = m; j < n; j++) H[i][j] -= f * reflector[j];
      }
      H[m][m - 1] = escala * g;
      for (let i = m + 1; i < n; i++) H[i][m - 1] = 0;
    }
    return H;
  }

  function calcularValoresPropios(matriz) {
    const H = reducirAHessenberg(matriz);
    const dimension = H.length;
    const real = new Array(dimension).fill(0);
    const imaginaria = new Array(dimension).fill(0);

    let norma = 0;
    for (let i = 0; i < dimension; i++) {
      for (let j = Math.max(i - 1, 0); j < dimension; j++) norma += Math.abs(H[i][j]);
    }

    let n = dimension - 1;
    let desplazamientoAcumulado = 0;
    let pasos = 0;
    let p = 0, q = 0, r = 0, s = 0, z = 0, w = 0, x = 0, y = 0;

    while (n >= 0) {
      // Busca un elemento subdiagonal despreciable que divida el problema.
      let l = n;
      while (l > 0) {
        s = Math.abs(H[l - 1][l - 1]) + Math.abs(H[l][l]);
        if (s === 0) s = norma;
        if (Math.abs(H[l][l - 1]) < EPSILON * s) break;
        l--;
      }

      if (l === n) {
        // Un valor propio real aislado.
        real[n] = H[n][n] + desplazamientoAcumulado;
        imaginaria[n] = 0;
        n--;
        pasos = 0;
      } else if (l === n - 1) {
        // Bloque 2×2: se resuelve con la fórmula cuadrática.
        w = H[n][n - 1] * H[n - 1][n];
        p = (H[n - 1][n - 1] - H[n][n]) / 2;
        q = p * p + w;
        z = Math.sqrt(Math.abs(q));
        x = H[n][n] + desplazamientoAcumulado;
        if (q >= 0) {
          z = p >= 0 ? p + z : p - z;
          real[n - 1] = x + z;
          real[n] = z !== 0 ? x - w / z : x + z;
          imaginaria[n - 1] = 0;
          imaginaria[n] = 0;
        } else {
          real[n - 1] = x + p;
          real[n] = x + p;
          imaginaria[n - 1] = z;
          imaginaria[n] = -z;
        }
        n -= 2;
        pasos = 0;
      } else {
        if (pasos >= MAXIMO_PASOS_POR_VALOR) {
          throw new Error('El algoritmo QR no convergió al calcular los valores propios.');
        }

        x = H[n][n];
        y = H[n - 1][n - 1];
        w = H[n][n - 1] * H[n - 1][n];

        // Desplazamientos excepcionales para romper ciclos.
        if (pasos === 10) {
          desplazamientoAcumulado += x;
          for (let i = 0; i <= n; i++) H[i][i] -= x;
          s = Math.abs(H[n][n - 1]) + Math.abs(H[n - 1][n - 2]);
          x = y = 0.75 * s;
          w = -0.4375 * s * s;
        }
        if (pasos === 30) {
          s = (y - x) / 2;
          s = s * s + w;
          if (s > 0) {
            s = Math.sqrt(s);
            if (y < x) s = -s;
            s = x - w / ((y - x) / 2 + s);
            for (let i = 0; i <= n; i++) H[i][i] -= s;
            desplazamientoAcumulado += s;
            x = y = w = 0.964;
          }
        }
        pasos++;

        // Busca dos subdiagonales consecutivas pequeñas.
        let m = n - 2;
        while (m >= l) {
          z = H[m][m];
          r = x - z;
          s = y - z;
          p = (r * s - w) / H[m + 1][m] + H[m][m + 1];
          q = H[m + 1][m + 1] - z - r - s;
          r = H[m + 2][m + 1];
          s = Math.abs(p) + Math.abs(q) + Math.abs(r);
          p /= s;
          q /= s;
          r /= s;
          if (m === l) break;
          const izquierda = Math.abs(H[m][m - 1]) * (Math.abs(q) + Math.abs(r));
          const derecha = EPSILON * (Math.abs(p) * (Math.abs(H[m - 1][m - 1]) + Math.abs(z) + Math.abs(H[m + 1][m + 1])));
          if (izquierda < derecha) break;
          m--;
        }

        for (let i = m + 2; i <= n; i++) {
          H[i][i - 2] = 0;
          if (i > m + 2) H[i][i - 3] = 0;
        }

        // Barrido QR de doble desplazamiento sobre las filas l..n y columnas m..n.
        for (let k = m; k <= n - 1; k++) {
          const hayTercera = k !== n - 1;
          if (k !== m) {
            p = H[k][k - 1];
            q = H[k + 1][k - 1];
            r = hayTercera ? H[k + 2][k - 1] : 0;
            x = Math.abs(p) + Math.abs(q) + Math.abs(r);
            if (x === 0) continue;
            p /= x;
            q /= x;
            r /= x;
          }
          s = Math.sqrt(p * p + q * q + r * r);
          if (p < 0) s = -s;
          if (s === 0) continue;

          if (k !== m) H[k][k - 1] = -s * x;
          else if (l !== m) H[k][k - 1] = -H[k][k - 1];

          p += s;
          x = p / s;
          y = q / s;
          z = r / s;
          q /= p;
          r /= p;

          for (let j = k; j < dimension; j++) {
            p = H[k][j] + q * H[k + 1][j];
            if (hayTercera) {
              p += r * H[k + 2][j];
              H[k + 2][j] -= p * z;
            }
            H[k][j] -= p * x;
            H[k + 1][j] -= p * y;
          }
          for (let i = 0; i <= Math.min(n, k + 3); i++) {
            p = x * H[i][k] + y * H[i][k + 1];
            if (hayTercera) {
              p += z * H[i][k + 2];
              H[i][k + 2] -= p * r;
            }
            H[i][k] -= p;
            H[i][k + 1] -= p * q;
          }
        }
      }
    }

    return real.map((parteReal, i) => ({ real: parteReal, imaginaria: imaginaria[i] }));
  }

  /** ρ(T) = máximo módulo de los valores propios. */
  function calcularRadioEspectral(matriz) {
    const valores = calcularValoresPropios(matriz);
    const radio = Math.max(...valores.map((v) => Math.hypot(v.real, v.imaginaria)));
    return { radio, valores };
  }

  MI.matematicas.valoresPropios = { calcularValoresPropios, calcularRadioEspectral };
})(window.MetodosIterativos);
