/**
 * Distribución vertical/horizontal, automática o elegida por el usuario.
 * La orientación y el tamaño de la interfaz no cambian las reglas del tablero.
 */
export function setupLayout() {
  const button = document.getElementById("rotateLayout"),
    phoneLandscape = matchMedia("(orientation: landscape)");
  let mode = "auto";
  try {
    mode = localStorage.getItem("gce-layout") || "auto";
  } catch {}
  function update() {
    const horizontal =
      mode === "landscape" || (mode === "auto" && phoneLandscape.matches);
    document.body.classList.toggle("landscape-game", horizontal);
    button.textContent = horizontal ? "▯" : "▭";
    button.setAttribute(
      "aria-label",
      horizontal ? "Ver en vertical" : "Ver en horizontal",
    );
    button.setAttribute("aria-pressed", String(horizontal));
    window.dispatchEvent(new Event("resize"));
  }
  button.addEventListener("click", () => {
    mode = document.body.classList.contains("landscape-game")
      ? "portrait"
      : "landscape";
    try {
      localStorage.setItem("gce-layout", mode);
    } catch {}
    update();
  });
  phoneLandscape.addEventListener("change", update);
  update();
}
