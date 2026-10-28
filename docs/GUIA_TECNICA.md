# Guía técnica: instalación, desarrollo y publicación

Simulador de conquista entre las comunidades autónomas de España. El tablero tiene **50 provincias y Ceuta/Melilla**. Cada comunidad comienza con sus provincias reales; las guerras pueden anexionar provincias o devolver la independencia a comunidades eliminadas.

Está preparado para abrirse como una **web en ordenador y móvil**, tanto vertical como horizontal, y publicarse en **GitHub Pages**. El modo actual es una simulación que puedes ver, pausar y avanzar por fases. La base para controlar una comunidad está preparada, pero ese modo de jugador todavía no tiene interfaz.

## Empezar en tu ordenador

Necesitas Node.js 20 o superior. Desde esta carpeta:

```sh
npm start
```

Abre **http://127.0.0.1:4173/**. No hace falta ejecutar `npm install`: el juego y el servidor local no tienen dependencias externas pendientes de instalar. Las bibliotecas del mapa ya están incluidas en `dist/vendor/`.

Otra opción, si tienes Python:

```sh
python -m http.server 4173 --directory dist
```

No abras `index.html` con doble clic: utiliza el servidor para que funcionen los módulos JavaScript.

Para verlo en un móvil conectado a tu misma wifi:

```sh
npm run dev:lan
```

Abre en el móvil `http://IP_LOCAL_DEL_ORDENADOR:4173/`. Para compartirlo fuera de tu wifi, publícalo en Pages como se explica a continuación.

## Publicar en GitHub Pages

La configuración incluida sigue el [flujo oficial de GitHub Pages con Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

1. Crea un repositorio en GitHub, por ejemplo `guerra-civil-espanola`. Un repositorio público permite usar Pages con GitHub Free.
2. Sube **el contenido de esta carpeta** a la raíz del repositorio: `README.md`, `package.json`, `dist/`, `scripts/`, `tests/`, `docs/`, `data/` y, especialmente, **`.github/workflows/pages.yml`**. Descomprime el ZIP antes de subir los archivos. No subas únicamente el ZIP ni dejes todo dentro de una subcarpeta adicional.
3. Usa la rama **`main`**. Si utilizas otra, cambia `branches: [main]` en el workflow.
4. En el repositorio, abre **Settings → Pages → Build and deployment → Source → GitHub Actions**.
5. En **Actions**, abre **Publicar juego en GitHub Pages → Run workflow**. Si la primera ejecución se lanzó antes de activar Pages y falló, vuelve a ejecutarla después de completar el paso anterior.
6. Al terminar, GitHub mostrará el enlace de la web en el despliegue y en Settings → Pages. Con los nombres del ejemplo tendrá esta forma: `https://TU_USUARIO.github.io/guerra-civil-espanola/`.

El enlace funciona en ordenador y móvil. Cada nuevo `push` a `main` vuelve a comprobar el proyecto y publica `dist/` automáticamente. No se necesita backend, base de datos, clave API ni token personal guardado en el repositorio. El workflow usa los permisos temporales estándar de GitHub Actions.

Si prefieres subirlo con Git desde terminal, crea primero un repositorio vacío y sustituye `TU_USUARIO` por el tuyo:

```sh
git init
git add .
git commit -m "Primera versión del juego"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/guerra-civil-espanola.git
git push -u origin main
```

Después activa Pages siguiendo los pasos 4 y 5. Git te pedirá autenticarte si todavía no lo has hecho.

## Jugar / ver la simulación

- **Auto** reproduce las guerras; **Pausar** detiene el avance.
- El botón de la derecha permite avanzar por fases manualmente.
- Hay tres ritmos: **Cinemático ≈15 s**, **Equilibrado ≈11 s** y **Ágil ≈8 s** por batalla. El resultado tiene su propio tiempo de lectura y después se despeja el mapa durante 2–2,8 segundos.
- El resumen de cada provincia muestra la **bandera del dueño anterior** a la izquierda y la **bandera del nuevo dueño** junto a su nombre a la derecha.
- No se muestra una clasificación después de cada batalla. Al cerrar una ronda aparece la clasificación completa; al unificar el tablero aparece la pantalla de victoria.
- El menú permite consultar reglas, estadísticas, orden de turno, fuentes, sonido y nueva partida.
- El audio se activa tras una interacción. La música y los efectos se generan con Web Audio; no requieren archivos de música externos.
- El botón de orientación cambia la distribución de la interfaz. El móvil también se adapta al girarlo. La pantalla completa depende de las capacidades del navegador y dispone de un modo inmersivo alternativo.

Las partidas se guardan en `localStorage` **en cada navegador y dirección web**. Una partida de la web anterior o de localhost no se copia automáticamente a GitHub Pages. No hay multijugador ni partidas compartidas entre visitantes.

## Archivos y cambios habituales

| Archivo | Para qué sirve |
| --- | --- |
| `dist/index.html` | Estructura de la interfaz, ventanas y controles. |
| `dist/style.css` | Colores, distribución, tamaños y animaciones CSS. |
| `dist/app.js` | Conecta el motor con la interfaz, guardado y reproducción. |
| `dist/engine.mjs` | Dados, fuerza, capitales, bajas, conquistas y liberaciones. |
| `dist/decisions.mjs` | Acciones legales y decisiones de la IA. |
| `dist/initiative.mjs` | Orden de ronda y un movimiento por comunidad. |
| `dist/playback.mjs` | Fases, tiempos y pausa para revisar el mapa. |
| `dist/presentation.mjs` | Filas del resultado: provincia, dueño anterior y nuevo dueño. |
| `dist/territory-map.mjs` | Une las provincias por bando y coloca nombres/banderas. |
| `dist/coasts.mjs` | Zonas marítimas y trazado de flechas por mar. |
| `dist/cinema.mjs` | Cámara, dados, golpes y efectos SVG. |
| `dist/sound.mjs`, `dist/layout.mjs` | Audio y orientación. |
| `dist/data.js`, `geometry.js`, `map-context.js` | Datos cartográficos preparados para el navegador. |
| `dist/flags/`, `dist/vendor/` | Banderas y bibliotecas incluidas, con sus fuentes/licencias. |
| `scripts/`, `data/` | Servidor local y herramientas opcionales para regenerar mapas. |
| `tests/` | Comprobaciones actuales del tablero provincial y de la presentación. |
| `.github/workflows/pages.yml` | Publicación automática en GitHub Pages. |

El código de aplicación está formateado y comentado en español. Los grandes archivos de coordenadas se mantienen compactos porque son datos generados; no conviene editar sus puntos manualmente. Consulta [la arquitectura](ARQUITECTURA.md), [las reglas y sus parámetros](REGLAS.md) y [la base para un modo de jugador](../CONTROL_MODE.md).

## Comprobar cambios

```sh
npm test
```

Comprueba fronteras, liberaciones, capitales, guardado, banderas del resultado y tiempos. No reproduce partidas completas.

La muestra de equilibrio de 16 partidas es opcional y no se ejecuta en cada publicación:

```sh
npm run test:balance
```

Si cambias archivos JavaScript, recarga la página. Si el navegador mantiene una versión anterior, fuerza la recarga; el sufijo `?v=github1` de los imports puede actualizarse para invalidar la caché sin cambiar la versión de las partidas guardadas.

## Regenerar el mapa (opcional)

Para jugar o publicar **no necesitas regenerar nada**: todos los mapas y banderas están incluidos.

```sh
npm run maps:rebuild
```

Este comando descarga cartografía pública, vuelve a calcular vecindades y escribe `dist/data.js`, `dist/geometry.js` y `dist/map-context.js`. Requiere conexión y Node 20+. Las comunidades, colores y capitales base están en `data/factions.json`; las poblaciones provinciales y zonas marítimas están documentadas en `scripts/generate-provinces.mjs`. La caché descargada no se sube a GitHub.

## Fuentes y licencias

Las poblaciones, mapas y banderas tienen su procedencia detallada en [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Se conservan las licencias de las bibliotecas vendorizadas. No se ha asignado todavía una licencia propia al código original del juego; puedes añadir el archivo `LICENSE` que elijas. Las licencias de terceros se mantienen por separado.

Este proyecto no incluye credenciales, configuración del alojamiento anterior ni historial Git privado. El directorio `dist/` es a la vez el código fuente de la web y el contenido que se publica: no hay un paso de compilación oculto.
