/**
 * Geometría visible por bando: une provincias y busca una posición interior
 * para el nombre. La caché LRU está limitada para no acumular mapas en el móvil.
 */
import clipping from "./vendor/polygon-clipping.mjs";
import polylabel from "./vendor/polylabel.js";
import { geometries } from "./geometry.js?v=github1";
const cache = new Map();
/** Calcula área con agujeros para elegir y dimensionar territorios visibles. */
export function polygonArea(polygon) {
  return polygon.reduce((total, ring, i) => {
    let a = 0;
    for (let j = 0, k = ring.length - 1; j < ring.length; k = j++)
      a += ring[k][0] * ring[j][1] - ring[j][0] * ring[k][1];
    return total + (i ? -1 : 1) * Math.abs(a / 2);
  }, 0);
}
/** Une provincias, limpia únicamente huecos subpíxel y limita la memoria de la caché. */
export function territoryGeometry(ids) {
  const key = [...ids].sort().join(",");
  if (cache.has(key)) {
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    if (cache.size > 64) cache.delete(cache.keys().next().value);
    return value;
  }
  let polygons = clipping.union(...ids.map((id) => geometries[id]));
  // Discard only sub-pixel simplification slivers; real enclaves remain holes.
  polygons = polygons.map((p) => [
    p[0],
    ...p.slice(1).filter((r) => polygonArea([r]) > 0.03),
  ]);
  const anchor = polygons
    .map((p) => polylabel(p, 0.5))
    .reduce((a, b) => (a.distance > b.distance ? a : b));
  const points = polygons.flat(2),
    xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]),
    minX = Math.min(...xs),
    minY = Math.min(...ys),
    maxX = Math.max(...xs),
    maxY = Math.max(...ys);
  const value = {
    polygons,
    anchor,
    area: polygons.reduce((n, p) => n + polygonArea(p), 0),
    box: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    path: polygons
      .map((p) =>
        p.map((r) => "M" + r.map((c) => c.join(",")).join("L") + "Z").join(""),
      )
      .join(""),
  };
  cache.set(key, value);
  if (cache.size > 64) cache.delete(cache.keys().next().value);
  return value;
}
/** Agrupa las provincias según el dueño actual y devuelve una geometría por bando. */
export function factionTerritories(owners, regions) {
  return [...new Set(Object.values(owners))].map((id) => {
    const members = regions.filter((r) => owners[r.id] === id).map((r) => r.id);
    return { id, members, ...territoryGeometry(members) };
  });
}
