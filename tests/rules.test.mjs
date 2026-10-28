import assert from "node:assert/strict";
import { regions, factions } from "../dist/data.js";
import {
  initial,
  battle,
  active,
  restore,
  multiplier,
} from "../dist/engine.mjs";
import { legalActions } from "../dist/decisions.mjs";
import { phaseDuration } from "../dist/playback.mjs";
const R = Object.fromEntries(regions.map((r) => [r.id, r]));
const rng = (seed) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const scheduled = (s, id) => {
  s.initiative = {
    number: 1,
    order: [id, ...active(s).filter((x) => x !== id)],
    pending: [id, ...active(s).filter((x) => x !== id)],
    acted: [],
    excluded: [],
  };
  return s;
};
assert.equal(regions.length, 52);
assert.equal(factions.length, 19);
let s = initial(regions, () => 0.5);
assert.equal(regions.filter((r) => s.owners[r.id] === "11").length, 2);
assert.equal(regions.filter((r) => s.owners[r.id] === "07").length, 9);
assert.equal(s.capitals["11"], "p06");
assert.equal(s.capitals["09"], "p08");
assert.equal(s.capitals["08"], "p45");
for (const r of regions) {
  assert.ok(r.pop > 0);
  assert.ok(r.neighbors.length);
  for (const n of r.neighbors) assert.ok(R[n].neighbors.includes(r.id));
}
assert.ok(R.p10.landNeighbors.includes("p37"));
assert.ok(legalActions(s, regions, "11").some((a) => a.target === "p37"));
assert.ok(R.p35.maritimeNeighbors.includes("p15"));
assert.ok(R.p35.maritimeNeighbors.includes("p51"));
assert.ok(R.p30.maritimeNeighbors.includes("p07"));
assert.ok(R.p30.maritimeNeighbors.includes("p51"));
assert.ok(!R.p20.maritimeNeighbors.includes("p08"));
assert.ok(!R.p35.neighbors.includes("p28"));
assert.ok(!R.p07.neighbors.includes("p28"));
assert.ok(
  !legalActions(s, regions, "02").some((a) =>
    a.objectives.includes("liberate"),
  ),
);
// Liberation can recreate Catalonia from Tarragona, without Barcelona or the other provinces.
for (const r of regions) if (r.community === "09") s.owners[r.id] = "10";
scheduled(s, "02");
const values = [0.5, 0.99, 0.99, 0.99, 0, 0, 0, 0.8, 0.5];
let pos = 0;
const h = battle(s, regions, () => values[pos++] ?? 0.99, {
  attacker: "02",
  defender: "10",
  source: "p44",
  target: "p43",
  objectiveType: "liberate",
});
assert.ok(h.conquered);
assert.equal(h.changes[0].to, "09");
assert.ok(
  h.changes
    .filter((c) => c.to === "09")
    .every((c) => R[c.territory].community === "09"),
);
assert.ok(h.revivedFactions.includes("09"));
assert.equal(s.owners.p08, "10");
assert.ok(h.excludedPopulation > 0);
assert.ok(s.capitals["09"] && s.owners[s.capitals["09"]] === "09");
// Losing an actual capital relocates it to a province that is still owned.
s = scheduled(
  initial(regions, () => 0.5),
  "08",
);
pos = 0;
const forced = [0.5, 0.99, 0.99, 0.99, 0, 0, 0, 0.8, 0.4];
const capitalBattle = battle(s, regions, () => forced[pos++] ?? 0.8, {
  attacker: "08",
  defender: "11",
  source: "p13",
  target: "p06",
  objectiveType: "annex",
});
assert.ok(capitalBattle.conquered);
if (active(s).includes("11")) {
  assert.notEqual(s.capitals["11"], "p06");
  assert.equal(s.owners[s.capitals["11"]], "11");
}
const saved = initial(regions),
  loaded = restore(saved, regions);
assert.deepEqual(loaded.owners, saved.owners);
assert.equal(multiplier(1e9, 1), 1.85);
const migrated = restore(
  {
    version: 2,
    owners: Object.fromEntries(factions.map((f) => [f.id, f.id])),
    populations: Object.fromEntries(factions.map((f) => [f.id, f.pop])),
    history: [],
    turn: 0,
    wins: {},
  },
  regions,
);
assert.equal(Object.keys(migrated.owners).length, 52);
assert.equal(migrated.owners.p37, "07");
for (const p of ["cinema", "balanced", "fast"]) {
  assert.ok(phaseDuration(5, p) >= 2900);
  assert.ok(phaseDuration(1, p) >= 580);
}

console.log("Reglas provinciales: comprobación correcta.");
