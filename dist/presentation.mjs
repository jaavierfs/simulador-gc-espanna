/**
 * Construye una fila del resultado a partir del cambio REAL de propietario.
 * `territory.community` sirve para liberaciones, pero no identifica al dueño anterior:
 * una provincia puede llevar muchas conquistas antes de esta batalla.
 *
 * @param {{territory:string,from:string,to:string,type:string}} change Cambio del motor.
 * @param {Object<string,{name:string}>} names Comunidades y provincias por ID.
 * @param {(id:string)=>string} flag Ruta local de la bandera de un bando.
 */
export function changeRowHTML(change, names, flag) {
  const free = change.type === "liberation" || change.type === "independence";
  const previous = names[change.from].name,
    next = names[change.to].name,
    province = names[change.territory].name;
  return `<span class="popup-change ${free ? "free" : ""}"><img class="previous-owner-flag" src="${flag(change.from)}" alt="Antes: ${previous}" title="Antes: ${previous}"><span class="changed-province">${province}</span><b class="new-owner"><span aria-hidden="true">→</span><img src="${flag(change.to)}" alt="Ahora: ${next}" title="Ahora: ${next}"><span>${next}${free ? " libre" : ""}</span></b></span>`;
}
