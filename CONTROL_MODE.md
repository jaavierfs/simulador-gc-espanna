# Base para controlar una comunidad

La interfaz actual permite observar la simulación, pausarla y avanzar por fases. Todavía no hay selección de comunidad ni pantalla para ordenar ataques como jugador.

- `initiative.mjs` controla el orden y el movimiento disponible. `planInitiative()` prepara la cola sin modificar el estado; `finishInitiative()` retira eliminados. Las comunidades liberadas esperan a la siguiente ronda.
- `decisions.mjs` expone `legalActions(state, regions, factionId)` y `chooseDecision()`. Los comandos pueden indicar `attacker`, `defender`, `target`, `source` y `objectiveType` (`annex` o `liberate`). Un comando ilegal se rechaza antes de gastar el movimiento.
- `prepareTurn(state, regions, rng, command)` acepta un comando opcional del jugador. Sin comando decide la IA. Devuelve la copia con el resultado calculado; la aplicación la confirma al revelar el desenlace.
- Una futura interfaz debe fijar el orden de ronda, esperar a que toque el bando elegido, ofrecer acciones de `legalActions()` y enviar la decisión a `prepareTurn()`. Los otros bandos siguen con la IA.
- El tablero usa 52 provincias/ciudades (`p01`…`p52`) y 19 IDs de bando (`01`…`19`). `region.community` es el origen de una provincia; `state.owners` guarda su dueño actual. Las capitales relacionan un bando con una provincia que conserva.
- El motor aplica a jugadores e IA las mismas fronteras, bajas, capitales, fuerza movilizada y límites a las victorias de grandes inferiores. Las liberaciones solo reviven comunidades ausentes y les devuelven provincias de su origen.
- `PACES` / `phaseDuration()` controlan las fases; `mapReviewDuration()` controla la pausa de mapa despejado. `roundComplete` da paso al resumen y `winner` a la victoria. Ninguna de estas pantallas consume otro movimiento.
