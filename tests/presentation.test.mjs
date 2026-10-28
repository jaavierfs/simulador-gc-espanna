import assert from "node:assert/strict";
import { changeRowHTML } from "../dist/presentation.mjs";
import { mapReviewDuration, phaseDuration } from "../dist/playback.mjs";

// Barcelona es de origen catalán, pero en esta guerra se quita a Madrid.
// La bandera anterior debe venir de change.from, nunca de la provincia original.
const names = {
  p08: { name: "Barcelona", community: "09" },
  "09": { name: "Cataluña" },
  13: { name: "Madrid" },
  11: { name: "Extremadura" },
};
const flag = (id) => "flags/" + id + ".svg";
const row = changeRowHTML(
  { territory: "p08", from: "13", to: "11", type: "conquest" },
  names,
  flag,
);
assert.ok(row.includes('src="flags/13.svg"'));
assert.ok(row.includes('src="flags/11.svg"'));
assert.ok(!row.includes("flags/09.svg"));
assert.ok(row.indexOf("flags/13.svg") < row.indexOf("Barcelona"));
assert.ok(row.indexOf("Barcelona") < row.indexOf("flags/11.svg"));
const liberated = changeRowHTML(
  { territory: "p08", from: "13", to: "09", type: "liberation" },
  names,
  flag,
);
assert.ok(liberated.includes("Cataluña libre"));
assert.ok(liberated.includes("Ahora: Cataluña"));
for (const pace of ["cinema", "balanced", "fast"]) {
  assert.ok(mapReviewDuration(pace) >= 2000);
  assert.ok(phaseDuration(5, pace) >= 2900);
}
console.log(
  "Presentación: banderas de origen/destino y pausa de mapa correctas.",
);
