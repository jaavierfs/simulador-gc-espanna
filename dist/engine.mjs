/**
 * Motor de reglas sin DOM. Las decisiones pueden usar Math.random o un generador
 * inyectado para reproducir pruebas. battle() modifica únicamente el estado recibido;
 * la interfaz le entrega una copia mediante prepareTurn().
 */
import { planInitiative, finishInitiative } from "./initiative.mjs?v=github1";
import { chooseDecision } from "./decisions.mjs?v=github1";
import { factions } from "./data.js?v=github1";
export { legalActions } from "./decisions.mjs?v=github1";
export const LOSS_RATE = 0.02,
  CRUSHING_RATIO = 3,
  LIBERATION_CHANCE = 0.025,
  INDEPENDENCE_CHANCE = 0.04,
  CAPITAL_DEFENSE = 1.2;
export { LIBERATION_OBJECTIVE_CHANCE } from "./decisions.mjs?v=github1";
// Ajuste intencionado: Extremadura recibe +5 % al atacar o defender.
const REGIONAL_SPIRIT = { 11: 1.05 };
/** Ventaja suave de población, acotada para que el azar siga permitiendo sorpresas. */
export function multiplier(a, b) {
  return a > b ? Math.min(1.85, Math.pow(a / Math.max(1, b), 0.18)) : 1;
}
/** Ordena tres dados por lado y suma diferencias; el empate concede un punto defensor. */
export function compare(a, d, pa, pd, bonuses = {}) {
  a = [...a].sort((x, y) => y - x);
  d = [...d].sort((x, y) => y - x);
  let ba = 0,
    bd = 0;
  const pairs = a.map((v, i) => {
    const diff = v - d[i];
    if (diff > 0) ba += diff;
    else bd += diff === 0 ? 1 : -diff;
    return {
      a: v,
      d: d[i],
      side: diff > 0 ? "a" : "d",
      points: Math.abs(diff) || 1,
    };
  });
  const ma = multiplier(pa, pd) * (bonuses.attack || 1),
    md = multiplier(pd, pa) * (bonuses.defense || 1),
    sa = ba * ma,
    sd = bd * md;
  return { a, d, ba, bd, ma, md, sa, sd, pairs, conquered: sa > sd + 1e-10 };
}
/** Devuelve los bandos que conservan al menos una provincia. */
export function active(s) {
  return [...new Set(Object.values(s.owners))];
}
/** Suma habitantes actuales, nunca los valores iniciales de provincias ya perdidas. */
export function population(s, regions, id) {
  return regions
    .filter((r) => s.owners[r.id] === id)
    .reduce((n, r) => n + (s.populations?.[r.id] ?? r.pop), 0);
}
/** Combina fuerza local y reservas repartidas; puede excluir una provincia a liberar. */
export function mobilized(s, regions, id, province, exclude = null) {
  const held = regions.filter((r) => s.owners[r.id] === id && r.id !== exclude),
    total = held.reduce((n, r) => n + s.populations[r.id], 0),
    local = province === exclude ? 0 : s.populations[province] || 0;
  return Math.max(
    1,
    0.75 * local + (0.25 * total) / Math.sqrt(Math.max(1, held.length)),
  );
}
/** Conserva cada capital mientras se posea; si cae, elige otra provincia propia al azar. */
export function syncCapitals(s, regions, rng = Math.random) {
  s.capitals ??= {};
  for (const f of factions) {
    const held = regions
      .filter((r) => s.owners[r.id] === f.id)
      .map((r) => r.id);
    if (!held.length) {
      delete s.capitals[f.id];
      continue;
    }
    if (!held.includes(s.capitals[f.id]))
      s.capitals[f.id] = held[Math.floor(rng() * held.length)];
  }
}
/** Crea el reparto provincial real y una capital válida para cada comunidad. */
export function initial(regions, rng = Math.random) {
  const s = {
    version: 3,
    owners: Object.fromEntries(regions.map((r) => [r.id, r.community])),
    populations: Object.fromEntries(regions.map((r) => [r.id, r.pop])),
    capitals: {},
    turn: 0,
    wins: {},
    history: [],
    totalCasualties: 0,
  };
  for (const f of factions)
    s.capitals[f.id] =
      f.capitalProvinces[Math.floor(rng() * f.capitalProvinces.length)];
  return s;
}
/** Valida guardados provinciales y adapta partidas anteriores sin reinterpretar sus dueños. */
export function restore(saved, regions) {
  if (
    !saved?.owners ||
    !Array.isArray(saved.history) ||
    !saved.wins ||
    !Number.isInteger(saved.turn) ||
    saved.turn < 0
  )
    return null;
  const factionIds = new Set(factions.map((f) => f.id));
  if (Object.values(saved.owners).some((id) => !factionIds.has(id)))
    return null;
  if (saved.version !== 3) {
    const s = initial(regions);
    for (const f of factions) {
      const held = regions.filter((r) => r.community === f.id),
        oldPop = Number(saved.populations?.[f.id]),
        total = held.reduce((n, r) => n + r.pop, 0),
        oldTotal = Number(saved.version === 2 ? oldPop : total),
        ratio = Number.isFinite(oldTotal) ? Math.min(1, oldTotal / total) : 1;
      for (const r of held) {
        s.owners[r.id] = saved.owners[f.id] || f.id;
        s.populations[r.id] = Math.max(1, Math.floor(r.pop * ratio));
      }
    }
    s.turn = saved.turn;
    s.wins = { ...saved.wins };
    s.legacyHistory = saved.history;
    s.totalCasualties = regions.reduce(
      (n, r) => n + r.pop - s.populations[r.id],
      0,
    );
    s.migrated = true;
    syncCapitals(s, regions);
    return s;
  }
  if (
    Object.keys(saved.owners).length !== regions.length ||
    !regions.every(
      (r) =>
        Object.hasOwn(saved.owners, r.id) &&
        Number.isInteger(saved.populations?.[r.id]) &&
        saved.populations[r.id] >= 1 &&
        saved.populations[r.id] <= r.pop,
    )
  )
    return null;
  const s = structuredClone(saved);
  syncCapitals(s, regions);
  return s;
}
/** Encuentra bandos rivales alcanzables desde posesiones actuales. */
export function neighbors(s, regions, id) {
  return [
    ...new Set(
      regions
        .filter((r) => s.owners[r.id] === id)
        .flatMap((r) => r.neighbors.map((n) => s.owners[n])),
    ),
  ].filter((x) => x !== id);
}
/** Lista provincias enemigas conectadas a territorios que posee el vencedor. */
export function frontier(s, regions, attacker, defender) {
  return regions.filter(
    (r) =>
      s.owners[r.id] === defender &&
      r.neighbors.some((n) => s.owners[n] === attacker),
  );
}
/** Una defensa aplastante exige triple puntuación y un mínimo de tres puntos. */
export function crushingDefeat(a, d) {
  return d > a && d >= Math.max(3, a * CRUSHING_RATIO);
}
/** Convierte la diferencia de puntuación en un límite de 1–4 cambios territoriales. */
export function territoryQuota(winnerScore, loserScore, winnerSize, loserSize) {
  const ratio = winnerScore / Math.max(1, loserScore);
  return Math.min(
    loserSize,
    ratio >= 3 ? 4 : ratio >= 2 ? 3 : ratio >= 1.4 ? 2 : 1,
  );
}
/** Reparte bajas enteras proporcionalmente y conserva al menos un habitante por provincia. */
export function penalize(s, regions, id, rate = LOSS_RATE) {
  const held = regions.filter((r) => s.owners[r.id] === id),
    total = population(s, regions, id),
    target = Math.min(Math.floor(total * rate), total - held.length),
    allocation = held.map((r) => {
      const exact = (target * s.populations[r.id]) / total;
      return {
        id: r.id,
        loss: Math.min(s.populations[r.id] - 1, Math.floor(exact)),
        fraction: exact % 1,
      };
    });
  let left = target - allocation.reduce((n, r) => n + r.loss, 0);
  allocation.sort(
    (a, b) => b.fraction - a.fraction || a.id.localeCompare(b.id),
  );
  while (left > 0)
    for (const r of allocation)
      if (left && r.loss < s.populations[r.id] - 1) {
        r.loss++;
        left--;
      }
  for (const r of allocation) s.populations[r.id] -= r.loss;
  s.totalCasualties += target;
  return target;
}
/** Resuelve un movimiento: objetivo, dados, bajas, conquistas, capitales y cola de ronda. */
export function battle(s, regions, rng = Math.random, command = null) {
  const alive = active(s);
  if (alive.length < 2) return null;
  const pick = (a) => a[Math.floor(rng() * a.length)],
    initiative = planInitiative(s, regions, rng),
    attacker = initiative.attacker,
    decision = chooseDecision(s, regions, attacker, rng, command);
  syncCapitals(s, regions, rng);
  const defender = decision.defender,
    target = regions.find((r) => r.id === decision.target),
    source = regions.find((r) => r.id === decision.source),
    pa = population(s, regions, attacker),
    pdTotal = population(s, regions, defender),
    objective = {
      type: decision.objectiveType,
      territory: target.id,
      community: target.community,
      owner: defender,
    },
    excludedPopulation =
      objective.type === "liberate" ? s.populations[target.id] : 0,
    pd = pdTotal - excludedPopulation;
  const forceA = mobilized(s, regions, attacker, source.id),
    forceD = mobilized(
      s,
      regions,
      defender,
      target.id,
      objective.type === "liberate" ? target.id : null,
    ),
    ratio = Math.max(forceA, forceD) / Math.min(forceA, forceD),
    dice = () =>
      Array.from({ length: 3 }, () => 1 + Math.floor(rng() * 6)).sort(
        (a, b) => b - a,
      ),
    poolA = dice(),
    poolD = dice(),
    capitalDefenseBonus =
      s.capitals[defender] === target.id ? CAPITAL_DEFENSE : 1,
    tacticalRoll = rng(),
    tacticalSide =
      tacticalRoll < 0.2 ? "attack" : tacticalRoll < 0.4 ? "defense" : null,
    tacticalBonus = tacticalSide ? 1.3 : 1;
  s.initiative = initiative.round;
  const result = {
    attacker,
    defender,
    source: source.id,
    target: target.id,
    frontType: decision.frontType,
    objective,
    pa,
    pd,
    pdTotal,
    forceA,
    forceD,
    excludedPopulation,
    capitalDefenseBonus,
    tacticalSide,
    tacticalBonus,
    roundNumber: s.initiative.number,
    roundPosition: s.initiative.acted.length,
    roundSize: s.initiative.order.length,
    poolA,
    poolD,
    populationRatio: ratio,
    ...compare(poolA, poolD, forceA, forceD, {
      attack:
        (tacticalSide === "attack" ? tacticalBonus : 1) *
        (REGIONAL_SPIRIT[attacker] || 1),
      defense:
        capitalDefenseBonus *
        (tacticalSide === "defense" ? tacticalBonus : 1) *
        (REGIONAL_SPIRIT[defender] || 1),
    }),
    turn: ++s.turn,
    casualties: 0,
    transferredPopulation: 0,
    outcome: "defense",
    changedTerritory: null,
  };
  // Un gran inferior puede ganar, pero esa sorpresa no provoca una barrida territorial.
  result.upset =
    (ratio >= 8 &&
      ((forceA < forceD && result.conquered) ||
        (forceD < forceA && !result.conquered))) ||
    (Math.max(pa, pd) / Math.max(1, Math.min(pa, pd)) >= 8 &&
      ((pa < pd && result.conquered) || (pd < pa && !result.conquered)));
  if (result.upset) {
    if (result.conquered)
      result.sa = Math.min(result.sa, result.sd * 1.1 + 0.1);
    else result.sd = Math.min(result.sd, result.sa * 1.1 + 0.1);
  }
  const winner = result.conquered ? attacker : defender;
  s.wins[winner] = (s.wins[winner] || 0) + 1;
  const count = (id) => regions.filter((r) => s.owners[r.id] === id).length,
    na = count(attacker),
    nd = count(defender);
  result.changes = [];
  result.revivedFactions = [];
  // Ambos bandos sufren bajas antes de transferir habitantes al nuevo dueño.
  result.combatLossA = penalize(s, regions, attacker, 0.003 + rng() * 0.005);
  result.combatLossD = penalize(s, regions, defender, 0.003 + rng() * 0.005);
  result.crushing = !result.conquered && crushingDefeat(result.sa, result.sd);
  if (!result.conquered) result.casualties = penalize(s, regions, attacker);
  const loser = result.conquered ? defender : attacker,
    first = result.conquered ? target : source,
    requested = result.conquered
      ? result.upset
        ? 1
        : territoryQuota(result.sa, result.sd, na, nd)
      : result.crushing && na > 1
        ? Math.min(
            na - 1,
            result.upset ? 1 : territoryQuota(result.sd, result.sa, nd, na),
          )
        : 0;
  for (let i = 0; i < requested; i++) {
    const ws = result.conquered ? result.sa : result.sd,
      ls = result.conquered ? result.sd : result.sa,
      candidates = frontier(s, regions, winner, loser).filter(
        (r) =>
          (i === 0 && r.id === first.id) ||
          s.capitals[loser] !== r.id ||
          ws > ls * CAPITAL_DEFENSE,
      );
    if (!candidates.length) break;
    const province = i === 0 ? first : pick(candidates),
      origin = province.community,
      canRevive = !active(s).includes(origin) && count(loser) > 1,
      joinLiberation =
        objective.type === "liberate" &&
        result.conquered &&
        origin === objective.community &&
        result.revivedFactions.includes(origin),
      revive =
        result.conquered && i === 0
          ? objective.type === "liberate"
          : joinLiberation ||
            (canRevive &&
              rng() <
                (result.conquered ? LIBERATION_CHANCE : INDEPENDENCE_CHANCE)),
      to = revive ? origin : winner,
      type = result.conquered
        ? revive
          ? "liberation"
          : "conquest"
        : revive
          ? "independence"
          : "counterconquest";
    result.changes.push({
      territory: province.id,
      community: origin,
      from: loser,
      to,
      population: s.populations[province.id],
      type,
    });
    s.owners[province.id] = to;
    if (revive && !result.revivedFactions.includes(origin))
      result.revivedFactions.push(origin);
  }
  if (result.changes.length) {
    const c = result.changes[0];
    Object.assign(result, {
      changedTerritory: c.territory,
      changedTerritories: result.changes.map((c) => c.territory),
      territoryFrom: c.from,
      territoryTo: c.to,
      transferredPopulation: result.changes.reduce(
        (n, c) => n + c.population,
        0,
      ),
      outcome:
        new Set(result.changes.map((c) => c.type)).size > 1 ? "mixed" : c.type,
      eliminated: !active(s).includes(loser),
    });
    if (result.revivedFactions.length)
      result.revivedFaction = result.revivedFactions[0];
  }
  syncCapitals(s, regions, rng);
  finishInitiative(s, alive);
  result.roundComplete = !s.initiative.pending.length;
  result.roundStats = active(s)
    .map((id) => ({
      id,
      provinces: count(id),
      population: population(s, regions, id),
      wins: s.wins[id] || 0,
    }))
    .sort((a, b) => b.provinces - a.provinces || b.population - a.population);
  if (active(s).length === 1) result.winner = winner;
  s.history.unshift(result);
  return result;
}
