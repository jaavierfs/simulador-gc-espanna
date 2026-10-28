# Arquitectura y mantenimiento

## Dos clases de identificadores

- Bando / comunidad: `"01"`…`"19"`, en `factions`.
- Provincia / ciudad conquistable: `"p01"`…`"p52"`, en `regions`.
- `region.community` es la comunidad original de esa provincia. No cambia al conquistarla.
- `state.owners[provinceId]` es el dueño actual. Sí cambia al conquistarla.

Estos dos últimos valores no son intercambiables. En una liberación, el origen identifica qué comunidad puede reaparecer. En un resumen de conquista, la bandera anterior se obtiene de `change.from` y la nueva de `change.to`.

## Estado de la partida

```js
{
  version: 3,
  owners: { p06: "11", p10: "11" /* resto de provincias */ },
  populations: { p06: 663886, p10: 387752 /* habitantes actuales */ },
  capitals: { "11": "p06" /* una provincia propia por bando activo */ },
  initiative: {
    number: 1,
    order: [/* orden fijo de esta ronda */],
    pending: [/* bandos que todavía pueden mover */],
    acted: [/* bandos que ya han movido */],
    excluded: [/* eliminados durante la ronda */]
  },
  turn: 0, // número de batallas completadas, no número de rondas
  wins: {},
  history: [],
  totalCasualties: 0
}
```

`initial()` crea el reparto real. `restore()` valida y carga el guardado; también adapta el antiguo tablero de comunidades a provincias. El guardado del navegador usa `gce-provinces-v3`. Cambiar la versión de los recursos (`?v=…`) no borra las partidas.

## De una decisión a la animación

1. `legalActions()` enumera ataques con fronteras reales o conexiones marítimas válidas.
2. `planInitiative()` decide a qué bando le toca sin gastar todavía su movimiento en el estado visible.
3. `prepareTurn()` clona el estado; `battle()` resuelve la batalla en esa copia.
4. `app.js` revela objetivo, dados, puntos y resultado por fases. El resultado se calcula una sola vez: pausar o cambiar de ritmo no vuelve a tirar los dados.
5. Al entrar en fase 5, la aplicación sustituye el estado visible por la copia y lo guarda.
6. Tras el resumen, `current.mapReview` retira el popup y las flechas y muestra el mapa general. Esta pausa no calcula otra batalla ni consume un turno.
7. Después llega la siguiente batalla, el resumen de ronda o la victoria final.

Los tiempos de lectura y de mapa despejado son independientes en `playback.mjs`. En modo manual se avanza con **Ver mapa** y después **Siguiente batalla / Resumen de ronda / Ver victoria**.

## Historial de cambios territoriales

Cada `result.changes` contiene entradas como:

```js
{
  territory: "p08",       // Barcelona
  community: "09",        // origen catalán
  from: "13",             // Madrid la poseía antes de ESTA guerra
  to: "11",               // Extremadura la posee después
  population: 5900000,    // habitantes restantes transferidos, ejemplo
  type: "conquest"
}
```

La fila del resultado usa `presentation.mjs`. Sirve tanto para anexiones como para contraataques, independencias y liberaciones.

## Mapas, banderas y rendimiento

`territory-map.mjs` une los polígonos de provincias que controla un mismo bando. Cada componente separado recibe su propia bandera recortada: una isla o enclave no comparte un rectángulo de bandera estirado con otro componente distante.

El mapa conserva límites provinciales como una capa ligera sobre las banderas. Los países neutrales son decoración geográfica y nunca entran en las acciones legales. Canarias tiene una proyección propia en su recuadro; Ceuta y Melilla están ampliadas para poder verlas. La geometría se guarda en una caché limitada para contener el uso de memoria en móvil.

Las librerías de polígonos se incluyen localmente en `vendor/`, de modo que la web no depende de un CDN. Las animaciones respetan `prefers-reduced-motion`. El audio se crea con Web Audio tras una interacción del usuario.

## Control humano futuro

`prepareTurn(state, regions, rng, command)` admite un comando con `attacker`, `defender`, `source`, `target` y `objectiveType`. Una futura pantalla de jugador solo tendría que presentar acciones de `legalActions()` cuando le toque a su bando y enviar el comando elegido. La IA puede continuar tomando las demás decisiones. Véase `CONTROL_MODE.md`.
