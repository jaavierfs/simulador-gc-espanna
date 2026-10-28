/**
 * Planificación de la presentación: tiempos en milisegundos. La fase 5 confirma
 * el nuevo estado. La revisión posterior del mapa es solo visual: no tira dados
 * ni gasta movimientos adicionales.
 */
import { battle } from "./engine.mjs?v=github1";
export const PHASES = [
  "El frente",
  "Primer dado",
  "Segundo dado",
  "Tercer dado",
  "Los puntos",
  "El resultado",
];
export const DURATIONS = [1700, 850, 850, 850, 900, 3700];
export const PACES = {
  cinema: [2300, 1150, 1150, 1150, 1200, 4700],
  balanced: DURATIONS,
  fast: [1100, 580, 580, 580, 650, 2900],
};
// Esta espera se aplica después del resumen, también en el ritmo Ágil.
export const MAP_REVIEW_DURATIONS = {
  cinema: 2800,
  balanced: 2400,
  fast: 2000,
};
/** Tiempo de mapa despejado posterior al resultado, independiente de las tiradas. */
export function mapReviewDuration(pace = "balanced") {
  return MAP_REVIEW_DURATIONS[pace] || MAP_REVIEW_DURATIONS.balanced;
}
/** Obtiene el tiempo de lectura/animación de una fase para el ritmo elegido. */
export function phaseDuration(phase, pace = "balanced") {
  return (PACES[pace] || PACES.balanced)[phase];
}
/** Clona la partida antes de resolverla: la UI no confirma cambios hasta mostrar el resultado. */
export function prepareTurn(state, regions, rng = Math.random, command = null) {
  const next = structuredClone(state),
    result = battle(next, regions, rng, command);
  return result ? { next, result, phase: 0 } : null;
}
/** Avanza solo la fase visual; no repite el motor ni modifica el estado ya calculado. */
export function advanceTurn(turn) {
  return { ...turn, phase: Math.min(5, turn.phase + 1) };
}
