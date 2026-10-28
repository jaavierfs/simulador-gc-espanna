/**
 * Servidor de desarrollo sin dependencias. GitHub Pages no necesita este archivo:
 * allí GitHub sirve directamente dist/. No abrir index.html con file://, porque
 * los navegadores restringen la carga de módulos JavaScript desde archivos locales.
 */
import http from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const options = Object.fromEntries(
  process.argv.slice(2).map((s) => s.replace(/^--/, "").split("=")),
);
const host = options.host || "127.0.0.1",
  port = Number(options.port || 4173);
const root = await realpath(
  fileURLToPath(new URL("../dist/", import.meta.url)),
);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost"),
      relative = decodeURIComponent(url.pathname).replace(/^\/+/, ""),
      candidate = path.resolve(root, relative || "index.html");
    // También se comprueba realpath para impedir salidas de dist/ a través de enlaces.
    const target = await realpath(candidate);
    if (target !== root && !target.startsWith(root + path.sep)) {
      res.writeHead(403).end("Acceso no permitido");
      return;
    }
    const info = await stat(target);
    if (!info.isFile()) {
      res.writeHead(404).end("Archivo no encontrado");
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404).end("Archivo no encontrado");
  }
});
server.on("error", (error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(
    `Juego disponible en http://${host === "0.0.0.0" ? "localhost" : host}:${port}/`,
  );
  if (host === "0.0.0.0")
    console.log(
      "Para el móvil, usa la IP local de este ordenador y el mismo puerto.",
    );
  console.log("Pulsa Ctrl+C para cerrar.");
});
