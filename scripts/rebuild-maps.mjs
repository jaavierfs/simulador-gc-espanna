/**
 * Reconstrucción opcional de datos, no forma parte del arranque ni de la publicación.
 * Guarda las descargas en una caché local ignorada por Git. No altera las banderas.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
await mkdir(".cache", { recursive: true });
const sources = [
  [
    ".cache/provinces.geojson",
    "https://mapas.fomento.gob.es/arcgis/rest/services/SIU/ENTIDADES_TERRITORIALES_EGRN/MapServer/2/query?where=1%3D1&outFields=*&outSR=4326&maxAllowableOffset=0.003&f=geojson",
  ],
  [
    ".cache/countries.geojson",
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
  ],
];
for (const [file, url] of sources) {
  let cached = false;
  if (!process.argv.includes("--refresh"))
    try {
      JSON.parse(await readFile(file, "utf8"));
      cached = true;
    } catch {}
  if (cached) {
    console.log("Se reutiliza " + file);
    continue;
  }
  console.log("Descargando " + file);
  const response = await fetch(url);
  if (!response.ok)
    throw Error("Descarga fallida: " + response.status + " " + url);
  const content = await response.text();
  const parsed = JSON.parse(content);
  if (parsed.type !== "FeatureCollection")
    throw Error("La fuente no devuelve una colección geográfica válida");
  await writeFile(file, content);
}
await import("./generate-provinces.mjs");
await import("./generate-context.mjs");
console.log("Mapas regenerados. Ejecuta npm test antes de publicarlos.");
