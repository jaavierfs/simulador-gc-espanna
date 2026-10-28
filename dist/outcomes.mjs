/**
 * Textos del historial y resultados. Nombra al vencedor y a las comunidades
 * liberadas; no altera el estado ni decide conquistas.
 */
export function outcomeTitle(h, names) {
  const name = (id) => names[id]?.name || id,
    winner = h.conquered ? h.attacker : h.defender;
  if (h.changes?.length > 1)
    return (
      name(winner) +
      (h.conquered ? " rompe el frente" : " contraataca") +
      " · " +
      h.changes.length +
      " provincias"
    );
  if (h.revivedFaction)
    return (
      name(winner) +
      " libera " +
      name(h.revivedFaction) +
      " de " +
      name(h.conquered ? h.defender : h.attacker)
    );
  if (h.outcome === "counterconquest")
    return name(h.defender) + " conquista " + name(h.changedTerritory);
  return h.conquered
    ? name(h.attacker) + " conquista " + name(h.target)
    : name(h.defender) + " resiste";
}
export function outcomeDetail(h, names, fmt) {
  const name = (id) => names[id]?.name || id;
  return (
    (h.changes || [])
      .map((c) =>
        c.type === "liberation" || c.type === "independence"
          ? name(h.conquered ? h.attacker : h.defender) +
            " libera " +
            name(c.to) +
            " en " +
            name(c.territory) +
            " de " +
            name(c.from)
          : name(c.territory) + " pasa a " + name(c.to),
      )
      .concat(
        h.casualties ? ["Castigo: −" + fmt(h.casualties) + " habitantes"] : [],
      )
      .join(". ") || "La frontera se mantiene."
  );
}
