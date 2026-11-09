# Calculadora para resolver sistemas de ecuaciones lineales

Aplicación web educativa e interactiva sobre los métodos iterativos de **Jacobi** y **Gauss-Seidel**.

**Integrantes:** Juan Cayon, Alexander Marquez y Andres Consuegra.

## Cómo ejecutarla

1. Descomprime el proyecto.
2. Haz doble clic en `index.html`.
3. Pulsa **Iniciar calculadora**.

No necesita instalación, servidor ni base de datos. Funciona en las versiones actuales de Chrome, Edge, Firefox y Safari.

La calculadora, las tablas y los gráficos funcionan sin internet. La conexión solo se usa para descargar las tipografías y MathJax, la biblioteca que dibuja las fórmulas de la teoría. Si MathJax no se puede descargar, la página lo avisa y las fórmulas aparecen en LaTeX.

## Cómo ejecutarla desde Visual Studio Code con Live Server

1. En Visual Studio Code, abre **Archivo > Abrir área de trabajo desde archivo** y elige `metodos-iterativos.code-workspace`.
2. Si Visual Studio Code lo sugiere, instala la extensión recomendada **Live Server**. Si no aparece el aviso, búscala por su identificador: `ritwickdey.LiveServer`.
3. Pulsa **Go Live** en la barra inferior derecha. También puedes hacer clic derecho sobre `index.html` y elegir **Open with Live Server**.
4. El navegador abrirá `http://127.0.0.1:5500/`. Cada vez que guardes un archivo, la página se recargará sola.

Para depurar, deja Live Server encendido y pulsa **F5**. Necesitas tener Chrome instalado.

## Qué se puede hacer

- Elegir el tamaño del sistema, de 2×2 a 10×10.
- Escribir la matriz A, el vector b y los valores iniciales, o pegar las ecuaciones como texto (`2x + y = 5`).
- Elegir Jacobi, Gauss-Seidel o comparar ambos.
- Definir la tolerancia y el máximo de iteraciones.
- Definir los decimales, de 0 a 15, que se usan en el redondeo interno y en pantalla.
- Elegir la norma (1, 2, 3 o infinito) y el tipo de error (absoluto, relativo o porcentual).
- Consultar la tabla de iteraciones, el desarrollo numérico de cada paso y los gráficos.
- Revisar el análisis de convergencia, con una advertencia si el sistema no es diagonal dominante.
- Reordenar las ecuaciones automáticamente para buscar dominancia o quitar ceros de la diagonal.

### Redondeo interno

Cada variable se redondea en cuanto se calcula, con empates alejándose de cero, como en el cálculo a mano. Gauss-Seidel usa ya el valor redondeado en las ecuaciones siguientes. Con d decimales, el menor cambio posible entre iteraciones es 10⁻ᵈ; si la tolerancia absoluta es menor, la aplicación lo advierte.

### Normas

La norma elegida se aplica al error entre iteraciones, al residuo y a la distancia a la solución directa. El análisis ‖T‖ < 1 usa siempre la norma infinito.

## Arquitectura

```
metodos-iterativos/
├── index.html                       Página principal
├── calculadora.html                 Calculadora y contenido académico
├── README.md
├── metodos-iterativos.code-workspace   Área de trabajo de Visual Studio Code
├── css/
│   ├── base.css                     Colores, tipografía y tema claro/oscuro
│   ├── portada.css                  Página principal
│   ├── disposicion.css              Estructura de la calculadora
│   ├── componentes.css              Botones, tablas y avisos
│   └── laboratorio.css              Formulario, resultados y gráficos
├── js/
│   ├── nucleo/                      Espacio de nombres, MathJax y tema guardado
│   ├── matematicas/                 Algoritmos, sin acceso a la página
│   │   ├── jacobi.js                Actualización y matriz T de Jacobi
│   │   ├── gauss-seidel.js          Actualización y matriz T de Gauss-Seidel
│   │   ├── despeje.js               Despeje común de una variable
│   │   ├── motor-iterativo.js       Bucle, normas, error y criterio de parada
│   │   ├── analisis-convergencia.js Dominancia, definida positiva y radio espectral
│   │   ├── valores-propios.js       Algoritmo QR para calcular ρ(T)
│   │   ├── reordenamiento-filas.js  Búsqueda de un orden mejor de las ecuaciones
│   │   └── algebra-lineal.js        Normas, redondeo y eliminación gaussiana
│   ├── validacion/                  Conversión numérica, validador e intérprete de ecuaciones
│   ├── datos/                       Sistemas de ejemplo
│   ├── graficos/                    Gráficos SVG propios
│   ├── interfaz/                    Formulario, tabla, explorador de pasos e informes
│   └── aplicacion.js                Conecta todos los módulos
└── pruebas/                         Pruebas que se ejecutan en el navegador
```

El flujo es de un solo sentido:

```
formulario → validación → motor + método → resultados → tabla, explorador y gráficos
```

Dos decisiones técnicas:

- **Scripts clásicos con un espacio de nombres global.** Los navegadores bloquean los módulos ES en páginas abiertas con `file://`, y la aplicación debe funcionar con doble clic.
- **Gráficos propios en SVG.** Funcionan sin internet y se generan directamente con los resultados de los algoritmos.

## Tres niveles de información sobre convergencia

La aplicación no los mezcla:

1. **Condiciones suficientes**, como la dominancia diagonal. Si se cumplen, hay garantía. Si no se cumplen, no se concluye nada.
2. **Radio espectral**: el método converge para todo valor inicial si y solo si ρ(T) < 1.
3. **Comportamiento observado**, que depende además de x⁽⁰⁾, la tolerancia, el redondeo y el máximo de iteraciones.

## Sistemas para probar

Todos están en el selector **Sistema de ejemplo**.

| Sistema | Solución | Qué muestra |
|---|---|---|
| `2x + y = 5`, `x + 3y = 6` | (1.8, 1.4) | Ambos convergen |
| `4x − y + z = 7`, `4x − 8y + z = −21`, `−2x + y + 5z = 15` | (2, 4, 3) | Ejemplo de la teoría |
| A = [[2,−1,1],[2,2,2],[−1,−1,2]], b = (−1,4,−5) | (1, 2, −1) | Solo converge Gauss-Seidel |
| A = [[1,2,−2],[1,1,1],[2,2,1]], b = (1,3,5) | (1, 1, 1) | Solo converge Jacobi |
| A = [[1,−0.99],[−0.99,1]], b = (0.01,0.01) | (1, 1) | Un cambio pequeño no implica un error pequeño |
| A = [[1,3],[4,1]], b = (4,5) | (1, 1) | Diverge hasta reordenar las ecuaciones |
| A = [[0,2,1],[4,1,−1],[1,−1,3]], b = (7,3,8) | (1, 2, 3) | Cero en la diagonal |

## Pruebas

Abre `pruebas/pruebas.html` en el navegador. Las pruebas ejecutan los mismos módulos de la aplicación y comparan sus resultados con soluciones exactas y cálculos hechos a mano.
