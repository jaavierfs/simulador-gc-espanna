/** Recorta los países neutrales y proyecta sus coordenadas al tablero.
 * No crea provincias conquistables ni modifica las acciones legales. */
import fs from "node:fs";
import clipping from "../dist/vendor/polygon-clipping.mjs";
const countries = JSON.parse(
    fs.readFileSync(".cache/countries.geojson", "utf8"),
  ),
  result = [];
for (const [iso, name, bounds, label, rotate] of [
  ["PT", "Portugal", [-10, 36.8, -6, 42.3], [-8, 39.6], -90],
  ["FR", "Francia", [-2.5, 42, 5.5, 45], [1.5, 44.65], 0],
  ["MA", "Marruecos", [-6.5, 34.7, -1.5, 36.05], [-4.15, 35.15], 0],
]) {
  const f = countries.features.find(
      (f) => f.properties["ISO3166-1-Alpha-2"] === iso,
    ),
    g =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates]
        : f.geometry.coordinates;
  const [x0, y0, x1, y1] = bounds,
    clipped = clipping.intersection(g, [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
    ]);
  const project = (c) =>
    [(c[0] + 9.5) * 59, (44 - c[1]) * 80].map((x) => +x.toFixed(2));
  result.push({
    name,
    label: project(label),
    rotate,
    path: clipped
      .map((p) =>
        p
          .map((r) => "M" + r.map((c) => project(c).join(",")).join("L") + "Z")
          .join(""),
      )
      .join(""),
  });
}
fs.writeFileSync(
  "dist/map-context.js",
  "export const contextCountries=" + JSON.stringify(result) + ";",
);
console.log("Portugal, Francia y Marruecos preparados");
