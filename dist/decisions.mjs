/**
 * Acciones legales y selección de la IA. Las conexiones dependen de provincias
 * realmente poseídas, no del nombre del bando. Una futura interfaz humana puede
 * enviar los mismos comandos sin saltarse fronteras, objetivos ni turnos.
 */
export const LIBERATION_OBJECTIVE_CHANCE = 0.02;
/** Enumera combinaciones origen/destino válidas y los motivos permitidos. */
export function legalActions(s, regions, attacker) {
  const alive = new Set(Object.values(s.owners)),
    owned = regions.filter((r) => s.owners[r.id] === attacker),
    result = [];
  for (const target of regions) {
    const defender = s.owners[target.id];
    if (defender === attacker) continue;
    const canLiberate =
      !alive.has(target.community) &&
      regions.some((r) => s.owners[r.id] === defender && r.id !== target.id);
    for (const source of owned)
      if (target.neighbors.includes(source.id))
        result.push({
          attacker,
          defender,
          target: target.id,
          source: source.id,
          frontType: source.landNeighbors.includes(target.id) ? "land" : "sea",
          objectives: canLiberate ? ["annex", "liberate"] : ["annex"],
        });
  }
  return result;
}
/** Valida un comando humano o elige una acción ponderada de la IA. */
export function chooseDecision(
  s,
  regions,
  attacker,
  rng = Math.random,
  command = null,
) {
  if (command?.attacker && command.attacker !== attacker)
    throw Error("Este bando no tiene el turno");
  let options = legalActions(s, regions, attacker);
  for (const key of ["defender", "target", "source"])
    if (command?.[key] !== undefined)
      options = options.filter((a) => a[key] === command[key]);
  if (!options.length) throw Error("Movimiento sin frontera válida");
  const pop = (id) =>
      regions
        .filter((r) => s.owners[r.id] === id)
        .reduce((n, r) => n + s.populations[r.id], 0),
    force = (id, province) =>
      0.75 * s.populations[province] +
      (0.25 * pop(id)) /
        Math.sqrt(regions.filter((r) => s.owners[r.id] === id).length),
    weights = options.map(
      (a) =>
        Math.max(
          0.08,
          Math.min(
            3,
            Math.pow(
              force(attacker, a.source) /
                Math.max(1, force(a.defender, a.target)),
              0.65,
            ),
          ),
        ) / (s.capitals?.[a.defender] === a.target ? 1.15 : 1),
    ),
    total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total,
    selected = options.at(-1);
  for (let i = 0; i < options.length; i++) {
    roll -= weights[i];
    if (roll < 0) {
      selected = options[i];
      break;
    }
  }
  const objectiveType =
    command?.objectiveType ??
    (selected.objectives.includes("liberate") &&
    rng() < LIBERATION_OBJECTIVE_CHANCE
      ? "liberate"
      : "annex");
  if (!selected.objectives.includes(objectiveType))
    throw Error("No se puede liberar una comunidad que ya existe");
  return { ...selected, objectiveType };
}
