/**
 * Cámara SVG, dados e impactos. Las claves evitan repetir un efecto al pausar
 * o renderizar de nuevo. Se respeta la preferencia de movimiento reducido.
 */
const ns = "http://www.w3.org/2000/svg";
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let raf = 0,
  last = "",
  stage = "";
/** Interpola el viewBox con requestAnimationFrame, cancelando un movimiento anterior. */
export function camera(svg, box, phase, focus) {
  const key = [...box, phase, focus?.join(",")].join(":");
  if (key === last) return;
  last = key;
  cancelAnimationFrame(raf);
  const start = svg.getAttribute("viewBox").split(" ").map(Number),
    end = [...box];
  if (focus) {
    const pad = phase === 0 ? 1.08 : phase === 4 ? 1.015 : 1;
    end[2] *= pad;
    end[3] *= pad;
    end[0] -= (end[2] - box[2]) / 2;
    end[1] -= (end[3] - box[3]) / 2;
    const weight = phase === 5 ? 0.035 : 0.02;
    end[0] += (focus[0] - (box[0] + box[2] / 2)) * weight;
    end[1] += (focus[1] - (box[1] + box[3] / 2)) * weight;
  }
  const begin = performance.now(),
    duration = reduced()
      ? 0
      : Math.min(
          1700,
          Math.max(
            430,
            { cinema: 1050, balanced: 680, fast: 420 }[
              document.getElementById("speed").value
            ] || 680,
          ),
        );
  const tick = (now) => {
    const t = duration ? Math.min(1, (now - begin) / duration) : 1,
      k = 1 - Math.pow(1 - t, 4);
    svg.setAttribute(
      "viewBox",
      start.map((v, i) => v + (end[i] - v) * k).join(" "),
    );
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
/** Anima la revelación de dados y los impactos sin volver a decidir su ganador. */
export function animateStage(turn, phase, anchor, changes = []) {
  const key = turn + ":" + phase;
  if (stage === key) return;
  stage = key;
  const game = document.getElementById("game");
  game.dataset.phase = phase;
  if (reduced()) return;
  if (phase >= 1 && phase <= 3) {
    const row = document.querySelectorAll(".dice-row")[phase - 1];
    for (const [i, die] of [...row.querySelectorAll(".die")].entries())
      die.animate(
        [
          {
            transform: `perspective(300px) translateY(-15px) rotateX(190deg) rotateZ(${i ? -30 : 30}deg) scale(.5)`,
            opacity: 0,
          },
          {
            transform:
              "perspective(300px) translateY(3px) rotateX(-15deg) scale(1.12)",
            opacity: 1,
            offset: 0.7,
          },
          { transform: "none", opacity: 1 },
        ],
        { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)", delay: i * 65 },
      );
  }
  if (phase >= 1 && phase <= 3) {
    const arena = document.getElementById("diceArena");
    for (const el of arena.querySelectorAll(".arena-side .die"))
      el.animate(
        [
          {
            transform: "translateY(-18px) rotate(70deg) scale(.65)",
            opacity: 0,
          },
          {
            transform: "translateY(3px) rotate(-8deg) scale(1.08)",
            opacity: 1,
            offset: 0.7,
          },
          { transform: "none", opacity: 1 },
        ],
        { duration: 330, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    const winner = arena.querySelector(".takes .die");
    winner?.animate(
      [
        { boxShadow: "0 0 0 0 #ffe0a000" },
        { boxShadow: "0 0 25px 9px #ffe0a088", transform: "scale(1.13)" },
        { boxShadow: "0 0 0 0 #ffe0a000", transform: "none" },
      ],
      { duration: 280, delay: 200 },
    );
  }
  if (phase === 4)
    for (const el of document.querySelectorAll(".score strong"))
      el.animate(
        [
          { opacity: 0, transform: "translateY(12px) scale(.85)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" },
      );
  if (phase === 5) {
    const effects = document.getElementById("effects");
    effects.replaceChildren();
    const targets = changes.length ? changes : [anchor];
    targets.forEach((point, i) => {
      if (!point) return;
      const g = document.createElementNS(ns, "g");
      g.setAttribute("transform", `translate(${point[0]} ${point[1]})`);
      g.style.setProperty("--delay", i * 160 + "ms");
      for (let j = 0; j < 2; j++) {
        const ring = document.createElementNS(ns, "circle");
        ring.setAttribute("r", j ? 28 : 16);
        ring.setAttribute("class", "shockwave");
        ring.style.animationDelay = i * 160 + j * 100 + "ms";
        g.append(ring);
      }
      for (let j = 0; j < 8; j++) {
        const spark = document.createElementNS(ns, "line"),
          a = (j * Math.PI) / 4;
        spark.setAttribute("x1", Math.cos(a) * 10);
        spark.setAttribute("y1", Math.sin(a) * 10);
        spark.setAttribute("x2", Math.cos(a) * 26);
        spark.setAttribute("y2", Math.sin(a) * 26);
        spark.setAttribute("class", "impact-spark");
        spark.style.animationDelay = i * 160 + "ms";
        g.append(spark);
      }
      effects.append(g);
    });
    game.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-2px,1px)", offset: 0.18 },
        { transform: "translate(2px,-1px)", offset: 0.35 },
        { transform: "translate(-1px,0)", offset: 0.55 },
        { transform: "translate(0,0)" },
      ],
      { duration: 330, easing: "ease-out" },
    );
    document.querySelector(".narrative").animate(
      [
        { opacity: 0, transform: "translateY(8px) scale(.97)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 600, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  }
}
