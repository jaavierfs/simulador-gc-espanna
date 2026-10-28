# Reglas y lugares donde ajustar el equilibrio

| Mecánica | Regla actual | Archivo |
| --- | --- | --- |
| Turnos | Un movimiento por bando y ronda; pequeños primero, con mezcla limitada de vecinos de fuerza parecida | `initiative.mjs` |
| Orden | 45 % número de provincias y 55 % población, normalizados frente al mayor | `initiative.mjs` |
| Dados | Tres por lado, ordenados; suma la diferencia por pareja; empate +1 defensa | `engine.mjs`, `compare()` |
| Población movilizada | 75 % población local + 25 % total del bloque dividido por raíz del número de provincias | `engine.mjs`, `mobilized()` |
| Ventaja de población | Potencia 0,18 de la proporción de fuerzas, máximo ×1,85; sin dados extra ni puntos gratuitos | `engine.mjs`, `multiplier()` |
| Ventaja táctica | 20 % atacante ×1,3; 20 % defensor ×1,3; 60 % sin ventaja | `engine.mjs`, `battle()` |
| Capital | Defensa ×1,2; al perderla se elige al azar otra provincia propia | `engine.mjs`, `syncCapitals()` |
| Bajas de combate | Ambos bandos pierden 0,3–0,8 % en todas las guerras, antes de transferir provincias | `engine.mjs`, `penalize()` |
| Ataque fallido | Pierde además 2 % de habitantes restantes | `engine.mjs`, `LOSS_RATE` |
| Varias conquistas | Hasta 2 al alcanzar razón de puntos 1,4; 3 al duplicar; 4 al triplicar | `engine.mjs`, `territoryQuota()` |
| Sorpresa extrema | Bando al menos 8 veces menor en fuerza o población: victoria estrecha y un solo territorio | `engine.mjs`, `result.upset` |
| Contraataque | Defensa con triple de puntos y mínimo 3; el atacante conserva al menos una provincia | `engine.mjs`, `crushingDefeat()` |
| Liberación como objetivo | 2 %, solo si la comunidad original está ausente y el defensor tiene varias provincias | `decisions.mjs` |
| Liberación adicional | 2,5 %; pueden unirse más provincias nativas a la misma liberación en esa batalla | `engine.mjs` |
| Independencia por contraataque | 4 %, solo para comunidades ausentes | `engine.mjs` |

Una liberación devuelve provincias a su comunidad original, no a un bando nuevo inventado. El primer cambio cumple el objetivo anunciado. Los siguientes solo avanzan por fronteras o rutas legales desde posesiones del vencedor; una provincia liberada no sirve de puente del atacante.

La población de la provincia objetivo de una liberación no se cuenta en la fuerza defensora durante esa batalla. Las bajas, en cambio, se aplican al bando real antes del cambio de propiedad. Se conserva al menos un habitante por provincia y las pérdidas se redondean y reparten sin crear o destruir habitantes fuera del contador de bajas.

Existe un pequeño ajuste regional intencionado para Extremadura: `REGIONAL_SPIRIT['11'] = 1.05`. Se aplica al ataque y la defensa y no tiene un aviso especial en la interfaz.

## Capitales iniciales

Se utilizan Sevilla, Zaragoza, Asturias, Illes Balears, Cantabria, Toledo, Barcelona, Valencia, Badajoz (Mérida), A Coruña (Santiago), Madrid, Murcia, Navarra, Álava (Vitoria), La Rioja, Ceuta y Melilla. Canarias elige una de sus dos provincias capitalinas; Castilla y León usa Valladolid como sede de sus principales instituciones. El listado por ID está en `data/factions.json`.

## Mar

- Norte: A Coruña, Lugo, Pontevedra, Asturias, Cantabria, Bizkaia y Gipuzkoa.
- Mediterráneo: Murcia, Alicante, Valencia, Castellón, Tarragona, Barcelona, Girona e Illes Balears.
- Sur: Murcia, Almería, Granada, Málaga, Cádiz, Huelva, Ceuta y Melilla.
- Canarias: Las Palmas y Santa Cruz de Tenerife se conectan entre sí y con las provincias costeras de Andalucía, Galicia, Ceuta y Melilla.

Dentro de cada zona, cualquier pareja de provincias puede atacarse por mar. Murcia pertenece al sur y al Mediterráneo. Las provincias interiores no tienen conexión marítima. Se prefiere una frontera terrestre cuando la pareja dispone de ambos tipos de conexión.

La legalidad está materializada en `region.landNeighbors`, `region.maritimeNeighbors` y su unión `region.neighbors`. Los arcos visuales están en `coasts.mjs`; cambiar solo la flecha no cambia las reglas de conexión. Para modificar las zonas de forma permanente hay que cambiar también el generador provincial y regenerar los datos.
