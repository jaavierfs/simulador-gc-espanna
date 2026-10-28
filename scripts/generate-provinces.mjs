/** Genera provincias, poblaciones y fronteras. Ejecutar mediante npm run maps:rebuild.
 * Los códigos son los del INE. Se excluyen contactos solo en un punto.
 * Las zonas marítimas se aplican a provincias costeras reales, no a todo el bando. */
import fs from "node:fs";
import polylabel from "../dist/vendor/polylabel.js";
const dir = "dist/",
  old = { regions: JSON.parse(fs.readFileSync("data/factions.json", "utf8")) };
const groups = {
  "01": ["04", "11", "14", "18", "21", "23", "29", "41"],
  "02": ["22", "44", "50"],
  "03": ["33"],
  "04": ["07"],
  "05": ["35", "38"],
  "06": ["39"],
  "07": ["05", "09", "24", "34", "37", "40", "42", "47", "49"],
  "08": ["02", "13", "16", "19", "45"],
  "09": ["08", "17", "25", "43"],
  10: ["03", "12", "46"],
  11: ["06", "10"],
  12: ["15", "27", "32", "36"],
  13: ["28"],
  14: ["30"],
  15: ["31"],
  16: ["01", "20", "48"],
  17: ["26"],
  18: ["51"],
  19: ["52"],
};
const capital = {
  "01": ["41"],
  "02": ["50"],
  "03": ["33"],
  "04": ["07"],
  "05": ["35", "38"],
  "06": ["39"],
  "07": ["47"],
  "08": ["45"],
  "09": ["08"],
  10: ["46"],
  11: ["06"],
  12: ["15"],
  13: ["28"],
  14: ["30"],
  15: ["31"],
  16: ["01"],
  17: ["26"],
  18: ["51"],
  19: ["52"],
};
// INE province code order. Official Padrón 1 January 2025, BOE-A-2025-25362.
const pops = [
  342161, 390406, 2030037, 773577, 159887, 663886, 1237480, 5983325, 361556,
  387752, 1257041, 627173, 494407, 772153, 1135612, 198216, 832026, 942618,
  285390, 733365, 535703, 230624, 617604, 446771, 456106, 327286, 325759,
  7137031, 1791092, 1589138, 683500, 305573, 1013529, 158687, 1167555, 946225,
  328779, 1082421, 593964, 158470, 1976624, 90234, 874808, 136197, 750815,
  2758633, 528841, 1166816, 165275, 991991, 83595, 86780,
];
const names = {
  "01": "Álava",
  "03": "Alicante",
  "07": "Illes Balears",
  12: "Castellón",
  15: "A Coruña",
  26: "La Rioja",
  35: "Las Palmas",
  38: "Santa Cruz de Tenerife",
  46: "Valencia",
};
const features = JSON.parse(
  fs.readFileSync(".cache/provinces.geojson"),
).features.filter((f) => Number(f.properties.CodINE) <= 52);
const raw = {},
  geometries = {},
  regions = [],
  factions = old.regions.map((r) => ({
    ...r,
    capitalProvinces: capital[r.id].map((id) => "p" + id),
  }));
const area = (r) =>
  Math.abs(
    r.reduce((n, p, i) => {
      const q = r[(i + 1) % r.length];
      return n + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2,
  );
const xy = (p, canary) =>
  canary
    ? [(p[0] + 18.2) * 49 - 65, (29.6 - p[1]) * 49 + 724]
    : [(p[0] + 9.5) * 59, (44 - p[1]) * 80];
for (const f of features) {
  const code = f.properties.CodINE,
    id = "p" + code,
    community = Object.keys(groups).find((k) => groups[k].includes(code));
  let polygons =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates]
      : f.geometry.coordinates;
  // Keep real inhabited islands, discard tiny offshore rocks that hinder rendering.
  polygons = polygons.filter(
    (p) => area(p[0]) > 0.00012 || polygons.length === 1,
  );
  raw[id] = polygons;
  let projected = polygons.map((p) =>
    p.map((r) =>
      r.map((c) => xy(c, community === "05").map((v) => +v.toFixed(2))),
    ),
  );
  if (code === "51" || code === "52") {
    const center = polylabel(projected[0], 0.01),
      scale = 2.4;
    projected = projected.map((p) =>
      p.map((r) =>
        r.map((c) =>
          c.map((v, i) => +(center[i] + (v - center[i]) * scale).toFixed(2)),
        ),
      ),
    );
  }
  geometries[id] = projected;
  const anchor = projected
    .map((p) => polylabel(p, 0.2))
    .reduce((a, b) => (a.distance > b.distance ? a : b));
  regions.push({
    id,
    code,
    name: names[code] || f.properties.NAMEUNIT,
    community,
    pop: pops[Number(code) - 1],
    center: anchor.slice(0, 2),
    path: projected
      .map((p) =>
        p.map((r) => "M" + r.map((c) => c.join(",")).join("L") + "Z").join(""),
      )
      .join(""),
    landNeighbors: [],
    maritimeNeighbors: [],
    neighbors: [],
    maritimeZones: [],
  });
}
// Shared boundary length, with tolerance for cartographic simplification. Point contacts do not count.
const segments = (p) =>
  p.flatMap((poly) => poly.flatMap((r) => r.slice(1).map((q, i) => [r[i], q])));
const distance = (p, a, b) => {
  const x = b[0] - a[0],
    y = b[1] - a[1],
    t = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - a[0]) * x + (p[1] - a[1]) * y) / (x * x + y * y || 1),
      ),
    );
  return Math.hypot(p[0] - a[0] - t * x, p[1] - a[1] - t * y);
};
const segs = Object.fromEntries(
  regions.map((r) => [r.id, segments(raw[r.id])]),
);
const boxes = Object.fromEntries(
  regions.map((r) => {
    const p = raw[r.id].flat(2);
    return [
      r.id,
      [
        Math.min(...p.map((c) => c[0])),
        Math.min(...p.map((c) => c[1])),
        Math.max(...p.map((c) => c[0])),
        Math.max(...p.map((c) => c[1])),
      ],
    ];
  }),
);
for (let i = 0; i < regions.length; i++)
  for (let j = i + 1; j < regions.length; j++) {
    const a = regions[i],
      b = regions[j],
      A = boxes[a.id],
      B = boxes[b.id];
    if (
      A[0] > B[2] + 0.008 ||
      B[0] > A[2] + 0.008 ||
      A[1] > B[3] + 0.008 ||
      B[1] > A[3] + 0.008
    )
      continue;
    let shared = 0;
    for (const [p, q] of segs[a.id]) {
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (
        segs[b.id].some(
          ([u, v]) =>
            mid[0] >= Math.min(u[0], v[0]) - 0.006 &&
            mid[0] <= Math.max(u[0], v[0]) + 0.006 &&
            mid[1] >= Math.min(u[1], v[1]) - 0.006 &&
            mid[1] <= Math.max(u[1], v[1]) + 0.006 &&
            distance(mid, u, v) < 0.004,
        )
      ) {
        shared += Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (shared > 0.035) break;
      }
    }
    if (shared > 0.035) {
      a.landNeighbors.push(b.id);
      b.landNeighbors.push(a.id);
    }
  }
const zones = {
  north: ["15", "27", "36", "33", "39", "48", "20"],
  mediterranean: ["30", "03", "46", "12", "43", "08", "17", "07"],
  south: ["30", "04", "18", "29", "11", "21", "51", "52"],
};
const connect = (a, b) => {
  if (a === b) return;
  const A = regions.find((r) => r.code === a),
    B = regions.find((r) => r.code === b);
  if (!A.maritimeNeighbors.includes(B.id)) A.maritimeNeighbors.push(B.id);
  if (!B.maritimeNeighbors.includes(A.id)) B.maritimeNeighbors.push(A.id);
};
for (const [name, ids] of Object.entries(zones))
  for (const a of ids) {
    regions.find((r) => r.code === a).maritimeZones.push(name);
    for (const b of ids) connect(a, b);
  }
connect("35", "38");
for (const a of ["35", "38"])
  for (const b of ["21", "11", "29", "18", "04", "51", "52", "15", "27", "36"])
    connect(a, b);
for (const r of regions)
  r.neighbors = [
    ...new Set([...r.landNeighbors, ...r.maritimeNeighbors]),
  ].sort();
for (const f of factions) {
  const held = regions.filter((r) => r.community === f.id);
  f.pop = held.reduce((n, r) => n + r.pop, 0);
  f.center = held.find((r) => f.capitalProvinces.includes(r.id)).center;
  delete f.path;
  delete f.neighbors;
  delete f.landNeighbors;
  delete f.maritimeNeighbors;
  delete f.maritimeZones;
}
fs.writeFileSync(
  dir + "data.js",
  "export const factions=" +
    JSON.stringify(factions) +
    ";\nexport const regions=" +
    JSON.stringify(regions) +
    ";\n",
);
fs.writeFileSync(
  dir + "geometry.js",
  "export const geometries=" + JSON.stringify(geometries) + ";\n",
);
console.log(
  regions
    .map(
      (r) =>
        r.name +
        ": " +
        r.landNeighbors
          .map((id) => regions.find((p) => p.id === id).name)
          .join(", "),
    )
    .join("\n"),
);
console.log(
  regions.length + " provincias y ciudades / " + factions.length + " bandos",
);
