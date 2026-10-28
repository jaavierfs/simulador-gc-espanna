/**
 * Rondas con un movimiento por comunidad. El orden se fija al empezar la ronda;
 * los bandos eliminados salen de la cola y los liberados esperan a la siguiente.
 */
function living(s) {
  return [...new Set(Object.values(s.owners))];
}
/** Ordena de menor a mayor fuerza, mezclando solo grupos pequeños de fuerza parecida. */
export function roundOrder(s, regions, rng = Math.random) {
  const ids = living(s),
    stats = ids.map((id) => ({
      id,
      size: regions.filter((r) => s.owners[r.id] === id).length,
      pop: regions
        .filter((r) => s.owners[r.id] === id)
        .reduce((n, r) => n + (s.populations?.[r.id] ?? r.pop), 0),
    }));
  const maxSize = Math.max(...stats.map((r) => r.size)),
    maxPop = Math.max(...stats.map((r) => r.pop));
  for (const r of stats)
    r.strength = (0.45 * r.size) / maxSize + (0.55 * r.pop) / maxPop;
  stats.sort((a, b) => a.strength - b.strength || a.id.localeCompare(b.id));
  // Shuffle only neighboring, similarly sized contenders; large blocs stay at the end.
  for (let i = 0; i < stats.length; ) {
    let end = i + 1;
    while (
      end < stats.length &&
      end - i < 3 &&
      stats[end].strength - stats[i].strength <= 0.12
    )
      end++;
    for (let j = end - 1; j > i; j--) {
      const k = i + Math.floor(rng() * (j - i + 1));
      [stats[j], stats[k]] = [stats[k], stats[j]];
    }
    i = end;
  }
  return stats.map((r) => r.id);
}
/** Devuelve la próxima acción y una copia de la cola; todavía no muta la partida. */
export function planInitiative(s, regions, rng = Math.random) {
  const alive = new Set(living(s)),
    known = new Set(regions.map((r) => r.community || r.id)),
    prior = s.initiative;
  const valid =
    prior &&
    Number.isInteger(prior.number) &&
    prior.number >= 1 &&
    ["order", "pending", "acted", "excluded"].every(
      (k) => Array.isArray(prior[k]) && prior[k].every((id) => known.has(id)),
    ) &&
    new Set(prior.order).size === prior.order.length &&
    new Set(prior.acted).size === prior.acted.length;
  let round = valid ? structuredClone(prior) : null;
  if (round)
    round.pending = [...new Set(round.pending)].filter(
      (id) =>
        round.order.includes(id) &&
        alive.has(id) &&
        !round.acted.includes(id) &&
        !round.excluded.includes(id),
    );
  if (!round || !round.pending.length) {
    const order = roundOrder(s, regions, rng);
    round = {
      number: (round?.number || 0) + 1,
      order,
      pending: [...order],
      acted: [],
      excluded: [],
    };
  }
  const attacker = round.pending.shift();
  round.acted.push(attacker);
  return { attacker, round };
}
/** Retira eliminados para que no puedan actuar si reaparecen durante la misma ronda. */
export function finishInitiative(s, beforeAlive) {
  const alive = new Set(living(s)),
    round = s.initiative;
  if (!round) return;
  for (const id of beforeAlive)
    if (!alive.has(id) && !round.excluded.includes(id)) round.excluded.push(id);
  round.pending = round.pending.filter(
    (id) => alive.has(id) && !round.excluded.includes(id),
  );
}
