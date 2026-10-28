/**
 * Zonas y curvas visuales de las rutas marítimas. La legalidad está guardada
 * en data.js; si se cambian las zonas, actualizar también generate-provinces.mjs.
 */
export const SEA_ZONES = {
  north: ["p15", "p27", "p36", "p33", "p39", "p48", "p20"],
  mediterranean: ["p30", "p03", "p46", "p12", "p43", "p08", "p17", "p07"],
  south: ["p30", "p04", "p18", "p29", "p11", "p21", "p51", "p52"],
};
export const CANARY_CONNECTIONS = [
  "p21",
  "p11",
  "p29",
  "p18",
  "p04",
  "p51",
  "p52",
  "p15",
  "p27",
  "p36",
];
function rounded(points) {
  let d = "M" + points[0].join(",");
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      n = points[i + 1];
    d +=
      " Q" +
      p.join(",") +
      " " +
      [(p[0] + n[0]) / 2, (p[1] + n[1]) / 2].join(",");
  }
  return d + " L" + points.at(-1).join(",");
}
export function seaRoute(source, target, byId) {
  const s = byId[source].center,
    e = byId[target].center,
    canary = (id) => id === "p35" || id === "p38";
  if (canary(source) || canary(target)) {
    if (canary(source) && canary(target))
      return rounded([s, [(s[0] + e[0]) / 2, Math.min(s[1], e[1]) - 18], e]);
    const other = canary(source) ? target : source;
    if (["p15", "p27", "p36"].includes(other))
      return rounded([s, [-95, s[1]], [-95, e[1]], e]);
    return rounded([s, [s[0], 690], [e[0], 690], e]);
  }
  if (SEA_ZONES.north.includes(source) && SEA_ZONES.north.includes(target))
    return rounded([s, [s[0], -58], [e[0], -58], e]);
  if (
    SEA_ZONES.mediterranean.includes(source) &&
    SEA_ZONES.mediterranean.includes(target)
  )
    return rounded([
      s,
      [s[0] + 85, s[1] + 35],
      [Math.max(s[0], e[0]) + 90, (s[1] + e[1]) / 2],
      [e[0] + 70, e[1] + 35],
      e,
    ]);
  return rounded([
    s,
    [s[0], Math.max(s[1], e[1]) + 50],
    [e[0], Math.max(s[1], e[1]) + 50],
    e,
  ]);
}
