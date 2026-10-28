/**
 * Controlador de la web: conecta estado, mapa, ventanas y botones.
 * El motor decide la guerra una vez; este archivo solo revela el resultado por fases.
 * IDs p01…p52 = provincias; 01…19 = comunidades. Consulta docs/ARQUITECTURA.md.
 */
import { changeRowHTML } from "./presentation.mjs?v=github1";
import { regions, factions } from "./data.js?v=github1";
import { seaRoute } from "./coasts.mjs?v=github1";
import { contextCountries } from "./map-context.js?v=github1";
import { setupLayout } from "./layout.mjs?v=github1";
import { roundOrder } from "./initiative.mjs?v=github1";
import { camera, animateStage } from "./cinema.mjs?v=github1";
import { setupSound, startSound, soundCue } from "./sound.mjs";
import { factionTerritories } from "./territory-map.mjs?v=github1";
import { outcomeTitle, outcomeDetail } from "./outcomes.mjs?v=github1";
import { initial, active, population, restore } from "./engine.mjs?v=github1";
import {
  prepareTurn,
  advanceTurn,
  PHASES,
  phaseDuration,
  mapReviewDuration,
} from "./playback.mjs?v=github1";
const $ = (id) => document.getElementById(id),
  byId = Object.fromEntries([...factions, ...regions].map((r) => [r.id, r])),
  KEY = "gce-provinces-v3";
const fmt = (n) => new Intl.NumberFormat("es-ES").format(n),
  dec = (n) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
let state = initial(regions),
  current = null,
  automatic = false,
  timer = null,
  focused = false;
try {
  const raw =
      localStorage.getItem(KEY) ||
      localStorage.getItem("choque-peninsular-v2") ||
      localStorage.getItem("choque-peninsular-v1"),
    saved = raw ? JSON.parse(raw) : null,
    loaded = restore(saved, regions);
  if (loaded) state = loaded;
} catch {}
if (!state.initiative) {
  const order = roundOrder(state, regions);
  state.initiative = {
    number: 1,
    order,
    pending: [...order],
    acted: [],
    excluded: [],
  };
}
try {
  const pace = localStorage.getItem("choque-peninsular-pace");
  if (["cinema", "balanced", "fast"].includes(pace)) $("speed").value = pace;
} catch {}
if (state.history[0])
  current = { result: state.history[0], phase: 5, next: null };
const ns = "http://www.w3.org/2000/svg";
const flag = (id) => {
  id = byId[id]?.community || id;
  return (
    "flags/" +
    id +
    (["04", "05", "10", "12", "13", "14", "15", "17", "18", "19"].includes(id)
      ? ".png"
      : ".svg")
  );
};
const shortPop = (n) =>
  n >= 1000000 ? dec(n / 1000000) + " M" : dec(n / 1000) + " mil";
let battleKey = "",
  popupKey = "",
  summaryMode = null;
let mapSignature = "",
  mapFactions = [];
for (const country of contextCountries) {
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", country.path);
  p.setAttribute("class", "foreign-land");
  $("countryContext").append(p);
  const t = document.createElementNS(ns, "text");
  t.textContent = country.name.toUpperCase();
  t.setAttribute("x", country.label[0]);
  t.setAttribute("y", country.label[1]);
  t.setAttribute("class", "foreign-label");
  if (country.rotate)
    t.setAttribute(
      "transform",
      "rotate(" + country.rotate + " " + country.label.join(" ") + ")",
    );
  $("countryContext").append(t);
}
const provinceNodes = new Map();
for (const r of regions) {
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", r.path);
  p.setAttribute("class", "province-outline");
  p.setAttribute("vector-effect", "non-scaling-stroke");
  p.dataset.province = r.id;
  const inspect = () => {
    $("inspector").textContent =
      r.name +
      " · " +
      byId[state.owners[r.id]].name +
      " · " +
      fmt(state.populations[r.id]) +
      " habitantes";
    $("inspector").classList.add("show");
    clearTimeout(inspect.timeout);
    inspect.timeout = setTimeout(
      () => $("inspector").classList.remove("show"),
      2800,
    );
  };
  p.addEventListener("click", inspect);
  $("provinceBorders").append(p);
  provinceNodes.set(r.id, p);
}
/** Describe el motivo anunciado, distinguiendo provincia objetivo y comunidad a liberar. */
function objectiveText(h) {
  const r = byId[h.objective?.territory || h.target];
  return h.objective?.type === "liberate"
    ? "Liberar " + byId[r.community].name + " en " + r.name
    : "Anexionar " + r.name;
}
/** Redibuja solo si han cambiado propietarios; recorta cada bandera a sus polígonos separados. */
function updateTerritories() {
  const signature = regions.map((r) => state.owners[r.id]).join(",");
  if (signature === mapSignature) return;
  mapSignature = signature;
  mapFactions = factionTerritories(state.owners, regions);
  if (
    $("territories").children.length &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    const ghost = $("territories").cloneNode(true);
    ghost.removeAttribute("id");
    for (const node of ghost.querySelectorAll("[id]"))
      node.removeAttribute("id");
    ghost.style.pointerEvents = "none";
    ghost.setAttribute("aria-hidden", "true");
    $("map").insertBefore(ghost, $("territories"));
    ghost
      .animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 900,
        easing: "ease-out",
      })
      .finished.then(() => {
        ghost.remove();
        const used = new Set(
          [...$("map").querySelectorAll(".region")].map((p) => p.style.fill),
        );
        for (const p of $("map").querySelectorAll("[data-territory-flag]"))
          if (
            !used.has('url("#' + p.id + '")') &&
            !used.has("url(#" + p.id + ")")
          )
            p.remove();
      })
      .catch(() => ghost.remove());
  }
  $("territories").replaceChildren();
  $("labels").replaceChildren();
  for (const f of mapFactions) {
    const r = byId[f.id],
      path = document.createElementNS(ns, "g");
    for (const polygon of f.polygons) {
      const part = document.createElementNS(ns, "path");
      part.setAttribute(
        "d",
        polygon
          .map((r) => "M" + r.map((c) => c.join(",")).join("L") + "Z")
          .join(""),
      );
      part.setAttribute("vector-effect", "non-scaling-stroke");
      part.setAttribute("class", "territory-part");
      path.append(part);
    }
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("class", "region");
    path.id = "faction" + f.id;
    const patternId = "territoryFlag" + f.id + "_" + f.members.join("_");
    let pattern = document.getElementById(patternId);
    if (!pattern) {
      pattern = document.createElementNS(ns, "pattern");
      pattern.id = patternId;
      pattern.dataset.territoryFlag = "true";
      pattern.setAttribute("patternUnits", "objectBoundingBox");
      pattern.setAttribute("patternContentUnits", "objectBoundingBox");
      pattern.setAttribute("x", 0);
      pattern.setAttribute("y", 0);
      pattern.setAttribute("width", 1);
      pattern.setAttribute("height", 1);
      const base = document.createElementNS(ns, "rect");
      base.setAttribute("x", 0);
      base.setAttribute("y", 0);
      base.setAttribute("width", 1);
      base.setAttribute("height", 1);
      base.setAttribute("fill", r.color);
      pattern.append(base);
      const image = document.createElementNS(ns, "image");
      image.setAttribute("href", flag(f.id));
      image.setAttribute("x", 0);
      image.setAttribute("y", 0);
      image.setAttribute("width", 1);
      image.setAttribute("height", 1);
      image.setAttribute("preserveAspectRatio", "none");
      pattern.append(image);
      $("map").querySelector("defs").append(pattern);
    }
    path.style.fill = "url(#" + patternId + ")";
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    const inspect = () => {
      $("inspector").textContent =
        `${r.name} · ${f.members.length} ${f.members.length === 1 ? "provincia" : "provincias"} · ${fmt(population(state, regions, f.id))} habitantes`;
    };
    path.addEventListener("click", inspect);
    path.addEventListener("focus", inspect);
    path.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inspect();
      }
    });
    $("territories").append(path);
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", f.anchor[0]);
    t.setAttribute("y", f.anchor[1]);
    t.setAttribute("dominant-baseline", "central");
    t.setAttribute("class", "map-label faction-label");
    t.id = "label" + f.id;
    t.textContent = r.name;
    const words = r.name.split(" "),
      lines =
        r.name.length > 11 && words.length > 1
          ? [
              words.slice(0, Math.ceil(words.length / 2)).join(" "),
              words.slice(Math.ceil(words.length / 2)).join(" "),
            ]
          : [r.name],
      longest = Math.max(...lines.map((l) => l.length));
    const size = Math.max(
      mapFactions.length > 8 ? 12 : 20,
      Math.min(
        42,
        Math.sqrt(f.area) / 9,
        Math.max(28, f.anchor.distance * 3) / (longest * 0.57),
      ),
    );
    t.style.fontSize = size + "px";
    const banner = document.createElementNS(ns, "image");
    banner.setAttribute("href", flag(f.id));
    banner.setAttribute("x", f.anchor[0] - 15);
    banner.setAttribute(
      "y",
      f.anchor[1] - size * (lines.length > 1 ? 1.6 : 1.1) - 16,
    );
    banner.setAttribute("width", 30);
    banner.setAttribute("height", 20);
    banner.setAttribute("class", "map-flag");
    banner.id = "flag" + f.id;
    $("labels").append(banner);
    if (lines.length > 1) {
      t.textContent = "";
      for (let i = 0; i < lines.length; i++) {
        const line = document.createElementNS(ns, "tspan");
        line.setAttribute("x", f.anchor[0]);
        line.setAttribute("dy", i === 0 ? "-0.5em" : "1.1em");
        line.textContent = lines[i];
        t.append(line);
      }
    }
    $("labels").append(t);
  }
}
/** Guarda solo estados confirmados. Un fallo de almacenamiento no detiene la partida. */
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    $("saveStatus").textContent = "Partida guardada";
  } catch {
    $("saveStatus").textContent = "No se pudo guardar";
  }
}
function title(h) {
  return outcomeTitle(h, byId);
}
function detail(h) {
  return outcomeDetail(h, byId, fmt);
}
/** Enfoca el frente durante la guerra y vuelve al mapa general para su revisión. */
function renderMap() {
  updateTerritories();
  const h = current?.result,
    focus = focused && h;
  for (const f of mapFactions) {
    const p = $("faction" + f.id),
      selected =
        h &&
        (f.id === h.attacker ||
          f.id === h.defender ||
          (current.phase === 5 &&
            (h.revivedFactions || [h.revivedFaction]).includes(f.id)));
    p.setAttribute(
      "aria-label",
      `${byId[f.id].name}, ${f.members.length} territorios, ${fmt(population(state, regions, f.id))} habitantes`,
    );
    p.classList.toggle("attacker", !!h && f.id === h.attacker);
    p.classList.toggle("defender", !!h && f.id === h.defender);
    p.classList.toggle(
      "independent",
      current?.phase === 5 &&
        (h?.revivedFactions || [h?.revivedFaction]).includes(f.id),
    );
    p.classList.toggle("dim", !!focus && !selected);
    $("label" + f.id).classList.toggle("dim", !!focus && !selected);
    $("flag" + f.id).classList.toggle("dim", !!focus && !selected);
  }
  if (h) {
    const a = mapFactions.find((f) => f.id === h.attacker),
      d = mapFactions.find((f) => f.id === h.defender),
      end = byId[h.target].center,
      start = byId[h.source].center,
      [x, y] = start,
      [u, v] = end;
    $("attackArrow").setAttribute(
      "d",
      h.frontType === "sea"
        ? seaRoute(h.source, h.target, byId)
        : `M${x},${y} Q${(x + u) / 2 + 30},${(y + v) / 2 - 40} ${u},${v}`,
    );
    $("arrowGlow").setAttribute("d", $("attackArrow").getAttribute("d"));
    $("inspector").textContent =
      byId[h.attacker].name + " → " + byId[h.defender].name;
    $("mapStatus").textContent = current.mapReview
      ? "ASÍ QUEDA EL MAPA"
      : current.phase === 5
        ? h.revivedFaction
          ? "NUEVA COMUNIDAD INDEPENDIENTE"
          : h.outcome === "counterconquest"
            ? "CONTRAATAQUE DEL DEFENSOR"
            : h.conquered
              ? "FRONTERAS ACTUALIZADAS"
              : "LA FRONTERA RESISTE"
        : h.frontType === "sea"
          ? "RUTA MARÍTIMA"
          : "EL TERRITORIO DE AMBOS BANDOS";
  } else {
    $("attackArrow").setAttribute("d", "");
    $("inspector").textContent =
      "Toca un bando para ver todos sus territorios.";
    $("mapStatus").textContent = "ESPAÑA, EN CALMA";
  }
  for (const r of regions) {
    const p = provinceNodes.get(r.id);
    p.classList.toggle(
      "war-target",
      !!h && r.id === h.target && current.phase < 5,
    );
    p.classList.toggle(
      "war-source",
      !!h && r.id === h.source && current.phase < 5,
    );
    p.classList.toggle(
      "taken",
      !!h && current.phase === 5 && (h.changedTerritories || []).includes(r.id),
    );
    p.classList.toggle(
      "muted-border",
      !!focus &&
        state.owners[r.id] !== h.attacker &&
        state.owners[r.id] !== h.defender,
    );
  }
  $("provinceNames").replaceChildren();
  if (h)
    for (const id of [
      ...new Set(
        current.phase === 5
          ? [h.source, ...(h.changedTerritories || [])]
          : [h.source, h.target],
      ),
    ]) {
      const r = byId[id];
      if (!r) continue;
      const t = document.createElementNS(ns, "text");
      t.setAttribute("x", r.center[0]);
      t.setAttribute("y", r.center[1] + 13);
      t.setAttribute("class", "province-name");
      t.textContent = r.name;
      $("provinceNames").append(t);
    }
  let box = [-110, -95, 1010, 970];
  if (focus) {
    const selected = mapFactions.filter(
      (f) =>
        f.id === h.attacker ||
        f.id === h.defender ||
        (current.phase === 5 &&
          (h.revivedFactions || [h.revivedFaction]).includes(f.id)),
    );
    if (selected.length) {
      const bounds =
        current.phase >= 1 && current.phase <= 4
          ? regions
              .filter((r) => r.id === h.source || r.id === h.target)
              .map((r) => {
                const xs = r.center[0],
                  ys = r.center[1];
                return { x: xs - 90, y: ys - 90, width: 180, height: 180 };
              })
          : selected.map((f) => f.box);
      if (h.frontType === "sea") bounds.push($("attackArrow").getBBox());
      const x = Math.min(...bounds.map((b) => b.x)),
        y = Math.min(...bounds.map((b) => b.y)),
        w = Math.max(...bounds.map((b) => b.x + b.width)) - x,
        z = Math.max(...bounds.map((b) => b.y + b.height)) - y,
        pad = 48;
      box = [
        x - pad,
        y - pad,
        Math.max(w + pad * 2, 240),
        Math.max(z + pad * 2, 210),
      ];
    }
  }
  const focusId =
      h &&
      (current.phase === 1
        ? h.attacker
        : current.phase === 5
          ? h.changedTerritory || h.defender
          : h.defender),
    anchor = focusId
      ? mapFactions.find((f) => f.id === focusId)?.anchor ||
        byId[focusId]?.center
      : null;
  camera($("map"), box, current?.phase ?? -1, focus ? anchor : null);
  $("overview").textContent = focused
    ? "Ver España ↗"
    : h
      ? "Ver los bandos ↗"
      : "Vista completa";
  $("overview").disabled = !h;
}
/** Genera los puntos de un dado con CSS, sin imágenes externas. */
function die(v, shown, won) {
  const dots = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return `<span class="die ${!shown ? "hidden" : won ? "won" : "lost"}" aria-label="${shown ? "Dado " + v : "Dado por revelar"}">${Array.from({ length: 9 }, (_, i) => '<i class="' + (shown && dots[v].includes(i) ? "pip" : "") + '"></i>').join("")}</span>`;
}
function brief(h) {
  if (h.changes?.length > 1) {
    const annex = h.changes.filter(
        (c) => c.type === "conquest" || c.type === "counterconquest",
      ).length,
      free = h.changes.length - annex;
    return [
      annex ? "+" + annex + " " + (annex === 1 ? "anexión" : "anexiones") : "",
      free
        ? "+" + free + " " + (free === 1 ? "liberación" : "liberaciones")
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (h.revivedFaction) return "Un nuevo bando entra en juego";
  if (h.casualties) return "−" + shortPop(h.casualties) + " habitantes";
  return h.transferredPopulation
    ? "+" + shortPop(h.transferredPopulation) + " habitantes"
    : "La frontera se mantiene";
}
/** Actualiza el panel compacto sin volver a calcular el combate. */
function renderBattle() {
  const h = current?.result,
    phase = current?.phase ?? -1,
    key = (h?.turn ?? 0) + ":" + phase + ":" + !!current?.mapReview;
  if (key === battleKey) return;
  battleKey = key;
  $("phaseName").textContent = current?.mapReview
    ? "ASÍ QUEDA EL MAPA"
    : h
      ? PHASES[phase].toUpperCase()
      : "CADA FRONTERA CUENTA";
  $("battleNumber").textContent = h
    ? h.roundNumber
      ? "MOV. " + h.roundPosition + "/" + h.roundSize
      : "BATALLA " + String(h.turn).padStart(2, "0")
    : "A TU RITMO";
  $("phaseTrack").innerHTML = PHASES.map(
    (name, i) =>
      `<i class="${i === phase ? "current" : i < phase ? "done" : ""}" title="${name}"></i>`,
  ).join("");
  $("phaseTrack").setAttribute(
    "aria-label",
    h ? `Fase ${phase + 1} de 6: ${PHASES[phase]}` : "Batalla sin empezar",
  );
  $("narrative").className = "narrative";
  if (!h) {
    $("battle").innerHTML =
      '<div class="idle"><span class="idle-symbol">⚄</span><div><h2>España espera.</h2><p>Descubre el frente, compara cada dado y observa cómo cambia el mapa.</p></div></div>';
    $("narrative").innerHTML =
      "<b>Tú marcas el ritmo.</b>Empieza una batalla o activa el modo automático.";
    return;
  }
  const a = byId[h.attacker],
    d = byId[h.defender],
    score = (side) => {
      const base = side === "a" ? h.ba : h.bd,
        m = side === "a" ? h.ma : h.md,
        win = phase === 5 && (side === "a" ? h.conquered : !h.conquered);
      return `<div class="score ${phase < 4 ? "mystery" : ""} ${win ? "winner" : ""}"><strong>${phase >= 4 ? dec(side === "a" ? h.sa : h.sd) : "—"}</strong><small>${phase >= 4 ? "× " + dec(m) : "PUNTOS"}</small></div>`;
    };
  $("battle").innerHTML =
    `<div class="matchup"><div class="faction"><span class="role attacker-role">ATACA</span><img class="faction-flag" src="${flag(a.id)}" alt="Bandera de ${a.name}"><h2>${a.name}</h2><div class="population">${shortPop(h.pa)}<span class="multi">×${dec(h.ma)}</span></div></div><span class="versus">⚔</span><div class="faction"><span class="role defender-role">DEFIENDE</span><img class="faction-flag" src="${flag(d.id)}" alt="Bandera de ${d.name}"><h2>${d.name}</h2><div class="population" title="${h.excludedPopulation ? "Excluye " + fmt(h.excludedPopulation) + " habitantes de la comunidad que se quiere liberar" : "Población defensora"}">${shortPop(h.pd)}<span class="multi">×${dec(h.md)}</span></div></div></div><div class="front-line">${h.objective ? (h.frontType === "sea" ? "POR MAR · " : "OBJETIVO · ") + objectiveText(h) : h.source ? "BANDOS · " + a.name + " → " + d.name : "BATALLA GUARDADA"}</div><div class="dice-table">${h.pairs
      .map((p, i) => {
        const shown = phase > i;
        return `<div class="dice-row ${phase === i + 1 ? "reveal" : ""}"><div>${die(p.a, shown, p.side === "a")}</div><div class="delta ${shown ? "" : "waiting"}">${shown ? (p.side === "a" ? "← " : "") + '<span class="award">+' + p.points + "</span>" + (p.side === "d" ? " →" : "") + (p.a === p.d ? "<small>empate</small>" : "") : "·"}</div><div>${die(p.d, shown, p.side === "d")}</div></div>`;
      })
      .join("")}</div><div class="scores">${score("a")}${score("d")}</div>`;
  let text = "";
  if (phase === 0)
    text =
      "<b>" +
      a.name +
      " avanza</b>" +
      (h.objective ? objectiveText(h) : "El frente está abierto");
  else if (phase < 4) {
    const p = h.pairs[phase - 1];
    text =
      "<b>+" +
      p.points +
      " " +
      (p.side === "a" ? a.name : d.name) +
      "</b>" +
      (p.a === p.d ? "El empate favorece a la defensa" : "");
  } else if (phase === 4)
    text = "<b>Resultado de combate</b>Se resuelve el frente";
  else {
    text = "<b>" + title(h) + "</b>" + brief(h);
    $("narrative").classList.add(
      h.revivedFaction ? "independent" : h.conquered ? "result" : "penalty",
    );
    if (active(state).length === 1)
      text = "<b>" + byId[active(state)[0]].name + " vence</b>España unificada";
  }
  $("narrative").innerHTML = text;
}
/** Prepara estadísticas del menú e historial, sin añadir una clasificación a cada batalla. */
function renderStats() {
  const alive = active(state),
    total = Object.values(state.populations).reduce((n, p) => n + p, 0);
  $("remaining").textContent = alive.length;
  $("turn").textContent = String(
    current?.result.roundNumber || state.initiative?.number || 1,
  ).padStart(2, "0");
  $("people").textContent = fmt(total);
  $("casualties").textContent = fmt(state.totalCasualties);
  $("ranking").innerHTML = alive
    .sort(
      (a, b) =>
        regions.filter((r) => state.owners[r.id] === b).length -
          regions.filter((r) => state.owners[r.id] === a).length ||
        population(state, regions, b) - population(state, regions, a),
    )
    .map((id, i) => {
      const r = byId[id],
        p = population(state, regions, id),
        n = regions.filter((r) => state.owners[r.id] === id).length,
        w = state.wins[id] || 0;
      return `<div class="rank-row"><span class="rank-num">${String(i + 1).padStart(2, "0")}</span><img class="rank-flag" src="${flag(id)}" alt=""><div class="rank-name">${r.name}<small>${n} ${n === 1 ? "provincia" : "provincias"} · ${w} ${w === 1 ? "victoria" : "victorias"}</small></div><div class="rank-pop">${fmt(p)}<small>${dec((p / total) * 100)} % de población</small></div></div>`;
    })
    .join("");
  $("historyCount").textContent = state.turn + " BATALLAS COMPLETADAS";
  $("history").innerHTML = state.history.length
    ? state.history
        .slice(0, 150)
        .map(
          (h) =>
            `<div class="hist-item"><span>${String(h.turn).padStart(2, "0")}</span><div><b>${title(h)}</b><p>${dec(h.sa)} – ${dec(h.sd)} · ${detail(h)}</p></div></div>`,
        )
        .join("")
    : "<p>La historia empieza con la primera batalla.</p>";
}
/** Muestra objetivo, puntuación o resultado; durante la revisión deja el mapa despejado. */
function renderPopup() {
  const h = current?.result,
    p = current?.phase,
    key = (h?.turn || 0) + ":" + p + ":" + !!current?.mapReview,
    popup = $("battlePopup");
  if (key === popupKey) return;
  popupKey = key;
  if (!h || current.mapReview || (p !== 0 && p !== 4 && p !== 5)) {
    popup.classList.remove("visible");
    return;
  }
  const a = byId[h.attacker],
    d = byId[h.defender];
  let content = "";
  if (p === 0) {
    const target = byId[h.objective?.territory || h.target || h.defender],
      verb = h.objective?.type === "liberate" ? "Liberar" : "Anexionar";
    content =
      '<span class="popup-kicker">RONDA ' +
      (h.roundNumber || state.initiative?.number || 1) +
      " · MOVIMIENTO " +
      (h.roundPosition || 1) +
      "/" +
      (h.roundSize || active(state).length) +
      '</span><div class="popup-match"><img src="' +
      flag(a.id) +
      '" alt=""><strong>' +
      a.name +
      "</strong><span>→</span><strong>" +
      d.name +
      '</strong><img src="' +
      flag(d.id) +
      '" alt=""></div><p class="popup-objective"><b>' +
      objectiveText(h) +
      "</b></p>";
  } else if (p === 4) {
    content =
      '<span class="popup-kicker">PUNTUACIÓN FINAL</span><div class="popup-score"><img src="' +
      flag(a.id) +
      '" alt=""><b>' +
      dec(h.sa) +
      "</b><span>—</span><b>" +
      dec(h.sd) +
      '</b><img src="' +
      flag(d.id) +
      '" alt=""></div>';
  } else {
    const changes = h.changes || [],
      lines = changes.map((c) => changeRowHTML(c, byId, flag)).join("");
    content =
      '<span class="popup-kicker">RESULTADO · ' +
      dec(h.sa) +
      " — " +
      dec(h.sd) +
      "</span><h3>" +
      title(h) +
      "</h3>" +
      (lines
        ? '<div class="popup-changes">' + lines + "</div>"
        : "<p>La frontera se mantiene</p>") +
      '<small class="war-losses">Bajas: ' +
      a.name +
      " −" +
      shortPop(h.combatLossA || 0) +
      " · " +
      d.name +
      " −" +
      shortPop(h.combatLossD || 0) +
      "</small>" +
      (h.casualties
        ? "<small>Castigo al atacante: −" +
          shortPop(h.casualties) +
          " (2 %)</small>"
        : "");
  }
  popup.innerHTML = content;
  popup.className =
    "battle-popup visible " +
    (p === 5
      ? h.revivedFaction
        ? "free"
        : h.conquered
          ? "victory"
          : "defeat"
      : "opening");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    popup.animate(
      [
        { opacity: 0, transform: "translateY(-12px) scale(.96)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: 500, easing: "cubic-bezier(.16,1,.3,1)" },
    );
}
/** Presenta el orden fijo de la ronda y los movimientos ya consumidos. */
function renderQueue() {
  const round = (current && current.phase < 5
    ? current.next?.initiative
    : state.initiative) || {
    number: 1,
    order: roundOrder(state, regions, () => 0.5),
    acted: [],
    pending: [],
    excluded: [],
  };
  $("roundTitle").textContent = "RONDA " + round.number;
  const alive = active(state);
  $("roundQueue").innerHTML = round.order
    .map((id, i) => {
      const status =
        !alive.includes(id) || round.excluded.includes(id)
          ? "Eliminado"
          : current?.phase < 5 && current.result.attacker === id
            ? "En combate"
            : round.acted.includes(id)
              ? "Ha movido"
              : round.pending[0] === id
                ? "Siguiente"
                : "Pendiente";
      return (
        '<div class="queue-row"><span>' +
        String(i + 1).padStart(2, "0") +
        '</span><img src="' +
        flag(id) +
        '" alt=""><b>' +
        byId[id].name +
        "</b><small>" +
        status +
        "</small></div>"
      );
    })
    .join("");
}
const labels = [
  "Primer dado",
  "Segundo dado",
  "Tercer dado",
  "Calcular",
  "Ver resultado",
  "Siguiente",
];
/** Sincroniza las vistas y dispara cada animación/sonido como máximo una vez por fase. */
function render() {
  $("game").dataset.phase = current?.phase ?? "idle";
  $("game").dataset.review = String(!!current?.mapReview);
  renderMap();
  renderBattle();
  renderStats();
  renderPopup();
  renderQueue();
  renderRoll();
  const h = current?.result;
  if (h) {
    const anchor = byId[h.target || h.defender].center,
      points = (h.changedTerritories || [h.changedTerritory])
        .filter(Boolean)
        .map((id) => byId[id].center);
    animateStage(h.turn, current.phase, anchor, points);
    soundCue(h.turn, current.phase, h);
    $("impactWord").textContent =
      current.phase === 5 && !current.mapReview
        ? h.revivedFaction
          ? "LIBERTAD"
          : h.changes?.length > 1
            ? "RUPTURA"
            : h.conquered
              ? h.frontType === "sea"
                ? "DESEMBARCO"
                : "CONQUISTA"
              : "RESISTE"
        : "";
  }
  const end = active(state).length === 1;
  $("step").innerHTML =
    (summaryMode
      ? "Continuar"
      : current?.phase === 5 && !current.mapReview
        ? "Ver mapa"
        : end
          ? "Ver victoria"
          : current?.mapReview
            ? h.roundComplete
              ? "Resumen de ronda"
              : "Siguiente batalla"
            : current
              ? labels[current.phase]
              : "Empezar batalla") + " <span>→</span>";
  $("step").disabled = automatic;
  $("auto").disabled = end && !automatic;
  $("auto").classList.toggle("running", automatic);
  $("auto").innerHTML = automatic
    ? "Ⅱ <span>Pausar</span>"
    : "▶ <span>Auto</span>";
}
/** Avanza presentación → resultado confirmado → mapa despejado → siguiente guerra/resumen. */
function advance() {
  // El resultado se lee primero; después se despeja el tablero, sin gastar otro turno.
  if (current?.phase === 5 && !current.mapReview) {
    current.mapReview = true;
    focused = false;
    render();
    return;
  }
  if (active(state).length === 1) {
    showCampaign("winner");
    return;
  }
  if (summaryMode) {
    $("campaignOverlay").hidden = true;
    summaryMode = null;
  } else if (current?.phase === 5 && current.result.winner) {
    showCampaign("winner");
    return;
  } else if (
    current?.phase === 5 &&
    current.result.roundComplete &&
    !current.summarySeen
  ) {
    current.summarySeen = true;
    showCampaign("round");
    return;
  }
  if (!current || current.phase === 5) {
    current = prepareTurn(state, regions);
    if (!current) return;
    focused = true;
    $("saveStatus").textContent = "Batalla en curso";
  } else {
    current = advanceTurn(current);
    if (current.phase === 5) {
      state = current.next;
      persist();
    }
  }
  render();
}
/** Programa una sola espera; la pausa de mapa tiene duración propia en todos los ritmos. */
function schedule() {
  clearTimeout(timer);
  if (automatic)
    timer = setTimeout(
      () => {
        advance();
        schedule();
      },
      summaryMode
        ? 5200
        : current?.mapReview
          ? mapReviewDuration($("speed").value)
          : phaseDuration(current?.phase ?? 0, $("speed").value),
    );
}
/** Detiene el avance automático sin cambiar dados, propietarios ni bajas. */
function pause() {
  automatic = false;
  clearTimeout(timer);
  render();
}
$("step").addEventListener("click", () => {
  startSound();
  advance();
});
$("auto").addEventListener("click", () => {
  startSound();
  if (automatic) {
    pause();
    return;
  }
  automatic = true;
  if (!current || current.phase === 5) advance();
  else render();
  schedule();
});
$("speed").addEventListener("change", () => {
  try {
    localStorage.setItem("choque-peninsular-pace", $("speed").value);
  } catch {}
  schedule();
});
$("overview").addEventListener("click", () => {
  focused = !focused;
  renderMap();
});
/** Pausa el juego antes de abrir una ventana modal. */
function openDialog(id) {
  pause();
  for (const d of document.querySelectorAll("dialog[open]")) d.close();
  $(id).showModal();
}
for (const [button, id] of [
  ["menuButton", "menu"],
  ["rulesButton", "rules"],
  ["sourcesButton", "sources"],
  ["rankingButton", "rankingDialog"],
  ["historyButton", "historyDialog"],
  ["turnsButton", "turnsDialog"],
])
  $(button).addEventListener("click", () => openDialog(id));
for (const d of document.querySelectorAll("dialog")) {
  d.querySelector(".close").addEventListener("click", () => d.close());
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
}
$("reset").addEventListener("click", () => {
  if (
    (state.turn || current) &&
    !confirm("¿Empezar una nueva partida? Se borrará la partida guardada.")
  )
    return;
  automatic = false;
  clearTimeout(timer);
  state = initial(regions);
  const order = roundOrder(state, regions);
  state.initiative = {
    number: 1,
    order,
    pending: [...order],
    acted: [],
    excluded: [],
  };
  current = null;
  focused = false;
  summaryMode = null;
  $("campaignOverlay").hidden = true;
  battleKey = "";
  popupKey = "";
  $("effects").replaceChildren();
  $("impactWord").textContent = "";
  $("menu").close();
  persist();
  render();
});
/** Mantiene el botón acorde al modo de pantalla completa o su alternativa inmersiva. */
function syncFullscreen() {
  const on =
    !!document.fullscreenElement ||
    document.body.classList.contains("immersive");
  $("full").textContent = on ? "⤡" : "⛶";
  $("full").setAttribute(
    "aria-label",
    on ? "Salir de pantalla completa" : "Activar pantalla completa",
  );
  $("full").setAttribute("aria-pressed", String(on));
}
$("full").addEventListener("click", async () => {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {}
  } else if (document.body.classList.contains("immersive")) {
    document.body.classList.remove("immersive");
  } else {
    try {
      if (
        !document.fullscreenEnabled ||
        !document.documentElement.requestFullscreen
      )
        throw new Error("fallback");
      await document.documentElement.requestFullscreen();
    } catch {
      document.body.classList.add("immersive");
    }
  }
  syncFullscreen();
  window.dispatchEvent(new Event("resize"));
});

/** Ordena por provincias y después por población. Se usa en el resumen de ronda. */
function standings() {
  return active(state)
    .map((id) => ({
      id,
      n: regions.filter((r) => state.owners[r.id] === id).length,
      p: population(state, regions, id),
    }))
    .sort((a, b) => b.n - a.n || b.p - a.p);
}
/** Destaca quién gana cada pareja y cuántos puntos recibe. */
function renderRoll() {
  const h = current?.result,
    p = current?.phase,
    arena = $("diceArena");
  if (!h || p < 1 || p > 3) {
    arena.hidden = true;
    return;
  }
  arena.hidden = false;
  const pair = h.pairs[p - 1],
    winner = pair.side === "a" ? h.attacker : h.defender;
  arena.innerHTML =
    '<span class="roll-count">TIRADA ' +
    p +
    ' / 3</span><div class="arena-dice"><div class="arena-side ' +
    (pair.side === "a" ? "takes" : "") +
    '"><img src="' +
    flag(h.attacker) +
    '" alt="">' +
    die(pair.a, true, pair.side === "a") +
    '</div><span class="arena-versus">VS</span><div class="arena-side ' +
    (pair.side === "d" ? "takes" : "") +
    '"><img src="' +
    flag(h.defender) +
    '" alt="">' +
    die(pair.d, true, pair.side === "d") +
    '</div></div><div class="roll-verdict"><img src="' +
    flag(winner) +
    '" alt=""><b>' +
    byId[winner].name +
    "</b><strong>+" +
    pair.points +
    "</strong></div><small>" +
    (pair.a === pair.d
      ? "Empate · gana la defensa"
      : pair.a + " contra " + pair.d + " · diferencia " + pair.points) +
    "</small>";
}
/** Abre el resumen de ronda o la victoria, después de revisar el mapa final. */
function showCampaign(mode) {
  if (mode === "winner") {
    automatic = false;
    clearTimeout(timer);
  }
  summaryMode = mode;
  const rows = standings(),
    winner = rows[0],
    h = current?.result,
    overlay = $("campaignOverlay");
  overlay.hidden = false;
  overlay.className = "campaign-overlay " + mode;
  $("campaignContent").innerHTML =
    mode === "winner"
      ? '<div class="winner-emblem"><img src="' +
        flag(winner.id) +
        '" alt=""></div><p class="eyebrow">ESPAÑA TIENE UN VENCEDOR</p><h1>' +
        byId[winner.id].name +
        '</h1><p class="winner-sub">Una bandera. Todo el mapa.</p><div class="campaign-metrics"><span><b>52</b>provincias y ciudades</span><span><b>' +
        state.initiative.number +
        "</b>rondas</span><span><b>" +
        state.turn +
        '</b>batallas</span></div><p class="winner-pop">' +
        fmt(winner.p) +
        " habitantes · " +
        (state.wins[winner.id] || 0) +
        " " +
        ((state.wins[winner.id] || 0) === 1 ? "victoria" : "victorias") +
        "</p>"
      : '<p class="eyebrow">RONDA ' +
        (h?.roundNumber || state.initiative.number) +
        ' COMPLETADA</p><h1>Así queda España</h1><div class="round-distribution">' +
        rows
          .map(
            (r) =>
              '<span style="flex:' +
              r.n +
              ";background:" +
              byId[r.id].color +
              '" title="' +
              byId[r.id].name +
              '"></span>',
          )
          .join("") +
        '</div><div class="campaign-metrics"><span><b>' +
        rows.length +
        "</b>bandos en pie</span><span><b>" +
        state.turn +
        '</b>batallas</span></div><div class="round-standings">' +
        rows
          .map(
            (r, i) =>
              "<div><span>" +
              String(i + 1).padStart(2, "0") +
              '</span><img src="' +
              flag(r.id) +
              '" alt=""><b>' +
              byId[r.id].name +
              "</b><strong>" +
              r.n +
              " <small>prov.</small></strong><small>" +
              shortPop(r.p) +
              "</small></div>",
          )
          .join("") +
        "</div>";
  $("campaignContinue").textContent =
    mode === "winner" ? "Contemplar el mapa" : "Siguiente ronda →";
  $("campaignRestart").hidden = mode !== "winner";
  $("campaignContinue").onclick = () => {
    if (mode === "winner") {
      overlay.hidden = true;
      summaryMode = null;
    } else {
      advance();
      schedule();
    }
  };
  if (
    mode === "winner" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    $("campaignContent").animate(
      [
        { opacity: 0, transform: "translateY(30px) scale(.92)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 900, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  }
}
$("campaignRestart").onclick = () => {
  $("reset").click();
};

document.addEventListener("fullscreenchange", syncFullscreen);
syncFullscreen();
setupSound();
setupLayout();
document.addEventListener("visibilitychange", () => {
  if (document.hidden && automatic) pause();
});
render();
