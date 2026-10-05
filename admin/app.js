/* =====================================================================
   Panel de la clínica: aplicación
   Vistas: Inicio, Agenda, Reservas, Pacientes, Bloqueos, Actividad.
   (Página web y Configuración están en admin/editor.js)
   ===================================================================== */
(function(){
"use strict";
var A = window.A = {};

/* ---------- Utilidades ---------- */
var $ = A.$ = function(s, r){ return (r || document).querySelector(s); };
var $$ = A.$$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var esc = A.esc = function(t){ return String(t == null ? "" : t).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
var pad = function(n){ return (n < 10 ? "0" : "") + n; };
var DIAS = A.DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
var DIAS_C = A.DIAS_C = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
var MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
var cap = function(t){ t = String(t); return t.charAt(0).toUpperCase() + t.slice(1); };
function ahora(){
  try {
    var p = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date()).forEach(function(x){ p[x.type] = x.value; });
    return { iso: p.year + "-" + p.month + "-" + p.day, min: (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10) };
  } catch (e) { var d = new Date(); return { iso: d.toISOString().slice(0, 10), min: d.getHours() * 60 + d.getMinutes() }; }
}
var hoy = A.hoy = function(){ return ahora().iso; };
var fdate = function(iso){ var a = iso.split("-"); return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2], 12)); };
var mas = A.mas = function(iso, n){ var d = fdate(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
var dow = function(iso){ return fdate(iso).getUTCDay(); };
var largo = A.largo = function(iso){ var d = fdate(iso); return cap(DIAS[d.getUTCDay()]) + " " + d.getUTCDate() + " de " + MESES[d.getUTCMonth()]; };
var medio = A.medio = function(iso){ var d = fdate(iso); return cap(DIAS[d.getUTCDay()]).slice(0, 3) + " " + d.getUTCDate() + " " + MESES_C[d.getUTCMonth()]; };
var corto = function(iso){ var a = iso.split("-"); return +a[2] + " " + MESES_C[+a[1] - 1]; };
var aMin = A.aMin = function(h){ var a = String(h).split(":"); return +a[0] * 60 + +a[1]; };
var aHora = A.aHora = function(m){ return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
var hm = function(h){ return String(h || "").slice(0, 5); };
var nfmt = A.nfmt = function(n){ return Number(n || 0).toLocaleString("es-CL"); };
var pct = function(n){ return (Math.round(n * 10) / 10).toLocaleString("es-CL") + "%"; };
function debounce(fn, ms){ var t; return function(){ var a = arguments, s = this; clearTimeout(t); t = setTimeout(function(){ fn.apply(s, a); }, ms); }; }
A.debounce = debounce;
function rutLimpio(v){ return String(v || "").replace(/[^0-9kK]/g, "").toUpperCase(); }
function rutValido(v){
  var c = rutLimpio(v), cuerpo = c.slice(0, -1), dv = c.slice(-1); if (!/^\d{7,8}$/.test(cuerpo)) return false;
  var s = 0, m = 2; for (var k = cuerpo.length - 1; k >= 0; k--) { s += +cuerpo[k] * m; m = m === 7 ? 2 : m + 1; }
  var r = 11 - s % 11; return dv === (r === 11 ? "0" : r === 10 ? "K" : String(r));
}
var rutFmt = A.rutFmt = function(c){ c = rutLimpio(c); if (c.length < 2) return c; return c.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + c.slice(-1); };
function docTxt(r){ return (r.paciente_doc_tipo || r.doc_tipo) === "pasaporte" ? "Pasaporte " + (r.paciente_doc || r.doc) : "RUT " + rutFmt(r.paciente_doc || r.doc); }
function hace(ts){
  var s = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "recién"; if (s < 3600) return "hace " + Math.round(s / 60) + " min"; if (s < 86400) return "hace " + Math.round(s / 3600) + " h";
  if (s < 86400 * 7) return "hace " + Math.round(s / 86400) + " d";
  return new Date(ts).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}
A.hace = hace;

/* ---------- Íconos (trazo uniforme 1.8) ---------- */
var IC = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 3v3M16 3v3"/>', list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.8 2.6 3 5.2"/>',
  lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  wa: '<path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19.1z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.3-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2L9 9.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', print: '<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>',
  down: '<path d="M12 4v12M6 11l6 6 6-6M5 20h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', up: '<path d="m6 15 6-6 6 6"/>', dn: '<path d="m6 9 6 6 6-6"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/>', alert: '<path d="M12 3 2 20h20zM12 10v4M12 17.5h.01"/>',
  door: '<path d="M4 21h16M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M14 12h.01"/>', sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'
};
var I = A.I = function(n, cls){ return '<svg class="i' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || "") + "</svg>"; };

/* ---------- Estados de cita ---------- */
var EST = A.EST = [
  { id: "pendiente", t: "Reservada", c: "var(--warn)" }, { id: "confirmada", t: "Confirmada", c: "var(--info)" }, { id: "en_sala", t: "En sala", c: "var(--violet)" },
  { id: "atendida", t: "Atendida", c: "var(--ok)" }, { id: "no_asistio", t: "No asistió", c: "var(--bad)" }, { id: "cancelada", t: "Anulada", c: "var(--gray)" }
];
var estNom = A.estNom = function(e){ var x = EST.filter(function(s){ return s.id === e; })[0]; return x ? x.t : e; };
var stPill = A.stPill = function(e){ return '<span class="st ' + esc(e) + '">' + esc(estNom(e)) + "</span>"; };
var COLORES = A.COLORES = ["#0B63CE", "#0E9384", "#C11574", "#B54708", "#6941C6", "#3E4784", "#4CA30D", "#D92D20"];

/* ---------- Estado global ---------- */
var DB = null, CFG = {}, USER = null;
A.cfg = function(){ return CFG; };
A.setCfg = function(c){ CFG = c || {}; aplicarCfg(); };
function profs(todos){ return (CFG.profesionales || []).filter(function(p){ return todos || p.activo !== false; }); }
function trats(todos){ return (CFG.tratamientos || []).filter(function(t){ return todos || t.activo !== false; }); }
A.profs = profs; A.trats = trats;
function profPorId(id){ return (CFG.profesionales || []).filter(function(p){ return p.id === id; })[0]; }
function tratPorId(id){ return (CFG.tratamientos || []).filter(function(t){ return t.id === id; })[0]; }
function colorProf(id){ var p = profPorId(id), i = (CFG.profesionales || []).indexOf(p); return (p && p.color) || COLORES[Math.max(0, i) % COLORES.length]; }
A.colorProf = colorProf;
function reglas(){ var r = Object.assign({ intervalo: 30, anticipacion_min: 60, ventana_dias: 60, max_futuras: 3, cancelar_hasta_horas: 2 }, CFG.reglas || {}); r.intervalo = +r.intervalo || 30; return r; }
A.reglas = reglas;
function bloqueEn(hor, iso){ var d = dow(iso); return (hor || []).filter(function(b){ return (b.dias || []).indexOf(d) >= 0; })[0] || null; }
function horarioDe(p){ return p && p.horario && p.horario.length ? p.horario : CFG.horario || []; }
function bloqueProf(p, iso){ return bloqueEn(horarioDe(p), iso); }
function durTrat(t){ return +(t && t.duracion) || reglas().intervalo; }

/* ---------- Avisos (toasts) con deshacer ---------- */
function toast(msg, op){
  op = op || {};
  var el = document.createElement("div"); el.className = "toast in" + (op.tipo === "bad" ? " bad" : "");
  el.innerHTML = "<span>" + msg + "</span>" + (op.accion ? '<button type="button">' + esc(op.accion) + "</button>" : "");
  $("#toasts").appendChild(el);
  var todos = $$("#toasts .toast"); if (todos.length > 3) todos[0].remove();
  requestAnimationFrame(function(){ el.classList.remove("in"); });
  var fuera = function(){ el.classList.add("in"); setTimeout(function(){ el.remove(); }, 250); };
  var t = setTimeout(fuera, op.ms || (op.accion ? 6000 : 3200));
  if (op.accion) el.querySelector("button").addEventListener("click", function(){ clearTimeout(t); fuera(); op.fn && op.fn(); });
}
A.toast = toast;
function errorTxt(e){
  var m = (e && (e.message || e.error_description)) || String(e || "");
  if (/reservas_sin_cruce|exclusion|conflicting key/i.test(m)) return "Ese horario se cruza con otra cita del mismo profesional.";
  if (/permission|sin_permiso|JWT/i.test(m)) return "Su sesión no tiene permiso. Vuelva a ingresar.";
  if (/Failed to fetch|network/i.test(m)) return "Sin conexión. Revise internet e intente de nuevo.";
  return m;
}
A.errorTxt = errorTxt;

/* ---------- Tooltip para gráficos ---------- */
function tipOn(t, x, y){ var tp = $("#tip"); tp.textContent = t; tp.style.left = x + "px"; tp.style.top = y + "px"; tp.classList.add("on"); }
function tipOff(){ $("#tip").classList.remove("on"); }

/* ---------- Panel lateral ---------- */
var drawerFoco = null;
function abrirDrawer(html){
  var d = $("#drawer"), s = $("#scrim");
  if (!d.classList.contains("on")) drawerFoco = document.activeElement;
  d.innerHTML = html; s.hidden = false;
  requestAnimationFrame(function(){ s.classList.add("on"); d.classList.add("on"); });
  d.setAttribute("aria-hidden", "false");
  setTimeout(function(){ var f = $("[autofocus]", d) || $(".dh .btn", d); if (f) f.focus(); }, 60);
  return d;
}
function cerrarDrawer(){
  var d = $("#drawer"), s = $("#scrim");
  if (!d.classList.contains("on")) return;
  d.classList.remove("on"); s.classList.remove("on"); d.setAttribute("aria-hidden", "true");
  setTimeout(function(){ s.hidden = true; if (!d.classList.contains("on")) d.innerHTML = ""; }, 280);
  if (drawerFoco && drawerFoco.focus) drawerFoco.focus();
}
A.abrirDrawer = abrirDrawer; A.cerrarDrawer = cerrarDrawer;
$("#scrim").addEventListener("click", cerrarDrawer);
function drawerHead(titulo, extra){ return '<div class="dh"><h3 id="d-titulo">' + titulo + "</h3>" + (extra || "") + '<button class="btn ghost icon" type="button" data-cerrar aria-label="Cerrar">' + I("x") + "</button></div>"; }
$("#drawer").addEventListener("click", function(ev){ if (ev.target.closest("[data-cerrar]")) cerrarDrawer(); });

/* ---------- Navegación ---------- */
var VISTAS = A.VISTAS = {};
var MENU = [
  { id: "inicio", t: "Inicio", i: "home" }, { id: "agenda", t: "Agenda", i: "cal" }, { id: "reservas", t: "Reservas", i: "list", badge: true },
  { id: "pacientes", t: "Pacientes", i: "users" }, { id: "bloqueos", t: "Bloqueos", i: "lock" },
  { grp: "Clínica" }, { id: "pagina", t: "Página web", i: "globe" }, { id: "config", t: "Configuración", i: "gear" }, { id: "actividad", t: "Actividad", i: "pulse" }
];
var actual = { id: null, params: {} };
A.actual = actual;
function pintarMenu(){
  $("#s-nav").innerHTML = MENU.map(function(m){
    if (m.grp) return '<div class="grp">' + m.grp + "</div>";
    return '<button type="button" class="nav" data-ir="' + m.id + '"' + (actual.id === m.id ? ' aria-current="page"' : "") + ">" + I(m.i) + "<span>" + m.t + "</span>" + (m.badge ? '<span class="badge" id="badge-' + m.id + '" hidden></span>' : "") + "</button>";
  }).join("");
  actualizarBadge();
}
function ir(id, params){
  if (!VISTAS[id]) id = "inicio";
  if (A.sucio && A.sucio() && actual.id !== id && ["pagina", "config"].indexOf(id) < 0 && !confirm("Tiene cambios sin guardar en la página. ¿Salir sin guardar?")) return;
  if (A.sucio && A.sucio() && ["pagina", "config"].indexOf(id) < 0) A.descartar();
  actual.id = id; actual.params = params || {};
  var m = MENU.filter(function(x){ return x.id === id; })[0];
  $("#b-titulo").textContent = m ? m.t : "";
  document.title = (m ? m.t + " · " : "") + (CFG.nombre || "Panel");
  $$("#s-nav .nav").forEach(function(b){ if (b.dataset.ir === id) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  $("#side").classList.remove("on");
  $("#vista").className = "page" + (id === "agenda" || id === "pagina" ? " wide" : "");
  try { history.replaceState(null, "", "#" + id); } catch (e) {}
  tipOff();
  VISTAS[id]($("#vista"), actual.params);
  $("#vista").focus({ preventScroll: true }); window.scrollTo(0, 0);
}
A.ir = ir;
function refrescar(){ if (actual.id && VISTAS[actual.id] && VISTAS[actual.id].refrescar) VISTAS[actual.id].refrescar(); }
A.refrescar = refrescar;
$("#s-nav").addEventListener("click", function(ev){ var b = ev.target.closest("[data-ir]"); if (b) ir(b.dataset.ir); });
$("#b-menu").innerHTML = I("menu");
$("#b-menu").addEventListener("click", function(){ $("#side").classList.toggle("on"); });
$("#b-nueva").innerHTML = I("plus") + "<span>Nueva cita</span>";
$("#b-nueva").addEventListener("click", function(){ nuevaCita({}); });
$("#b-buscar").innerHTML = I("search") + "<span>Buscar paciente, código…</span><kbd>Ctrl K</kbd>";
$("#b-buscar").addEventListener("click", abrirPaleta);
$("#b-ver").innerHTML = I("ext") + "<span>Ver página</span>";
$("#b-salir").innerHTML = I("out") + "<span>Salir</span>";
$("#b-salir").addEventListener("click", function(){ DB.auth.signOut().then(function(){ location.hash = ""; location.reload(); }); });

/* Tema claro / oscuro / automático */
function temaActual(){ try { return localStorage.getItem("tema") || "auto"; } catch (e) { return "auto"; } }
function pintarTema(){
  var t = temaActual();
  $("#b-tema").innerHTML = I(t === "dark" ? "moon" : "sun") + "<span>Tema: " + (t === "dark" ? "oscuro" : t === "light" ? "claro" : "automático") + "</span>";
}
$("#b-tema").addEventListener("click", function(){
  var t = temaActual(), n = t === "auto" ? "light" : t === "light" ? "dark" : "auto";
  try { if (n === "auto") localStorage.removeItem("tema"); else localStorage.setItem("tema", n); } catch (e) {}
  if (n === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", n);
  pintarTema();
});

/* Atajos de teclado */
document.addEventListener("keydown", function(ev){
  var tag = (ev.target.tagName || "").toLowerCase(), escribiendo = tag === "input" || tag === "textarea" || tag === "select" || ev.target.isContentEditable;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); abrirPaleta(); return; }
  if (ev.key === "Escape") { if (!$("#palette").hidden) cerrarPaleta(); else cerrarDrawer(); return; }
  if (escribiendo || ev.ctrlKey || ev.metaKey || ev.altKey || $("#v-app").hidden) return;
  if (ev.key === "n" || ev.key === "N") { ev.preventDefault(); nuevaCita({}); }
  if (ev.key === "/") { ev.preventDefault(); abrirPaleta(); }
});

/* ---------- Datos ---------- */
function q(t){ return DB.from(t); }
A.q = q;
function cargarReservas(desde, hasta, extra){
  var r = q("reservas").select("*").gte("fecha", desde).lte("fecha", hasta);
  if (extra) r = extra(r);
  return r.order("fecha").order("hora").limit(2000).then(function(x){ if (x.error) throw x.error; return x.data || []; });
}
A.cargarReservas = cargarReservas;
function cargarBloqueos(desde, hasta){
  return q("bloqueos").select("*").lte("inicio", hasta + "T23:59:59").gte("fin", desde + "T00:00:00").order("inicio").then(function(x){ if (x.error) throw x.error; return (x.data || []).map(normBloq); });
}
function normBloq(b){ b.i = String(b.inicio).replace(" ", "T").slice(0, 16); b.f = String(b.fin).replace(" ", "T").slice(0, 16); return b; }
function cambiarEstado(r, estado, silencio){
  var antes = { estado: r.estado, cancelada_por: r.cancelada_por };
  var cambios = { estado: estado, cancelada_por: estado === "cancelada" ? (r.cancelada_por || "clinica") : null };
  return q("reservas").update(cambios).eq("id", r.id).then(function(x){
    if (x.error) { toast(/exclusion|cruce|duplicate|conflicting/i.test(x.error.message || "") ? "No se puede reactivar: esa hora ya está tomada por otra cita." : errorTxt(x.error), { tipo: "bad" }); throw x.error; }
    Object.assign(r, cambios);
    if (!silencio) toast("<b>" + esc(r.paciente_nombre) + "</b>: " + esc(estNom(estado)), { accion: "Deshacer", fn: function(){
      q("reservas").update(antes).eq("id", r.id).then(function(y){ if (y.error) return toast(errorTxt(y.error), { tipo: "bad" }); Object.assign(r, antes); refrescar(); actualizarBadge(); });
    } });
    actualizarBadge();
    return r;
  });
}
A.cambiarEstado = cambiarEstado;
function actualizarBadge(){
  if (!DB) return;
  q("reservas").select("id", { count: "exact", head: true }).eq("estado", "pendiente").gte("fecha", hoy()).then(function(x){
    var b = $("#badge-reservas"); if (!b || x.error) return;
    b.hidden = !x.count; b.textContent = x.count > 99 ? "99+" : x.count; b.title = x.count + " por confirmar";
  });
}

/* ---------- WhatsApp con plantillas ---------- */
var PLANTILLAS = {
  confirmar: "Hola {nombre}, le escribimos de {clinica} para confirmar su hora de {tratamiento} el {fecha} a las {hora} con {profesional}. ¿Nos confirma su asistencia? Dirección: {direccion}.",
  recordatorio: "Hola {nombre}, le recordamos su hora en {clinica} el {fecha} a las {hora} con {profesional}. Si no puede asistir, anúlela aquí: {enlace}",
  reagendar: "Hola {nombre}, de {clinica}: su hora quedó para el {fecha} a las {hora} con {profesional}. Su código es {codigo}."
};
A.PLANTILLAS = PLANTILLAS;
function urlSitio(){ return location.href.replace(/admin\.html.*$/, ""); }
function llenar(tpl, r){
  var v = { nombre: (r.paciente_nombre || "").split(" ")[0], clinica: CFG.nombre || "", tratamiento: r.tratamiento || "", fecha: r.fecha ? largo(r.fecha).toLowerCase() : "",
    hora: hm(r.hora), profesional: r.profesional || "", direccion: CFG.direccion || "", codigo: r.codigo || "", enlace: urlSitio() + "mi-reserva.html?c=" + (r.codigo || "") };
  return String(tpl || "").replace(/\{(\w+)\}/g, function(m, k){ return k in v ? v[k] : m; });
}
A.llenar = llenar;
function waLink(r, clave){
  var tel = String(r.telefono || "").replace(/\D/g, ""); if (tel.length === 9 && tel[0] === "9") tel = "56" + tel;
  var tpl = (CFG.mensajes || {})[clave] || PLANTILLAS[clave] || "";
  return "https://wa.me/" + tel + (tpl ? "?text=" + encodeURIComponent(llenar(tpl, r)) : "");
}
A.waLink = waLink;

/* =====================================================================
   INICIO
   ===================================================================== */
var INI = { dias: 30 };
VISTAS.inicio = function(v){
  var h = ahora().min, saludo = h < 12 * 60 ? "Buenos días" : h < 20 * 60 ? "Buenas tardes" : "Buenas noches";
  v.innerHTML = '<div class="greet"><h2>' + saludo + "</h2><p>" + largo(hoy()) + " · " + esc(CFG.nombre || "") + "</p></div>" +
    '<div class="alerts" id="i-alertas">' + [1, 2, 3, 4].map(function(){ return '<div class="alert"><div class="skel" style="height:62px"></div></div>'; }).join("") + "</div>" +
    '<div class="head"><h2 style="font-size:17px">Rendimiento</h2><div class="seg" role="group" aria-label="Periodo">' + [7, 30, 90].map(function(n){ return '<button type="button" data-dias="' + n + '" aria-pressed="' + (INI.dias === n) + '">' + n + " días</button>"; }).join("") + "</div></div>" +
    '<div class="kpis" id="i-kpis">' + [1, 2, 3, 4, 5, 6].map(function(){ return '<div class="kpi"><div class="skel" style="height:50px"></div></div>'; }).join("") + "</div>" +
    '<div class="grid2"><div class="card"><div class="hd"><h3>Hoy</h3><button class="btn sm sec" type="button" data-ir-agenda>' + I("cal") + "Ver agenda</button></div><div class=\"bd flush today\" id=\"i-hoy\"><div class=\"bd\"><div class=\"skel\" style=\"height:120px\"></div></div></div></div>" +
    '<div class="card"><div class="hd"><h3>Citas por día</h3><span class="count" id="i-citas-total"></span></div><div class="bd" id="i-chart"><div class="skel" style="height:170px"></div></div></div></div>' +
    '<div class="grid3" id="i-listas"></div>';
  v.onclick = function(ev){
    var d = ev.target.closest("[data-dias]"); if (d) { INI.dias = +d.dataset.dias; return VISTAS.inicio(v); }
    if (ev.target.closest("[data-ir-agenda]")) return ir("agenda", { fecha: hoy() });
    var al = ev.target.closest("[data-alerta]"); if (al) return ir(al.dataset.alerta === "hoy" ? "agenda" : "reservas", al.dataset.alerta === "hoy" ? { fecha: hoy() } : { preset: al.dataset.alerta });
    var acc = ev.target.closest("[data-acc]"); if (acc) { ev.stopPropagation(); var r = HOYL.filter(function(x){ return x.id === acc.dataset.id; })[0]; if (r) cambiarEstado(r, acc.dataset.acc).then(function(){ pintarHoy(); }); return; }
    if (ev.target.closest("a")) return;
    var row = ev.target.closest("[data-cita]"); if (row) verCita(row.dataset.cita);
  };
  cargarInicio();
};
var HOYL = [];
VISTAS.inicio.refrescar = function(){ cargarInicio(); };
function cargarInicio(){
  var t = hoy(), n = INI.dias, desde = mas(t, -(n - 1)), pdesde = mas(desde, -n), phasta = mas(desde, -1);
  Promise.all([
    DB.rpc("resumen", { desde: desde, hasta: t }), DB.rpc("resumen", { desde: pdesde, hasta: phasta }),
    cargarReservas(t, mas(t, 2)),
    q("reservas").select("id", { count: "exact", head: true }).eq("origen", "web").gte("creada", new Date(Date.now() - 864e5).toISOString())
  ]).then(function(rs){
    var a = rs[0].data || {}, b = rs[1].data || {}, prox = rs[2], web24 = rs[3].count || 0;
    if (rs[0].error) throw rs[0].error;
    HOYL = prox.filter(function(r){ return r.fecha === t && r.estado !== "cancelada"; });
    var porConf = prox.filter(function(r){ return r.estado === "pendiente"; }).length, enSala = HOYL.filter(function(r){ return r.estado === "en_sala"; }).length;
    $("#i-alertas").innerHTML =
      alerta("pendientes", "Por confirmar", porConf, "en los próximos 3 días", porConf > 0) +
      alerta("hoy", "Citas hoy", HOYL.length, HOYL.filter(function(r){ return r.estado === "atendida"; }).length + " atendidas") +
      alerta("hoy", "En sala ahora", enSala, enSala ? "esperando atención" : "sala vacía") +
      alerta("web24", "Reservas web", web24, "en las últimas 24 horas");
    var disp = minutosDisponibles(desde, t), pdisp = minutosDisponibles(pdesde, phasta);
    var asis = function(x){ var tot = (x.atendidas || 0) + (x.no_asistio || 0); return tot ? x.no_asistio / tot * 100 : 0; };
    var conv = function(x){ return x.visitas ? (x.web || 0) / x.visitas * 100 : 0; };
    $("#i-kpis").innerHTML =
      kpi("Citas", nfmt(a.citas), a.citas, b.citas) +
      kpi("Ocupación", pct(disp ? a.minutos / disp * 100 : 0), disp ? a.minutos / disp : 0, pdisp ? b.minutos / pdisp : 0) +
      kpi("Reservas web", nfmt(a.web), a.web, b.web) +
      kpi("Inasistencia", pct(asis(a)), asis(a), asis(b), true) +
      kpi("Pacientes nuevos", nfmt(a.pacientes_nuevos), a.pacientes_nuevos, b.pacientes_nuevos) +
      kpi("Conversión web", pct(conv(a)), conv(a), conv(b));
    pintarHoy();
    $("#i-citas-total").textContent = nfmt(a.citas) + " en " + n + " días";
    $("#i-chart").innerHTML = barras(a.por_dia || [], "citas", "citas");
    activarBarras($("#i-chart"));
    $("#i-listas").innerHTML = listaCard("Por tratamiento", a.por_tratamiento) + listaCard("Por profesional", a.por_profesional) + listaCard("Por previsión", a.por_prevision) +
      listaCard("Horas más pedidas", horasObj(a.por_hora), true) + listaCard("De dónde llegan las visitas", a.origenes) +
      '<div class="card"><div class="hd"><h3>Página web</h3></div><div class="bd"><div class="hbars">' +
      fila("Visitas", a.visitas) + fila("Empezaron a reservar", a.inicios) + fila("Reservaron", a.web) + fila("Desde celular", a.movil) + "</div></div></div>";
  }).catch(function(e){ $("#i-alertas").innerHTML = '<p class="msg bad">' + esc(errorTxt(e)) + (/function|resumen|disponibilidad|does not exist/i.test(e && e.message || "") ? " ¿Ejecutó el archivo supabase/02-panel-pro.sql?" : "") + "</p>"; });
}
function fila(t, n){ return '<div class="hbar"><span class="t">' + t + "</span><b>" + nfmt(n) + "</b></div>"; }
function horasObj(o){ var r = {}; Object.keys(o || {}).sort().forEach(function(h){ r[h + ":00"] = o[h]; }); return r; }
function alerta(id, t, n, sub, hot){ return '<button type="button" class="alert' + (hot ? " hot" : "") + '" data-alerta="' + id + '"><small>' + (hot ? I("alert") : "") + t + "</small><b class=\"num\">" + nfmt(n) + "</b><span>" + esc(sub) + "</span></button>"; }
function kpi(t, v, a, b, inverso){
  var d = "", diff = (a || 0) - (b || 0);
  if (b) { var p = diff / b * 100; d = '<span class="delta ' + (inverso ? "inv " : "") + (Math.abs(p) < .5 ? "eq" : p > 0 ? "up" : "down") + '">' + (Math.abs(p) < .5 ? "= " : p > 0 ? "▲ " : "▼ ") + Math.abs(Math.round(p)) + "%</span>"; }
  else if (a) d = '<span class="delta eq">nuevo</span>';
  else d = '<span class="delta eq">—</span>';
  return '<div class="kpi"><small>' + t + "</small><b>" + v + "</b>" + d + ' <span class="count">vs anterior</span></div>';
}
function minutosDisponibles(desde, hasta){
  var tot = 0;
  for (var d = desde; d <= hasta; d = mas(d, 1)) profs().forEach(function(p){
    var b = bloqueProf(p, d); if (!b) return;
    var m = aMin(b.cierra) - aMin(b.abre); if (b.pausa && b.pausa[0] && b.pausa[1]) m -= aMin(b.pausa[1]) - aMin(b.pausa[0]); tot += Math.max(0, m);
  });
  return tot;
}
function pintarHoy(){
  var t = ahora(), el = $("#i-hoy"); if (!el) return;
  if (!HOYL.length) { el.innerHTML = '<div class="empty">' + I("cal") + "<b>Sin citas para hoy</b><span>Las reservas nuevas aparecerán aquí.</span></div>"; return; }
  el.innerHTML = HOYL.map(function(r){
    var ini = aMin(r.hora), fin = ini + (r.duracion || 30), pasada = fin < t.min, ahoraSi = ini <= t.min && fin > t.min;
    var acc = "";
    if (r.estado === "pendiente") acc = '<a class="btn sm sec icon" href="' + esc(waLink(r, "confirmar")) + '" target="_blank" rel="noopener" title="Pedir confirmación por WhatsApp" aria-label="WhatsApp">' + I("wa") + '</a><button type="button" class="btn sm sec" data-acc="confirmada" data-id="' + r.id + '">' + I("check") + "Confirmar</button>";
    else if (r.estado === "confirmada") acc = '<button type="button" class="btn sm sec" data-acc="en_sala" data-id="' + r.id + '">' + I("door") + "Llegó</button>" + (pasada ? '<button type="button" class="btn sm ghost" data-acc="no_asistio" data-id="' + r.id + '">No asistió</button>' : "");
    else if (r.estado === "en_sala") acc = '<button type="button" class="btn sm" data-acc="atendida" data-id="' + r.id + '">' + I("check") + "Atendida</button>";
    return '<div class="trow' + (pasada && r.estado !== "en_sala" ? " past" : "") + (ahoraSi ? " now" : "") + '" data-cita="' + r.id + '"><div class="t">' + hm(r.hora) + "<small>" + (r.duracion || 30) + " min</small></div>" +
      '<div class="w"><b>' + esc(r.paciente_nombre) + "</b><span>" + esc(r.tratamiento) + " · " + esc(r.profesional) + "</span></div>" +
      '<div class="acts">' + stPill(r.estado) + acc + "</div></div>";
  }).join("");
}
function listaCard(t, obj, ordenClave){
  var e = Object.keys(obj || {}).map(function(k){ return [k, obj[k]]; });
  if (!ordenClave) e.sort(function(a, b){ return b[1] - a[1]; });
  var max = Math.max.apply(null, [1].concat(e.map(function(x){ return x[1]; })));
  return '<div class="card"><div class="hd"><h3>' + t + '</h3></div><div class="bd">' + (e.length ? '<div class="hbars">' + e.slice(0, 8).map(function(x){
    return '<div class="hbar"><span class="t">' + esc(x[0]) + "</span><b>" + nfmt(x[1]) + '</b><i style="width:' + Math.max(1, x[1] / max * 100) + '%"></i></div>'; }).join("") + "</div>" : '<p class="count">Sin datos en este periodo.</p>') + "</div></div>";
}
/* Barras verticales de una sola serie con detalle al pasar el mouse y tabla de datos */
function barras(dias, campo, unidad){
  var n = dias.length; if (!n) return '<p class="count">Sin datos.</p>';
  var max = Math.max(1, Math.max.apply(null, dias.map(function(d){ return d[campo] || 0; })));
  var step = Math.pow(10, Math.floor(Math.log10(max))); if (max / step <= 2 && step >= 2) step /= 2; var top = Math.ceil(max / step) * step;
  var W = 600, H = 170, L = 26, B = 20, T = 6, bw = (W - L) / n, gap = Math.min(2, bw * .25);
  var y = function(v){ return T + (H - T - B) * (1 - v / top); };
  var g = "";
  for (var v = 0; v <= top; v += step) g += '<line class="gl" x1="' + L + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "</text>";
  var marcas = dias.map(function(d, i){
    var val = d[campo] || 0, x = L + i * bw + gap / 2, w = Math.max(1, bw - gap), yy = y(val), r = Math.min(4, w / 2, H - B - yy);
    var p = val ? '<path class="bar-p" d="M' + x + "," + (H - B) + "V" + (yy + r) + "Q" + x + "," + yy + " " + (x + r) + "," + yy + "H" + (x + w - r) + "Q" + (x + w) + "," + yy + " " + (x + w) + "," + (yy + r) + "V" + (H - B) + 'Z"/>' : "";
    return '<g class="m" data-tip="' + esc(largo(d.dia) + ": " + nfmt(val) + " " + unidad) + '"><rect x="' + (L + i * bw) + '" y="' + T + '" width="' + bw + '" height="' + (H - T - B) + '" fill="transparent"/>' + p + "</g>";
  }).join("");
  var cada = Math.ceil(n / 7), et = dias.map(function(d, i){ return i % cada === 0 ? '<text class="axis" x="' + (L + i * bw + bw / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + corto(d.dia) + "</text>" : ""; }).join("");
  return '<div class="chart"><svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(unidad + " por día") + '">' + g + marcas + et + "</svg></div>" +
    '<details class="data"><summary>Ver datos</summary><table><tr><th>Día</th><th>' + esc(cap(unidad)) + "</th></tr>" + dias.slice().reverse().map(function(d){ return "<tr><td>" + esc(largo(d.dia)) + "</td><td>" + (d[campo] || 0) + "</td></tr>"; }).join("") + "</table></details>";
}
function activarBarras(root){
  $$("g.m", root).forEach(function(g){
    g.addEventListener("mouseenter", function(){ var r = g.getBoundingClientRect(); tipOn(g.dataset.tip, r.left + r.width / 2, (g.querySelector(".bar-p") || g).getBoundingClientRect().top); });
    g.addEventListener("mouseleave", tipOff);
  });
}

/* =====================================================================
   AGENDA (calendario por profesional, día o semana)
   ===================================================================== */
var AG = { fecha: null, vista: "dia", prof: "todos", anuladas: false };
VISTAS.agenda = function(v, p){
  if (p && p.fecha) AG.fecha = p.fecha;
  if (!AG.fecha) AG.fecha = hoy();
  v.innerHTML = '<div class="cal-tools"><button class="btn sec icon" type="button" data-nav="-1" aria-label="Anterior">' + I("left") + '</button><button class="btn sec" type="button" data-nav="0">Hoy</button><button class="btn sec icon" type="button" data-nav="1" aria-label="Siguiente">' + I("right") + "</button>" +
    '<input type="date" id="ag-fecha" value="' + AG.fecha + '" aria-label="Ir a fecha" style="width:auto">' +
    '<span class="date" id="ag-titulo"></span>' +
    '<div class="seg" role="group" aria-label="Vista"><button type="button" data-vista="dia" aria-pressed="' + (AG.vista === "dia") + '">Día</button><button type="button" data-vista="semana" aria-pressed="' + (AG.vista === "semana") + '">Semana</button></div>' +
    '<select id="ag-prof" aria-label="Profesional" style="width:auto"><option value="todos">Todos los profesionales</option>' + profs().map(function(x){ return '<option value="' + esc(x.id) + '"' + (AG.prof === x.id ? " selected" : "") + ">" + esc(x.nombre) + "</option>"; }).join("") + "</select>" +
    '<label class="check"><input type="checkbox" id="ag-anul"' + (AG.anuladas ? " checked" : "") + "> Ver anuladas</label>" +
    '<span style="margin-left:auto" class="tools"><button class="btn sec" type="button" data-bloquear>' + I("lock") + 'Bloquear</button><button class="btn sec icon" type="button" data-imprimir aria-label="Imprimir" title="Imprimir">' + I("print") + "</button></span></div>" +
    '<div class="legend">' + EST.filter(function(s){ return s.id !== "cancelada"; }).map(function(s){ return '<span><i class="dotc" style="background:' + s.c + '"></i>' + s.t + "</span>"; }).join("") + '<span><i class="dotc" style="background:var(--hatch);border:1px dashed var(--text-4)"></i>Bloqueado / fuera de horario</span></div>' +
    '<div class="cal" id="ag-cal"><div class="skel" style="height:420px;margin:12px"></div></div>';
  v.onclick = function(ev){
    var b;
    if ((b = ev.target.closest("[data-nav]"))) { var n = +b.dataset.nav; AG.fecha = n === 0 ? hoy() : mas(AG.fecha, n * (AG.vista === "semana" ? 7 : 1)); $("#ag-fecha").value = AG.fecha; return cargarAgenda(); }
    if ((b = ev.target.closest("[data-vista]"))) { AG.vista = b.dataset.vista; $$("[data-vista]", v).forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); }); return cargarAgenda(); }
    if (ev.target.closest("[data-imprimir]")) return window.print();
    if (ev.target.closest("[data-bloquear]")) return ir("bloqueos", { nuevo: { fecha: AG.fecha, prof: AG.prof !== "todos" ? AG.prof : "" } });
    if ((b = ev.target.closest(".appt"))) return verCita(b.dataset.id);
    if ((b = ev.target.closest(".cal-blk"))) return ir("bloqueos");
    if ((b = ev.target.closest(".cal-free"))) return nuevaCita({ fecha: b.dataset.f, hora: b.dataset.h, prof: b.dataset.p });
  };
  v.onchange = function(ev){
    if (ev.target.id === "ag-fecha" && ev.target.value) { AG.fecha = ev.target.value; cargarAgenda(); }
    if (ev.target.id === "ag-prof") { AG.prof = ev.target.value; cargarAgenda(); }
    if (ev.target.id === "ag-anul") { AG.anuladas = ev.target.checked; cargarAgenda(); }
  };
  cargarAgenda();
};
VISTAS.agenda.refrescar = function(){ cargarAgenda(true); };
function lunes(iso){ var d = dow(iso); return mas(iso, d === 0 ? -6 : 1 - d); }
function cargarAgenda(silencio){
  var dias = AG.vista === "semana" ? [0, 1, 2, 3, 4, 5, 6].map(function(i){ return mas(lunes(AG.fecha), i); }) : [AG.fecha];
  var ps = AG.prof === "todos" ? profs() : profs(true).filter(function(p){ return p.id === AG.prof; });
  if (AG.vista === "semana") dias = dias.filter(function(d){ return dow(d) !== 0 || ps.some(function(p){ return bloqueProf(p, d); }) || d === AG.fecha; });
  $("#ag-titulo").textContent = AG.vista === "semana" ? "Semana del " + corto(dias[0]) + " al " + corto(dias[dias.length - 1]) : largo(AG.fecha);
  Promise.all([cargarReservas(dias[0], dias[dias.length - 1]), cargarBloqueos(dias[0], dias[dias.length - 1])]).then(function(rs){
    pintarCal(dias, ps, rs[0].filter(function(r){ return AG.anuladas || r.estado !== "cancelada"; }), rs[1]);
  }).catch(function(e){ if (!silencio) $("#ag-cal").innerHTML = '<p class="msg bad" style="margin:12px">' + esc(errorTxt(e)) + "</p>"; });
}
function pintarCal(dias, ps, res, bloq){
  var paso = reglas().intervalo, PPM = 1.4, lineas = paso <= 20 ? paso : 30;
  var minIni = 24 * 60, maxFin = 0;
  dias.forEach(function(d){ (ps.length ? ps : [null]).forEach(function(p){ var b = p ? bloqueProf(p, d) : bloqueEn(CFG.horario, d); if (b) { minIni = Math.min(minIni, aMin(b.abre)); maxFin = Math.max(maxFin, aMin(b.cierra)); } }); });
  res.forEach(function(r){ minIni = Math.min(minIni, aMin(r.hora)); maxFin = Math.max(maxFin, aMin(r.hora) + (r.duracion || 30)); });
  if (minIni >= maxFin) { minIni = 9 * 60; maxFin = 18 * 60; }
  minIni = Math.floor(minIni / 60) * 60; maxFin = Math.ceil(maxFin / 60) * 60;
  var alto = (maxFin - minIni) * PPM, y = function(m){ return (m - minIni) * PPM; };
  var cols = [];
  if (AG.vista === "dia") ps.forEach(function(p){ cols.push({ d: dias[0], p: p }); });
  else dias.forEach(function(d){ cols.push({ d: d, p: ps.length === 1 ? ps[0] : null, todos: ps.length !== 1 }); });
  if (!cols.length) { $("#ag-cal").innerHTML = '<div class="empty">' + I("users") + "<b>No hay profesionales activos</b><span>Agréguelos en Página web → Profesionales.</span></div>"; return; }
  var t = ahora(), anchoCol = AG.vista === "dia" ? "minmax(180px,1fr)" : "minmax(120px,1fr)";
  var html = '<div class="cal-grid" style="--slot:' + (lineas * PPM) + "px;grid-template-columns:56px repeat(" + cols.length + "," + anchoCol + ')">';
  html += '<div class="cal-corner"></div>' + cols.map(function(c){
    var tit = AG.vista === "dia" ? '<i class="dotc" style="background:' + colorProf(c.p.id) + '"></i><span>' + esc(c.p.nombre) + "<small>" + esc(c.p.especialidad || "") + "</small></span>"
      : "<span>" + medio(c.d) + "<small>" + res.filter(function(r){ return r.fecha === c.d && r.estado !== "cancelada" && (!c.p || r.profesional_id === c.p.id); }).length + " citas</small></span>";
    return '<div class="cal-h' + (c.d === t.iso && AG.vista === "semana" ? " today" : "") + '">' + tit + "</div>";
  }).join("");
  var horas = ""; for (var m = minIni; m < maxFin; m += lineas) horas += "<div>" + (m % 60 === 0 ? aHora(m) : "") + "</div>";
  html += '<div class="cal-times" style="height:' + alto + 'px">' + horas + "</div>";
  cols.forEach(function(c){
    var inner = "", lista = c.todos ? ps : [c.p];
    /* Zonas fuera de horario: si hay varios profesionales en la columna, se usa el horario de la clínica */
    var b = c.todos ? bloqueEn(CFG.horario, c.d) : bloqueProf(c.p, c.d);
    if (!b) inner += '<div class="cal-off" style="top:0;height:' + alto + 'px"></div>';
    else {
      if (aMin(b.abre) > minIni) inner += '<div class="cal-off" style="top:0;height:' + y(aMin(b.abre)) + 'px"></div>';
      if (aMin(b.cierra) < maxFin) inner += '<div class="cal-off" style="top:' + y(aMin(b.cierra)) + "px;height:" + (alto - y(aMin(b.cierra))) + 'px"></div>';
      if (b.pausa && b.pausa[0] && b.pausa[1]) inner += '<div class="cal-off" style="top:' + y(aMin(b.pausa[0])) + "px;height:" + (aMin(b.pausa[1]) - aMin(b.pausa[0])) * PPM + 'px"></div>';
      /* Huecos libres: clic para crear una cita ahí */
      for (var mm = aMin(b.abre); mm + paso <= aMin(b.cierra); mm += paso) {
        if (b.pausa && mm >= aMin(b.pausa[0]) && mm < aMin(b.pausa[1])) continue;
        inner += '<div class="cal-free" style="top:' + y(mm) + "px;height:" + paso * PPM + 'px" data-f="' + c.d + '" data-h="' + aHora(mm) + '" data-p="' + (c.todos ? "" : c.p.id) + '" title="Nueva cita ' + aHora(mm) + '"></div>';
      }
    }
    bloq.filter(function(x){ return (!x.profesional_id || c.todos || x.profesional_id === c.p.id) && x.i.slice(0, 10) <= c.d && x.f.slice(0, 10) >= c.d; }).forEach(function(x){
      var i0 = x.i.slice(0, 10) < c.d ? minIni : Math.max(minIni, aMin(x.i.slice(11))), f0 = x.f.slice(0, 10) > c.d ? maxFin : Math.min(maxFin, aMin(x.f.slice(11)));
      if (f0 > i0) inner += '<div class="cal-blk" style="top:' + y(i0) + "px;height:" + (f0 - i0) * PPM + 'px" title="' + esc(x.motivo || "Bloqueado") + '">' + I("lock") + " " + esc(x.motivo || "Bloqueado") + (x.profesional_id && c.todos ? " · " + esc((profPorId(x.profesional_id) || {}).nombre || "") : "") + "</div>";
    });
    /* Citas: si se superponen en una columna compartida, se reparten en carriles */
    var cs = res.filter(function(r){ return r.fecha === c.d && lista.some(function(p){ return p.id === r.profesional_id; }); }).sort(function(a, z){ return aMin(a.hora) - aMin(z.hora); });
    var carriles = [];
    cs.forEach(function(r){ var ini = aMin(r.hora), k = 0; while (carriles[k] && carriles[k] > ini) k++; carriles[k] = ini + (r.duracion || 30); r._k = k; });
    var nk = Math.max(1, carriles.length);
    cs.forEach(function(r){
      var ini = aMin(r.hora), d = r.duracion || 30, h = Math.max(22, d * PPM - 2), w = 100 / nk;
      inner += '<div class="appt ' + r.estado + '" data-id="' + r.id + '" tabindex="0" role="button" style="top:' + (y(ini) + 1) + "px;height:" + h + "px;--pc:" + colorProf(r.profesional_id) + ";left:calc(" + (r._k * w) + "% + 3px);right:auto;width:calc(" + w + '% - 6px)" title="' + esc(hm(r.hora) + " " + r.paciente_nombre + " · " + r.tratamiento + " · " + estNom(r.estado)) + '">' +
        "<b>" + hm(r.hora) + " " + esc(r.paciente_nombre) + "</b>" + (h > 34 ? "<span>" + esc(estNom(r.estado)) + " · " + esc(r.tratamiento) + (c.todos && AG.vista === "semana" ? " · " + esc(r.profesional) : "") + "</span>" : "") + "</div>";
    });
    if (c.d === t.iso && t.min >= minIni && t.min <= maxFin) inner += '<div class="now-line" style="top:' + y(t.min) + 'px"></div>';
    html += '<div class="cal-col" style="height:' + alto + 'px">' + inner + "</div>";
  });
  html += "</div>";
  var cal = $("#ag-cal"), sc = cal.scrollTop;
  cal.innerHTML = html;
  if (sc) cal.scrollTop = sc;
  else if (AG.fecha === t.iso && t.min > minIni) cal.scrollTop = Math.max(0, y(t.min) - 120);
}
$("#vista").addEventListener("keydown", function(ev){ if ((ev.key === "Enter" || ev.key === " ") && ev.target.classList.contains("appt")) { ev.preventDefault(); verCita(ev.target.dataset.id); } });

/* =====================================================================
   RESERVAS (lista con filtros)
   ===================================================================== */
var RF = { preset: "proximos7", desde: "", hasta: "", estado: "activas", prof: "", origen: "", q: "" }, RFILAS = [];
var PRESETS = [["hoy", "Hoy"], ["manana", "Mañana"], ["proximos7", "Próximos 7 días"], ["proximos30", "Próximos 30 días"], ["pendientes", "Por confirmar"], ["web24", "Reservas web (24 h)"],
  ["pasados30", "Últimos 30 días"], ["mes", "Este mes"], ["todo", "Todo"], ["rango", "Elegir fechas…"]];
function rangoPreset(p){
  var t = hoy();
  switch (p) {
    case "hoy": return [t, t]; case "manana": return [mas(t, 1), mas(t, 1)]; case "proximos7": return [t, mas(t, 6)]; case "proximos30": return [t, mas(t, 29)];
    case "pendientes": return [t, mas(t, 365)]; case "web24": return ["2000-01-01", "2100-01-01"]; case "pasados30": return [mas(t, -30), mas(t, -1)];
    case "mes": return [t.slice(0, 8) + "01", mas(t.slice(0, 8) + "01", 40).slice(0, 8) + "01"]; case "todo": return ["2000-01-01", "2100-01-01"];
    default: return [RF.desde || t, RF.hasta || mas(t, 30)];
  }
}
VISTAS.reservas = function(v, p){
  if (p && p.preset) { RF.preset = p.preset; RF.estado = p.preset === "pendientes" ? "pendiente" : p.preset === "web24" ? "todos" : RF.estado; RF.origen = p.preset === "web24" ? "web" : RF.origen; }
  v.innerHTML = '<div class="head"><div><h2>Reservas</h2><p>Busque, filtre y cambie el estado de las citas.</p></div><div class="tools"><button class="btn sec" type="button" data-csv>' + I("down") + "Descargar Excel</button></div></div>" +
    '<div class="filters"><select id="rf-preset" aria-label="Fechas">' + PRESETS.map(function(x){ return '<option value="' + x[0] + '"' + (RF.preset === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select>" +
    '<input type="date" id="rf-desde" aria-label="Desde" value="' + esc(RF.desde) + '"' + (RF.preset === "rango" ? "" : " hidden") + '><input type="date" id="rf-hasta" aria-label="Hasta" value="' + esc(RF.hasta) + '"' + (RF.preset === "rango" ? "" : " hidden") + ">" +
    '<select id="rf-estado" aria-label="Estado"><option value="activas">Reservadas, confirmadas y en sala</option><option value="todos">Todos los estados</option>' + EST.map(function(s){ return '<option value="' + s.id + '">' + s.t + "</option>"; }).join("") + "</select>" +
    '<select id="rf-prof" aria-label="Profesional"><option value="">Todos los profesionales</option>' + profs(true).map(function(x){ return '<option value="' + esc(x.id) + '">' + esc(x.nombre) + "</option>"; }).join("") + "</select>" +
    '<select id="rf-origen" aria-label="Origen"><option value="">Web y panel</option><option value="web">Solo página web</option><option value="panel">Solo panel</option></select>' +
    '<input type="search" id="rf-q" placeholder="Buscar nombre, RUT, código o teléfono" aria-label="Buscar" value="' + esc(RF.q) + '"></div>' +
    '<div class="card"><div class="hd"><span class="count" id="rf-cuenta">Cargando…</span></div><div class="bd flush tbl-wrap" id="rf-tabla"></div></div>';
  $("#rf-estado").value = RF.estado; $("#rf-prof").value = RF.prof; $("#rf-origen").value = RF.origen;
  v.onchange = function(ev){
    var id = ev.target.id;
    if (id === "rf-preset") { RF.preset = ev.target.value; $("#rf-desde").hidden = $("#rf-hasta").hidden = RF.preset !== "rango"; if (RF.preset === "pendientes") { RF.estado = "pendiente"; $("#rf-estado").value = "pendiente"; } }
    if (id === "rf-desde") RF.desde = ev.target.value; if (id === "rf-hasta") RF.hasta = ev.target.value;
    if (id === "rf-estado") RF.estado = ev.target.value; if (id === "rf-prof") RF.prof = ev.target.value; if (id === "rf-origen") RF.origen = ev.target.value;
    if (id !== "rf-q") cargarRes();
  };
  v.oninput = function(ev){ if (ev.target.id === "rf-q") { RF.q = ev.target.value; tablaRes(); } };
  v.onclick = function(ev){
    if (ev.target.closest("[data-csv]")) return csv("reservas-" + hoy() + ".csv", filtrarRes(), [["fecha", "Fecha"], ["hora", "Hora"], ["duracion", "Minutos"], ["codigo", "Código"], ["paciente_nombre", "Paciente"], ["paciente_doc_tipo", "Documento"], ["paciente_doc", "N° documento"], ["prevision", "Previsión"], ["telefono", "Teléfono"], ["correo", "Correo"], ["tratamiento", "Tratamiento"], ["profesional", "Profesional"], ["estado", "Estado"], ["origen", "Origen"], ["notas", "Notas"], ["creada", "Reservada el"]]);
    if (ev.target.closest("a")) return;
    var row = ev.target.closest("[data-cita]"); if (row) verCita(row.dataset.cita);
  };
  cargarRes();
};
VISTAS.reservas.refrescar = function(){ cargarRes(true); };
function cargarRes(){
  var r = rangoPreset(RF.preset);
  cargarReservas(r[0], r[1], function(x){
    if (RF.estado === "activas") x = x.in("estado", ["pendiente", "confirmada", "en_sala"]); else if (RF.estado !== "todos") x = x.eq("estado", RF.estado);
    if (RF.prof) x = x.eq("profesional_id", RF.prof);
    if (RF.origen) x = x.eq("origen", RF.origen);
    if (RF.preset === "web24") x = x.gte("creada", new Date(Date.now() - 864e5).toISOString());
    return x;
  }).then(function(d){
    RFILAS = ["pasados30", "todo"].indexOf(RF.preset) >= 0 ? d.reverse() : d; tablaRes();
  }).catch(function(e){ $("#rf-tabla").innerHTML = '<p class="msg bad" style="margin:12px">' + esc(errorTxt(e)) + "</p>"; });
}
function filtrarRes(){
  var s = RF.q.trim().toLowerCase(), sd = s.replace(/[^0-9k]/g, "");
  return RFILAS.filter(function(x){
    if (!s) return true;
    return (x.paciente_nombre || "").toLowerCase().indexOf(s) >= 0 || (x.codigo || "").toLowerCase() === s || (x.codigo || "").toLowerCase().indexOf(s) === 0 ||
      (sd.length >= 3 && ((x.paciente_doc || "").toLowerCase().indexOf(sd) >= 0 || (x.telefono || "").replace(/\D/g, "").indexOf(sd) >= 0));
  });
}
function tablaRes(){
  var f = filtrarRes(), el = $("#rf-tabla"); if (!el) return;
  $("#rf-cuenta").textContent = nfmt(f.length) + (f.length === 1 ? " cita" : " citas");
  if (!f.length) { el.innerHTML = '<div class="empty">' + I("search") + "<b>No hay citas con estos filtros</b><span>Pruebe con otras fechas o estados.</span></div>"; return; }
  var dia = "", html = '<table class="tbl cards"><thead><tr><th>Hora</th><th>Paciente</th><th>Atención</th><th>Contacto</th><th>Estado</th></tr></thead><tbody>';
  f.slice(0, 600).forEach(function(x){
    if (x.fecha !== dia) { dia = x.fecha; html += '<tr class="grp"><td colspan="5">' + largo(dia) + "</td></tr>"; }
    html += '<tr data-cita="' + x.id + '"><td><b class="num">' + hm(x.hora) + '</b><span class="sub">' + (x.duracion || 30) + " min · " + esc(x.codigo) + "</span></td>" +
      "<td><b>" + esc(x.paciente_nombre) + '</b><span class="sub">' + esc(docTxt(x)) + (x.prevision ? " · " + esc(x.prevision) : "") + "</span></td>" +
      "<td>" + esc(x.tratamiento) + '<span class="sub"><i class="dotc" style="background:' + colorProf(x.profesional_id) + ';width:7px;height:7px"></i> ' + esc(x.profesional) + "</span></td>" +
      '<td><a href="' + esc(waLink(x, "")) + '" target="_blank" rel="noopener">' + esc(x.telefono) + "</a>" + (x.correo ? '<span class="sub">' + esc(x.correo) + "</span>" : "") + "</td>" +
      "<td>" + stPill(x.estado) + (x.origen === "panel" ? ' <span class="tag">Panel</span>' : "") + "</td></tr>";
  });
  el.innerHTML = html + "</tbody></table>" + (f.length > 600 ? '<p class="count" style="padding:10px 14px">Mostrando 600 de ' + nfmt(f.length) + ". Use los filtros o descargue el Excel.</p>" : "");
}
function csv(nombre, filas, cols){
  var celda = function(v){ v = v == null ? "" : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  var txt = "﻿" + cols.map(function(c){ return celda(c[1]); }).join(";") + "\n" + filas.map(function(x){ return cols.map(function(c){ var v = x[c[0]]; if (c[0] === "estado") v = estNom(v); if (c[0] === "hora") v = hm(v); return celda(v); }).join(";"); }).join("\n");
  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" })); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
  toast("Descargado: " + esc(nombre));
}
A.csv = csv;

/* =====================================================================
   DETALLE DE CITA (panel lateral)
   ===================================================================== */
function verCita(id){
  q("reservas").select("*").eq("id", id).single().then(function(x){
    if (x.error || !x.data) return toast("No se encontró la cita.", { tipo: "bad" });
    pintarCita(x.data);
  });
}
A.verCita = verCita;
function pintarCita(r){
  var fin = aMin(r.hora) + (r.duracion || 30);
  var d = abrirDrawer(drawerHead("Cita", '<span class="tag num">' + esc(r.codigo) + "</span>") +
    '<div class="db">' +
    '<div class="sect"><h4>Estado</h4><div class="stset" role="group" aria-label="Estado">' + EST.map(function(s){ return '<button type="button" data-est="' + s.id + '" style="--c:' + s.c + '" aria-pressed="' + (r.estado === s.id) + '">' + s.t + "</button>"; }).join("") + "</div></div>" +
    '<div class="sect"><h4>Cuándo</h4><p style="font-family:var(--display);font-size:18px;font-weight:700">' + largo(r.fecha) + " · " + hm(r.hora) + "–" + aHora(fin) + "</p><p>" + esc(r.tratamiento) + ' con <i class="dotc" style="background:' + colorProf(r.profesional_id) + '"></i> ' + esc(r.profesional) + " · " + (r.duracion || 30) + " min</p></div>" +
    '<div class="sect"><h4>Paciente</h4><dl class="kv"><dt>Nombre</dt><dd>' + esc(r.paciente_nombre) + "</dd><dt>Documento</dt><dd>" + esc(docTxt(r)) + "</dd><dt>Previsión</dt><dd>" + esc(r.prevision || "—") + "</dd>" +
    '<dt>Teléfono</dt><dd><a href="tel:' + esc(r.telefono) + '">' + esc(r.telefono) + "</a></dd><dt>Correo</dt><dd>" + (r.correo ? '<a href="mailto:' + esc(r.correo) + '">' + esc(r.correo) + "</a>" : "—") + "</dd></dl>" +
    '<div class="tools"><button class="btn sm sec" type="button" data-ficha>' + I("user") + "Ver ficha del paciente</button></div></div>" +
    '<div class="sect"><h4>WhatsApp</h4><div class="tools"><a class="btn sm sec" target="_blank" rel="noopener" href="' + esc(waLink(r, "confirmar")) + '">' + I("wa") + 'Pedir confirmación</a><a class="btn sm sec" target="_blank" rel="noopener" href="' + esc(waLink(r, "recordatorio")) + '">' + I("clock") + 'Recordatorio</a><a class="btn sm ghost" target="_blank" rel="noopener" href="' + esc(waLink(r, "")) + '">Escribir</a></div></div>' +
    '<div class="sect"><h4>Notas internas</h4><textarea id="c-notas" placeholder="Solo las ve la clínica: alergias, indicaciones, observaciones…">' + esc(r.notas || "") + '</textarea><small class="help" id="c-notas-st">Se guarda al salir del campo.</small></div>' +
    '<div class="sect"><h4>Historial</h4><div class="timeline" id="c-hist"><div>Reservada ' + (r.origen === "panel" ? "desde el panel" : "en la página web") + "<small>" + new Date(r.creada).toLocaleString("es-CL") + "</small></div></div></div>" +
    "</div>" +
    '<div class="df">' + (r.estado !== "cancelada" ? '<button class="btn ghost" type="button" data-anular style="margin-right:auto;color:var(--bad)">' + I("trash") + "Anular</button>" : "") + '<button class="btn sec" type="button" data-editar>' + I("edit") + "Reagendar o editar</button></div>");
  q("historial").select("*").eq("detalle->>codigo", r.codigo).order("creada").then(function(x){
    if (x.error || !x.data || !x.data.length) return;
    $("#c-hist").innerHTML = x.data.map(function(h){ return "<div>" + esc(frase(h, true)) + "<small>" + esc(h.usuario || "") + " · " + new Date(h.creada).toLocaleString("es-CL") + "</small></div>"; }).join("");
  });
  d.onclick = function(ev){
    var b = ev.target.closest("[data-est]");
    if (b && b.dataset.est !== r.estado) { cambiarEstado(r, b.dataset.est).then(function(){ $$("[data-est]", d).forEach(function(x){ x.setAttribute("aria-pressed", String(x.dataset.est === r.estado)); }); refrescar(); }).catch(function(){}); return; }
    if (ev.target.closest("[data-editar]")) return editarCita(r);
    if (ev.target.closest("[data-ficha]")) return verPaciente(r.paciente_doc_tipo, r.paciente_doc);
    if (ev.target.closest("[data-anular]")) { if (confirm("¿Anular la cita de " + r.paciente_nombre + "? La hora queda libre.")) cambiarEstado(r, "cancelada").then(function(){ cerrarDrawer(); refrescar(); }).catch(function(){}); }
  };
  $("#c-notas", d).addEventListener("change", function(ev){
    var val = ev.target.value; $("#c-notas-st").textContent = "Guardando…";
    q("reservas").update({ notas: val || null }).eq("id", r.id).then(function(x){ if (x.error) { $("#c-notas-st").textContent = errorTxt(x.error); return; } r.notas = val; $("#c-notas-st").textContent = "Nota guardada."; });
  });
}

/* ---------- Crear / editar cita ---------- */
function nuevaCita(pre){ editarCita(null, pre || {}); }
A.nuevaCita = nuevaCita;
function editarCita(r, pre){
  pre = pre || {};
  var nueva = !r, tr0 = trats()[0] || {};
  var F = nueva ? {
    doc_tipo: pre.doc_tipo || "rut", doc: pre.doc ? (pre.doc_tipo === "pasaporte" ? pre.doc : rutFmt(pre.doc)) : "", nombre: pre.nombre || "", telefono: pre.telefono || "", correo: pre.correo || "", prevision: pre.prevision || "",
    trat: pre.trat || (pre.prof ? ((profPorId(pre.prof) || {}).tratamientos || [])[0] : null) || tr0.id, prof: pre.prof || "", fecha: pre.fecha || hoy(), hora: pre.hora || "", estado: "confirmada", notas: ""
  } : {
    doc_tipo: r.paciente_doc_tipo, doc: r.paciente_doc_tipo === "rut" ? rutFmt(r.paciente_doc) : r.paciente_doc, nombre: r.paciente_nombre, telefono: r.telefono, correo: r.correo || "", prevision: r.prevision || "",
    trat: r.tratamiento_id, prof: r.profesional_id, fecha: r.fecha, hora: hm(r.hora), estado: r.estado, notas: r.notas || "", duracion: r.duracion
  };
  if (!F.duracion) F.duracion = durTrat(tratPorId(F.trat));
  if (!F.prof) { var cand = profs().filter(function(p){ return (p.tratamientos || []).indexOf(F.trat) >= 0; }); F.prof = (cand[0] || profs()[0] || {}).id || ""; }
  var OCU = [], BLQ = [], todosProf = false;
  var d = abrirDrawer(drawerHead(nueva ? "Nueva cita" : "Reagendar o editar") +
    '<form class="db" id="fc" novalidate>' +
    '<div class="sect"><h4>Paciente</h4>' + (nueva ? '<div class="field"><span>Buscar paciente existente</span><input type="search" id="fc-buscar" placeholder="Nombre, RUT o teléfono" autocomplete="off" autofocus><div id="fc-sug"></div></div>' : "") +
    '<div class="row2"><label class="field"><span>Documento</span><select id="fc-doc_tipo"><option value="rut">RUT</option><option value="pasaporte">Pasaporte</option></select></label><label class="field"><span id="fc-doc-l">N° de documento</span><input type="text" id="fc-doc" autocomplete="off"><span class="err" id="fc-doc-e" hidden></span></label></div>' +
    '<label class="field"><span>Nombre y apellido</span><input type="text" id="fc-nombre" autocomplete="off"><span class="err" id="fc-nombre-e" hidden></span></label>' +
    '<div class="row2"><label class="field"><span>Teléfono</span><input type="tel" id="fc-telefono" inputmode="tel" placeholder="+56 9 1234 5678"><span class="err" id="fc-telefono-e" hidden></span></label><label class="field"><span>Correo (opcional)</span><input type="email" id="fc-correo"></label></div>' +
    '<label class="field"><span>Previsión</span><select id="fc-prevision"><option value="">Sin dato</option><option>Fonasa</option><option>Isapre</option><option>Particular</option></select></label></div>' +
    '<div class="sect"><h4>Cita</h4><div class="row2"><label class="field"><span>Tratamiento</span><select id="fc-trat"></select></label><label class="field"><span>Duración</span><select id="fc-duracion"></select></label></div>' +
    '<label class="field"><span>Profesional</span><select id="fc-prof"></select><label class="check" style="margin-top:4px"><input type="checkbox" id="fc-todos"> Mostrar profesionales que no hacen este tratamiento</label></label>' +
    '<label class="field"><span>Fecha</span><input type="date" id="fc-fecha"></label>' +
    '<div class="field"><span>Hora disponible</span><div class="slots" id="fc-slots" role="group" aria-label="Horas disponibles"></div><span class="help">¿Otra hora? <input type="time" id="fc-hora" step="300" style="width:auto;min-height:30px;display:inline-block"> (sobrecupo: se avisa si se cruza)</span><span class="err" id="fc-hora-e" hidden></span></div>' +
    (nueva ? '<label class="field"><span>Estado inicial</span><select id="fc-estado"><option value="confirmada">Confirmada</option><option value="pendiente">Reservada (por confirmar)</option></select></label>' : "") +
    '<label class="field"><span>Notas internas</span><textarea id="fc-notas" placeholder="Opcional"></textarea></label></div>' +
    '<p class="msg bad" id="fc-err" role="alert" hidden></p></form>' +
    '<div class="df"><button class="btn sec" type="button" data-cerrar>Cancelar</button><button class="btn" type="button" id="fc-ok">' + (nueva ? "Crear cita" : "Guardar cambios") + "</button></div>");
  var set = function(k){ var el = $("#fc-" + k, d); if (el) el.value = F[k] == null ? "" : F[k]; };
  ["doc_tipo", "doc", "nombre", "telefono", "correo", "prevision", "fecha", "notas", "estado"].forEach(set);
  function opcTrat(){ var ts = trats(true).filter(function(t){ return t.activo !== false || t.id === F.trat; }); $("#fc-trat", d).innerHTML = ts.map(function(t){ return '<option value="' + esc(t.id) + '">' + esc(t.nombre) + "</option>"; }).join(""); $("#fc-trat", d).value = F.trat; }
  function opcDur(){ var o = [10, 15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180]; if (o.indexOf(+F.duracion) < 0) o.push(+F.duracion); o.sort(function(a, b){ return a - b; }); $("#fc-duracion", d).innerHTML = o.map(function(m){ return '<option value="' + m + '">' + m + " min</option>"; }).join(""); $("#fc-duracion", d).value = F.duracion; }
  function opcProf(){
    var ps = profs(true).filter(function(p){ return (p.activo !== false && (todosProf || (p.tratamientos || []).indexOf(F.trat) >= 0)) || p.id === F.prof; });
    $("#fc-prof", d).innerHTML = ps.map(function(p){ return '<option value="' + esc(p.id) + '">' + esc(p.nombre) + (p.activo === false ? " (inactivo)" : "") + "</option>"; }).join("") || '<option value="">Nadie hace este tratamiento</option>';
    if (!ps.some(function(p){ return p.id === F.prof; })) F.prof = (ps[0] || {}).id || "";
    $("#fc-prof", d).value = F.prof;
  }
  function libreAdm(m){
    var fin = m + (+F.duracion), t = ahora();
    if (OCU.some(function(o){ return o.i < fin && o.t > m; })) return false;
    var a = F.fecha + "T" + aHora(m), z = F.fecha + "T" + aHora(Math.min(fin, 1439));
    if (BLQ.some(function(b){ return (!b.profesional_id || b.profesional_id === F.prof) && b.i < z && b.f > a; })) return false;
    return !(F.fecha === t.iso && m < t.min);
  }
  function horas(){
    var p = profPorId(F.prof), b = bloqueProf(p, F.fecha), paso = reglas().intervalo, out = [];
    if (b) for (var m = aMin(b.abre); m + (+F.duracion) <= aMin(b.cierra); m += paso) {
      if (b.pausa && b.pausa[0] && m < aMin(b.pausa[1]) && m + (+F.duracion) > aMin(b.pausa[0])) continue;
      if (libreAdm(m)) out.push(aHora(m));
    }
    var el = $("#fc-slots", d);
    if (!p) { el.innerHTML = '<span class="help">Elija un profesional.</span>'; return; }
    el.innerHTML = out.length ? out.map(function(h){ return '<button type="button" data-h="' + h + '" aria-pressed="' + (F.hora === h) + '">' + h + "</button>"; }).join("") : '<span class="help">' + (b ? "No quedan horas libres este día." : "No atiende este día.") + "</span>";
    $("#fc-hora", d).value = F.hora && out.indexOf(F.hora) < 0 ? F.hora : "";
  }
  function cargarDia(){
    if (!F.prof || !F.fecha) return horas();
    $("#fc-slots", d).innerHTML = '<div class="skel" style="height:32px;width:100%"></div>';
    Promise.all([cargarReservas(F.fecha, F.fecha, function(x){ return x.eq("profesional_id", F.prof).neq("estado", "cancelada"); }), cargarBloqueos(F.fecha, F.fecha)]).then(function(rs){
      OCU = rs[0].filter(function(o){ return !r || o.id !== r.id; }).map(function(o){ var i = aMin(o.hora); return { i: i, t: i + (o.duracion || 30) }; });
      BLQ = rs[1]; horas();
    }).catch(function(){ OCU = []; BLQ = []; horas(); });
  }
  function docLbl(){ $("#fc-doc-l", d).textContent = F.doc_tipo === "rut" ? "RUT" : "N° de pasaporte"; $("#fc-doc", d).placeholder = F.doc_tipo === "rut" ? "12.345.678-9" : ""; }
  opcTrat(); opcDur(); opcProf(); docLbl(); cargarDia();
  d.oninput = function(ev){
    var id = (ev.target.id || "").replace("fc-", "");
    if (["doc", "nombre", "telefono", "correo", "notas", "prevision", "estado"].indexOf(id) >= 0) F[id] = ev.target.value;
    if (id === "buscar") buscarPac(ev.target.value);
  };
  d.onchange = function(ev){
    var id = (ev.target.id || "").replace("fc-", "");
    if (id === "doc_tipo") { F.doc_tipo = ev.target.value; docLbl(); }
    if (id === "doc" && F.doc_tipo === "rut" && rutValido(F.doc)) { F.doc = rutFmt(F.doc); ev.target.value = F.doc; }
    if (id === "trat") { F.trat = ev.target.value; F.duracion = durTrat(tratPorId(F.trat)); opcDur(); opcProf(); F.hora = ""; cargarDia(); }
    if (id === "duracion") { F.duracion = +ev.target.value; F.hora = ""; horas(); }
    if (id === "prof") { F.prof = ev.target.value; F.hora = ""; cargarDia(); }
    if (id === "todos") { todosProf = ev.target.checked; opcProf(); }
    if (id === "fecha") { F.fecha = ev.target.value; F.hora = ""; cargarDia(); }
    if (id === "hora") { F.hora = ev.target.value; $$("#fc-slots [data-h]", d).forEach(function(x){ x.setAttribute("aria-pressed", "false"); }); }
  };
  d.onclick = function(ev){
    var b = ev.target.closest("[data-h]");
    if (b) { F.hora = b.dataset.h; $$("#fc-slots [data-h]", d).forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); }); $("#fc-hora", d).value = ""; return; }
    var s = ev.target.closest("[data-pac]");
    if (s) {
      var p = SUG[+s.dataset.pac];
      F.doc_tipo = p.doc_tipo; F.doc = p.doc_tipo === "rut" ? rutFmt(p.doc) : p.doc; F.nombre = p.nombre; F.telefono = p.telefono || ""; F.correo = p.correo || ""; F.prevision = p.prevision || "";
      ["doc_tipo", "doc", "nombre", "telefono", "correo", "prevision"].forEach(set); docLbl(); $("#fc-sug", d).innerHTML = ""; $("#fc-buscar", d).value = ""; return;
    }
    if (ev.target.closest("[data-cerrar]")) cerrarDrawer();
  };
  var SUG = [];
  var buscarPac = debounce(function(t){
    if (t.trim().length < 2) { $("#fc-sug", d).innerHTML = ""; return; }
    DB.rpc("pacientes", { q: t.trim(), lim: 6 }).then(function(x){
      SUG = x.data || [];
      $("#fc-sug", d).innerHTML = SUG.length ? '<div class="suggest">' + SUG.map(function(p, i){ return '<button type="button" data-pac="' + i + '"><b>' + esc(p.nombre) + "</b> <small>" + esc(docTxt(p)) + " · " + esc(p.telefono || "") + " · " + p.total + " citas</small></button>"; }).join("") + "</div>" : '<p class="help">Sin resultados: complete los datos como paciente nuevo.</p>';
    });
  }, 250);
  $("#fc-ok", d).addEventListener("click", function(){
    var e = {}, tel = String(F.telefono || "").replace(/\D/g, "");
    if (F.doc_tipo === "rut" && !rutValido(F.doc)) e.doc = F.doc ? "El RUT no es válido." : "Escriba el RUT.";
    if (F.doc_tipo === "pasaporte" && String(F.doc).replace(/\s/g, "").length < 5) e.doc = "Escriba el pasaporte.";
    if (String(F.nombre).trim().length < 3) e.nombre = "Escriba nombre y apellido.";
    if (tel.length < 8 || tel.length > 12) e.telefono = "Teléfono no válido.";
    if (!F.hora) e.hora = "Elija una hora.";
    ["doc", "nombre", "telefono", "hora"].forEach(function(k){ var x = $("#fc-" + k + "-e", d); x.hidden = !e[k]; x.textContent = e[k] || ""; var inp = $("#fc-" + k, d); if (inp) inp.setAttribute("aria-invalid", String(!!e[k])); });
    if (Object.keys(e).length) return;
    var p = profPorId(F.prof), t = tratPorId(F.trat);
    if (!p || !t) { $("#fc-err", d).hidden = false; $("#fc-err", d).textContent = "Elija tratamiento y profesional."; return; }
    var fila = {
      fecha: F.fecha, hora: F.hora, duracion: +F.duracion, profesional_id: p.id, profesional: p.nombre, tratamiento_id: t.id, tratamiento: t.nombre,
      paciente_nombre: String(F.nombre).trim(), paciente_doc_tipo: F.doc_tipo, paciente_doc: F.doc_tipo === "rut" ? rutLimpio(F.doc) : String(F.doc).replace(/\s/g, "").toUpperCase(),
      prevision: F.prevision || null, telefono: String(F.telefono).trim(), correo: String(F.correo || "").trim() || null, notas: String(F.notas || "").trim() || null
    };
    if (nueva) { fila.origen = "panel"; fila.estado = F.estado || "confirmada"; }
    var b = $("#fc-ok", d); b.setAttribute("aria-busy", "true"); b.textContent = "Guardando…"; $("#fc-err", d).hidden = true;
    var op = nueva ? q("reservas").insert(fila).select("*").single() : q("reservas").update(fila).eq("id", r.id).select("*").single();
    op.then(function(x){
      b.removeAttribute("aria-busy"); b.textContent = nueva ? "Crear cita" : "Guardar cambios";
      if (x.error) { $("#fc-err", d).hidden = false; $("#fc-err", d).textContent = errorTxt(x.error); return; }
      var cita = x.data, cambioHora = !nueva && (r.fecha !== cita.fecha || hm(r.hora) !== hm(cita.hora) || r.profesional_id !== cita.profesional_id);
      cerrarDrawer(); refrescar(); actualizarBadge();
      toast(nueva ? "Cita creada para <b>" + esc(cita.paciente_nombre) + "</b>, " + esc(medio(cita.fecha)) + " " + hm(cita.hora) : cambioHora ? "Cita reagendada" : "Cambios guardados",
        (nueva || cambioHora) ? { accion: "Avisar por WhatsApp", fn: function(){ window.open(waLink(cita, "reagendar"), "_blank", "noopener"); }, ms: 9000 } : {});
    });
  });
}

/* =====================================================================
   PACIENTES
   ===================================================================== */
var PQ = { q: "" }, PFILAS = [];
VISTAS.pacientes = function(v){
  v.innerHTML = '<div class="head"><div><h2>Pacientes</h2><p>Se arma solo con las reservas: historial, inasistencias y próxima cita.</p></div><div class="tools"><button class="btn sec" type="button" data-csv>' + I("down") + "Descargar Excel</button></div></div>" +
    '<div class="filters"><input type="search" id="pq" placeholder="Buscar por nombre, RUT o teléfono" value="' + esc(PQ.q) + '" aria-label="Buscar paciente" autofocus></div>' +
    '<div class="card"><div class="hd"><span class="count" id="p-cuenta">Cargando…</span></div><div class="bd flush tbl-wrap" id="p-tabla"></div></div>';
  v.oninput = debounce(function(ev){ if (ev.target.id === "pq") { PQ.q = ev.target.value; cargarPac(); } }, 250);
  v.onclick = function(ev){
    if (ev.target.closest("[data-csv]")) return csv("pacientes-" + hoy() + ".csv", PFILAS, [["nombre", "Nombre"], ["doc_tipo", "Documento"], ["doc", "N° documento"], ["telefono", "Teléfono"], ["correo", "Correo"], ["prevision", "Previsión"], ["total", "Citas"], ["atendidas", "Atendidas"], ["no_asistio", "No asistió"], ["canceladas", "Anuladas"], ["primera", "Primera cita"], ["ultima", "Última visita"], ["proxima", "Próxima cita"]]);
    if (ev.target.closest("a")) return;
    var row = ev.target.closest("[data-pac]"); if (row) { var p = PFILAS[+row.dataset.pac]; verPaciente(p.doc_tipo, p.doc); }
  };
  setTimeout(function(){ var i = $("#pq"); if (i) i.focus(); }, 50);
  cargarPac();
};
VISTAS.pacientes.refrescar = function(){ cargarPac(); };
function cargarPac(){
  DB.rpc("pacientes", { q: PQ.q.trim(), lim: 500 }).then(function(x){
    var el = $("#p-tabla"); if (!el) return;
    if (x.error) { el.innerHTML = '<p class="msg bad" style="margin:12px">' + esc(errorTxt(x.error)) + "</p>"; return; }
    PFILAS = x.data || [];
    $("#p-cuenta").textContent = nfmt(PFILAS.length) + (PFILAS.length === 1 ? " paciente" : " pacientes") + (PFILAS.length === 500 ? " (los 500 más recientes)" : "");
    if (!PFILAS.length) { el.innerHTML = '<div class="empty">' + I("users") + "<b>" + (PQ.q ? "Sin resultados" : "Aún no hay pacientes") + "</b><span>" + (PQ.q ? "Pruebe con otro nombre o RUT." : "Aparecerán con la primera reserva.") + "</span></div>"; return; }
    el.innerHTML = '<table class="tbl cards"><thead><tr><th>Paciente</th><th>Teléfono</th><th>Citas</th><th>Última visita</th><th>Próxima cita</th><th>Inasistencias</th></tr></thead><tbody>' + PFILAS.map(function(p, i){
      return '<tr data-pac="' + i + '"><td><b>' + esc(p.nombre) + '</b><span class="sub">' + esc(docTxt(p)) + (p.prevision ? " · " + esc(p.prevision) : "") + "</span></td>" +
        '<td><a href="https://wa.me/' + esc(String(p.telefono || "").replace(/\D/g, "")) + '" target="_blank" rel="noopener">' + esc(p.telefono || "") + "</a></td>" +
        '<td class="num">' + nfmt(p.total) + "</td><td>" + (p.ultima ? medio(p.ultima) : "—") + "</td><td>" + (p.proxima ? '<span class="st confirmada">' + medio(p.proxima) + "</span>" : "—") + "</td>" +
        "<td>" + (p.no_asistio ? '<span class="st no_asistio">' + p.no_asistio + "</span>" : '<span class="count">0</span>') + "</td></tr>";
    }).join("") + "</tbody></table>";
  });
}
function verPaciente(tipo, doc){
  Promise.all([q("reservas").select("*").eq("paciente_doc_tipo", tipo).eq("paciente_doc", doc).order("fecha", { ascending: false }).order("hora", { ascending: false }).limit(200)]).then(function(rs){
    var x = rs[0]; if (x.error) return toast(errorTxt(x.error), { tipo: "bad" });
    var L = x.data || [], u = L[0] || {}, cnt = function(e){ return L.filter(function(r){ return r.estado === e; }).length; };
    var futuras = L.filter(function(r){ return r.fecha >= hoy() && ["pendiente", "confirmada"].indexOf(r.estado) >= 0; });
    var d = abrirDrawer(drawerHead(esc(u.paciente_nombre || "Paciente")) +
      '<div class="db"><dl class="kv"><dt>Documento</dt><dd>' + esc(docTxt({ paciente_doc_tipo: tipo, paciente_doc: doc })) + "</dd><dt>Teléfono</dt><dd>" + esc(u.telefono || "—") + "</dd><dt>Correo</dt><dd>" + esc(u.correo || "—") + "</dd><dt>Previsión</dt><dd>" + esc(u.prevision || "—") + "</dd></dl>" +
      '<div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + [["Citas", L.length - cnt("cancelada")], ["Atendidas", cnt("atendida")], ["No asistió", cnt("no_asistio")], ["Anuladas", cnt("cancelada")]].map(function(k){ return '<div class="kpi"><small>' + k[0] + "</small><b>" + k[1] + "</b></div>"; }).join("") + "</div>" +
      (cnt("no_asistio") >= 2 ? '<p class="msg warn">' + I("alert") + " Este paciente ha faltado " + cnt("no_asistio") + " veces. Conviene confirmar sus próximas horas.</p>" : "") +
      '<div class="tools"><button class="btn sm" type="button" data-nueva>' + I("plus") + 'Nueva cita</button><a class="btn sm sec" href="https://wa.me/' + esc(String(u.telefono || "").replace(/\D/g, "")) + '" target="_blank" rel="noopener">' + I("wa") + "WhatsApp</a>" + (futuras.length ? '<span class="count">' + futuras.length + " cita(s) futura(s)</span>" : "") + "</div>" +
      '<div class="sect"><h4>Historial de citas</h4>' + (L.length ? '<div class="card"><div class="bd flush">' + L.map(function(r){ return '<div class="trow" data-cita="' + r.id + '"><div class="t">' + medio(r.fecha).replace(/^\w+ /, "") + "<small>" + hm(r.hora) + '</small></div><div class="w"><b>' + esc(r.tratamiento) + "</b><span>" + esc(r.profesional) + (r.notas ? " · " + esc(r.notas) : "") + '</span></div><div class="acts">' + stPill(r.estado) + "</div></div>"; }).join("") + "</div></div>" : '<p class="count">Sin citas.</p>') + "</div></div>");
    d.onclick = function(ev){
      if (ev.target.closest("[data-nueva]")) return nuevaCita({ doc_tipo: tipo, doc: doc, nombre: u.paciente_nombre, telefono: u.telefono, correo: u.correo, prevision: u.prevision });
      var c = ev.target.closest("[data-cita]"); if (c) return verCita(c.dataset.cita);
    };
  });
}
A.verPaciente = verPaciente;

/* =====================================================================
   BLOQUEOS (vacaciones, feriados, horas no disponibles)
   ===================================================================== */
VISTAS.bloqueos = function(v, p){
  var n = (p && p.nuevo) || {}, f = n.fecha || hoy();
  v.innerHTML = '<div class="head"><div><h2>Bloqueos de agenda</h2><p>Feriados, vacaciones, congresos o cualquier rato en que no se puede reservar.</p></div></div>' +
    '<div class="card"><div class="hd"><h3>Bloquear horario</h3><div class="tools"><button class="btn sm ghost" type="button" data-pre="dia">Hoy completo</button><button class="btn sm ghost" type="button" data-pre="feriado">Feriado (un día)</button><button class="btn sm ghost" type="button" data-pre="semana">Vacaciones (1 semana)</button></div></div>' +
    '<form class="bd form" id="fb" novalidate><div class="row3"><label class="field"><span>Quién</span><select id="fb-prof"><option value="">Toda la clínica</option>' + profs().map(function(x){ return '<option value="' + esc(x.id) + '"' + (n.prof === x.id ? " selected" : "") + ">" + esc(x.nombre) + "</option>"; }).join("") + "</select></label>" +
    '<label class="field"><span>Desde</span><input type="date" id="fb-desde" value="' + f + '"></label><label class="field"><span>Hasta</span><input type="date" id="fb-hasta" value="' + f + '"></label></div>' +
    '<label class="switch"><input type="checkbox" id="fb-dia" checked><i></i>Todo el día</label>' +
    '<div class="row3" id="fb-horas" hidden><label class="field"><span>Hora inicio</span><input type="time" id="fb-hi" value="09:00" step="300"></label><label class="field"><span>Hora fin</span><input type="time" id="fb-hf" value="13:00" step="300"></label></div>' +
    '<label class="field"><span>Motivo (opcional, solo lo ve la clínica)</span><input type="text" id="fb-motivo" maxlength="120" placeholder="Ej: Vacaciones, Feriado, Congreso"></label>' +
    '<p class="msg warn" id="fb-aviso" hidden></p><div class="tools"><button class="btn" type="submit" id="fb-ok">' + I("lock") + "Bloquear</button></div></form></div>" +
    '<div class="card"><div class="hd"><h3>Próximos bloqueos</h3><label class="check"><input type="checkbox" id="fb-pas"> Ver pasados</label></div><div class="bd flush" id="fb-lista"><div class="bd"><div class="skel" style="height:60px"></div></div></div></div>';
  var verPas = false;
  function rango(){
    var dia = $("#fb-dia").checked;
    return { i: $("#fb-desde").value + "T" + (dia ? "00:00" : $("#fb-hi").value), f: (dia ? mas($("#fb-hasta").value, 1) : $("#fb-hasta").value) + "T" + (dia ? "00:00" : $("#fb-hf").value) };
  }
  function lista(){
    var desde = verPas ? mas(hoy(), -365) : hoy();
    q("bloqueos").select("*").gte("fin", desde + "T00:00:00").order("inicio").limit(300).then(function(x){
      var el = $("#fb-lista"); if (!el) return;
      if (x.error) { el.innerHTML = '<p class="msg bad" style="margin:12px">' + esc(errorTxt(x.error)) + (/bloqueos/.test(x.error.message) ? " ¿Ejecutó supabase/02-panel-pro.sql?" : "") + "</p>"; return; }
      var L = (x.data || []).map(normBloq);
      el.innerHTML = L.length ? '<table class="tbl cards"><thead><tr><th>Quién</th><th>Desde</th><th>Hasta</th><th>Motivo</th><th></th></tr></thead><tbody>' + L.map(function(b){
        var diaC = b.i.slice(11) === "00:00" && b.f.slice(11) === "00:00";
        return '<tr style="cursor:default"><td>' + (b.profesional_id ? '<i class="dotc" style="background:' + colorProf(b.profesional_id) + '"></i> ' + esc((profPorId(b.profesional_id) || {}).nombre || b.profesional_id) : "<b>Toda la clínica</b>") + "</td>" +
          "<td>" + medio(b.i.slice(0, 10)) + (diaC ? "" : " " + b.i.slice(11)) + "</td><td>" + (diaC ? medio(mas(b.f.slice(0, 10), -1)) : medio(b.f.slice(0, 10)) + " " + b.f.slice(11)) + "</td>" +
          "<td>" + esc(b.motivo || "—") + '</td><td style="text-align:right"><button class="btn sm ghost" type="button" data-borrar="' + b.id + '">' + I("trash") + "Quitar</button></td></tr>";
      }).join("") + "</tbody></table>" : '<div class="empty">' + I("lock") + "<b>Sin bloqueos</b><span>La agenda está abierta según el horario.</span></div>";
    });
  }
  var revisar = debounce(function(){
    if (!$("#fb-dia")) return;
    var r = rango(), pr = $("#fb-prof").value, av = $("#fb-aviso");
    if (!$("#fb-desde").value || !$("#fb-hasta").value) return;
    cargarReservas($("#fb-desde").value, $("#fb-hasta").value, function(x){ x = x.in("estado", ["pendiente", "confirmada"]); return pr ? x.eq("profesional_id", pr) : x; }).then(function(L){
      L = L.filter(function(c){ var a = c.fecha + "T" + hm(c.hora), z = c.fecha + "T" + aHora(Math.min(aMin(c.hora) + (c.duracion || 30), 1439)); return a < r.f && z > r.i; });
      av.hidden = !L.length;
      av.innerHTML = L.length ? I("alert") + " Hay <b>" + L.length + "</b> cita(s) en ese horario: " + L.slice(0, 4).map(function(c){ return esc(c.paciente_nombre) + " (" + medio(c.fecha) + " " + hm(c.hora) + ")"; }).join(", ") + (L.length > 4 ? "…" : "") + ". El bloqueo no las anula: avíseles y reagéndelas." : "";
    }).catch(function(){});
  }, 300);
  v.onchange = function(ev){
    if (ev.target.id === "fb-dia") $("#fb-horas").hidden = ev.target.checked;
    if (ev.target.id === "fb-desde" && $("#fb-hasta").value < ev.target.value) $("#fb-hasta").value = ev.target.value;
    if (ev.target.id === "fb-pas") { verPas = ev.target.checked; lista(); return; }
    revisar();
  };
  v.onclick = function(ev){
    var b = ev.target.closest("[data-pre]");
    if (b) {
      var t = hoy(); $("#fb-dia").checked = true; $("#fb-horas").hidden = true;
      if (b.dataset.pre === "dia") { $("#fb-desde").value = $("#fb-hasta").value = t; $("#fb-motivo").value = $("#fb-motivo").value || "Día bloqueado"; }
      if (b.dataset.pre === "feriado") { $("#fb-motivo").value = "Feriado"; $("#fb-prof").value = ""; $("#fb-desde").focus(); }
      if (b.dataset.pre === "semana") { $("#fb-hasta").value = mas($("#fb-desde").value, 6); $("#fb-motivo").value = "Vacaciones"; }
      return revisar();
    }
    var del = ev.target.closest("[data-borrar]");
    if (del && confirm("¿Quitar este bloqueo? La agenda vuelve a quedar disponible.")) q("bloqueos").delete().eq("id", del.dataset.borrar).then(function(x){ if (x.error) return toast(errorTxt(x.error), { tipo: "bad" }); toast("Bloqueo quitado"); lista(); });
  };
  $("#fb").addEventListener("submit", function(ev){
    ev.preventDefault();
    var r = rango();
    if (!$("#fb-desde").value || !$("#fb-hasta").value || r.f <= r.i) return toast("Revise las fechas y horas: el fin debe ser después del inicio.", { tipo: "bad" });
    var btn = $("#fb-ok"); btn.setAttribute("aria-busy", "true");
    q("bloqueos").insert({ profesional_id: $("#fb-prof").value || null, inicio: r.i + ":00", fin: r.f + ":00", motivo: $("#fb-motivo").value.trim() || null }).then(function(x){
      btn.removeAttribute("aria-busy");
      if (x.error) return toast(errorTxt(x.error), { tipo: "bad" });
      toast("Horario bloqueado"); $("#fb-motivo").value = ""; $("#fb-aviso").hidden = true; lista();
    });
  });
  if (n.fecha) { $("#fb-desde").focus(); revisar(); }
  lista();
};

/* =====================================================================
   ACTIVIDAD (historial de cambios)
   ===================================================================== */
var ACT = { tipo: "" };
function frase(h, corta){
  var d = h.detalle || {}, a = h.accion;
  if (h.tipo === "reserva") {
    var cita = (corta ? "" : " de " + (d.paciente || "") + " (" + (d.fecha ? medio(d.fecha) : "") + " " + (d.hora || "") + ", " + (d.tratamiento || "") + ")");
    if (a === "cambió estado") return (corta ? "Estado: " : "Marcó la cita" + cita + " como ") + estNom(d.estado);
    if (a === "reagendó") return "Reagendó" + (corta ? "" : " la cita de " + (d.paciente || "")) + ": " + (d.antes ? medio(d.antes.fecha) + " " + d.antes.hora : "") + " → " + (d.fecha ? medio(d.fecha) : "") + " " + (d.hora || "");
    if (a === "creó") return (d.origen === "web" ? "Reservó en la página" : "Creó la cita") + cita;
    return cap(a) + " la cita" + cita;
  }
  if (h.tipo === "bloqueo") {
    var i = String(d.inicio || "").replace(" ", "T"), f = String(d.fin || "").replace(" ", "T"), quien = d.profesional_id ? ((profPorId(d.profesional_id) || {}).nombre || "") : "toda la clínica";
    var rango = !i ? "" : i.slice(11, 16) === "00:00" && f.slice(11, 16) === "00:00" ? medio(i.slice(0, 10)) + (mas(f.slice(0, 10), -1) !== i.slice(0, 10) ? " al " + medio(mas(f.slice(0, 10), -1)) : "") + " (todo el día)"
      : medio(i.slice(0, 10)) + " " + i.slice(11, 16) + " a " + (f.slice(0, 10) !== i.slice(0, 10) ? medio(f.slice(0, 10)) + " " : "") + f.slice(11, 16);
    return cap(a) + " " + quien + (rango ? ": " + rango : "") + (d.motivo ? " · " + d.motivo : "");
  }
  if (h.tipo === "pagina") return "Editó la página" + (d.secciones && d.secciones.length ? ": " + d.secciones.join(", ") : "");
  return a;
}
VISTAS.actividad = function(v){
  v.innerHTML = '<div class="head"><div><h2>Actividad</h2><p>Quién hizo qué y cuándo: reservas, cambios de estado, bloqueos y ediciones de la página.</p></div>' +
    '<div class="seg" role="group" aria-label="Filtrar">' + [["", "Todo"], ["reserva", "Citas"], ["bloqueo", "Bloqueos"], ["pagina", "Página"]].map(function(x){ return '<button type="button" data-tipo="' + x[0] + '" aria-pressed="' + (ACT.tipo === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div></div>" +
    '<div class="card"><div class="bd flush feed" id="act"><div class="bd"><div class="skel" style="height:200px"></div></div></div></div>';
  v.onclick = function(ev){ var b = ev.target.closest("[data-tipo]"); if (b) { ACT.tipo = b.dataset.tipo; VISTAS.actividad(v); } };
  var x = q("historial").select("*").order("creada", { ascending: false }).limit(300);
  if (ACT.tipo) x = x.eq("tipo", ACT.tipo);
  x.then(function(r){
    var el = $("#act"); if (!el) return;
    if (r.error) { el.innerHTML = '<p class="msg bad" style="margin:12px">' + esc(errorTxt(r.error)) + " ¿Ejecutó supabase/02-panel-pro.sql?</p>"; return; }
    var L = r.data || [];
    el.innerHTML = L.length ? L.map(function(h){
      var ic = h.tipo === "bloqueo" ? "lock" : h.tipo === "pagina" ? "globe" : (h.usuario || "").indexOf("@") < 0 ? "globe" : "cal";
      return '<div class="fi"><span class="av">' + I(ic) + "</span><div><p>" + esc(frase(h)) + '</p><small style="white-space:normal">' + esc(h.usuario || "") + '</small></div><small title="' + esc(new Date(h.creada).toLocaleString("es-CL")) + '">' + hace(h.creada) + "</small></div>";
    }).join("") : '<div class="empty">' + I("pulse") + "<b>Sin actividad todavía</b></div>";
  });
};
VISTAS.actividad.refrescar = function(){ if (actual.id === "actividad") VISTAS.actividad($("#vista")); };

/* =====================================================================
   PALETA DE COMANDOS (Ctrl + K)
   ===================================================================== */
var PAL = { items: [], sel: 0 };
var COMANDOS = [
  { t: "Nueva cita", k: "N", i: "plus", fn: function(){ nuevaCita({}); } },
  { t: "Ir a la agenda de hoy", i: "cal", fn: function(){ ir("agenda", { fecha: hoy() }); } },
  { t: "Citas por confirmar", i: "alert", fn: function(){ ir("reservas", { preset: "pendientes" }); } },
  { t: "Bloquear horario (vacaciones, feriado)", i: "lock", fn: function(){ ir("bloqueos"); } },
  { t: "Pacientes", i: "users", fn: function(){ ir("pacientes"); } },
  { t: "Editar la página web", i: "globe", fn: function(){ ir("pagina"); } },
  { t: "Reglas de reserva y horario", i: "gear", fn: function(){ ir("config"); } },
  { t: "Mensajes de WhatsApp", i: "wa", fn: function(){ ir("config"); } },
  { t: "Actividad reciente", i: "pulse", fn: function(){ ir("actividad"); } },
  { t: "Inicio", i: "home", fn: function(){ ir("inicio"); } }
];
function abrirPaleta(){
  var p = $("#palette");
  p.innerHTML = '<div class="box"><input type="text" id="pal-q" placeholder="Busque un paciente, un código de reserva o una acción…" autocomplete="off" aria-label="Buscar"><div class="res" id="pal-res" role="listbox"></div><div class="foot"><span><kbd>↑</kbd> <kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span></div></div>';
  p.hidden = false; PAL.sel = 0; palBuscar("");
  $("#pal-q").focus();
}
function cerrarPaleta(){ $("#palette").hidden = true; $("#palette").innerHTML = ""; }
A.abrirPaleta = abrirPaleta;
$("#palette").addEventListener("click", function(ev){
  if (ev.target.id === "palette") return cerrarPaleta();
  var it = ev.target.closest(".it"); if (it) palEjecutar(+it.dataset.k);
});
$("#palette").addEventListener("input", function(ev){ if (ev.target.id === "pal-q") palBuscar(ev.target.value); });
$("#palette").addEventListener("keydown", function(ev){
  if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); PAL.sel = (PAL.sel + (ev.key === "ArrowDown" ? 1 : -1) + PAL.items.length) % Math.max(1, PAL.items.length); palPintar(); }
  if (ev.key === "Enter") { ev.preventDefault(); palEjecutar(PAL.sel); }
});
function palEjecutar(k){ var it = PAL.items[k]; if (!it) return; cerrarPaleta(); it.fn(); }
var palRemoto = debounce(function(t, token){
  var codigo = /^[a-z0-9]{6}$/i.test(t);
  Promise.all([DB.rpc("pacientes", { q: t, lim: 6 }), codigo ? q("reservas").select("*").eq("codigo", t.toUpperCase()).limit(1) : Promise.resolve({ data: [] })]).then(function(rs){
    if (token !== PAL.token) return;
    var res = [];
    (rs[1].data || []).forEach(function(r){ res.push({ g: "Reserva", t: r.codigo + " · " + r.paciente_nombre, s: medio(r.fecha) + " " + hm(r.hora), i: "cal", fn: function(){ verCita(r.id); } }); });
    (rs[0].data || []).forEach(function(p){ res.push({ g: "Pacientes", t: p.nombre, s: docTxt(p) + (p.proxima ? " · próxima " + medio(p.proxima) : ""), i: "user", fn: function(){ verPaciente(p.doc_tipo, p.doc); } }); });
    PAL.items = res.concat(PAL.items.filter(function(x){ return x.g === "Acciones"; }));
    palPintar(true);
  });
}, 220);
function palBuscar(t){
  t = t.trim(); PAL.token = Math.random();
  var s = t.toLowerCase();
  PAL.items = COMANDOS.filter(function(c){ return !s || c.t.toLowerCase().indexOf(s) >= 0; }).map(function(c){ return Object.assign({ g: "Acciones" }, c); });
  PAL.sel = 0; palPintar();
  if (t.length >= 2) palRemoto(t, PAL.token);
}
function palPintar(remoto){
  var el = $("#pal-res"); if (!el) return;
  var g = "", html = "";
  PAL.items.forEach(function(it, k){
    if (it.g !== g) { g = it.g; html += '<div class="grp">' + g + "</div>"; }
    html += '<div class="it" role="option" data-k="' + k + '" aria-selected="' + (k === PAL.sel) + '">' + I(it.i) + "<span>" + esc(it.t) + "</span>" + (it.s ? "<small>" + esc(it.s) + "</small>" : it.k ? "<small><kbd>" + it.k + "</kbd></small>" : "") + "</div>";
  });
  el.innerHTML = html || '<div class="empty" style="padding:24px">' + (remoto ? "Sin resultados" : "Escriba para buscar") + "</div>";
  var s = $('[aria-selected="true"]', el); if (s) s.scrollIntoView({ block: "nearest" });
}

/* =====================================================================
   TIEMPO REAL: nuevas reservas aparecen solas
   ===================================================================== */
var refrescoRT = debounce(function(){ refrescar(); actualizarBadge(); }, 500), sinVer = 0;
function tiempoReal(){
  try {
    DB.channel("reservas-panel").on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, function(p){
      refrescoRT();
      if (p.eventType === "INSERT" && p.new && p.new.origen === "web") {
        var r = p.new; sinVer++;
        document.title = "(" + sinVer + ") Nueva reserva · " + (CFG.nombre || "Panel");
        toast("Nueva reserva: <b>" + esc(r.paciente_nombre) + "</b> · " + esc(medio(r.fecha)) + " " + hm(r.hora), { accion: "Ver", fn: function(){ verCita(r.id); }, ms: 12000 });
        try { var ctx = new (window.AudioContext || window.webkitAudioContext)(), o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; g.gain.value = .04; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .12); } catch (e) {}
      }
    }).subscribe(function(st){ $("#b-live").classList.toggle("on", st === "SUBSCRIBED"); $("#b-live").title = st === "SUBSCRIBED" ? "Conectado: las reservas nuevas aparecen solas" : "Sin conexión en vivo"; });
  } catch (e) {}
  document.addEventListener("visibilitychange", function(){ if (!document.hidden) { sinVer = 0; document.title = ($("#b-titulo").textContent || "") + " · " + (CFG.nombre || "Panel"); refrescar(); actualizarBadge(); } });
}

/* =====================================================================
   INGRESO E INICIO
   ===================================================================== */
function vista(id){ ["v-login", "v-off", "v-app"].forEach(function(v){ $("#" + v).hidden = v !== id; }); }
$("#f-login").addEventListener("submit", function(ev){
  ev.preventDefault();
  var err = $("#l-err"), btn = $("#l-btn"); err.hidden = true;
  if (!$("#l-mail").value || !$("#l-pass").value) { err.textContent = "Escriba su correo y contraseña."; err.hidden = false; return; }
  btn.setAttribute("aria-busy", "true"); btn.textContent = "Entrando…";
  DB.auth.signInWithPassword({ email: $("#l-mail").value.trim(), password: $("#l-pass").value }).then(function(r){
    btn.removeAttribute("aria-busy"); btn.textContent = "Entrar";
    if (r.error) { err.textContent = /invalid/i.test(r.error.message) ? "Correo o contraseña incorrectos." : "No se pudo entrar: " + r.error.message; err.hidden = false; return; }
    entrar();
  });
});
function aplicarCfg(){ $("#s-nombre").textContent = CFG.nombre || "Clínica"; }
function entrar(){
  DB.rpc("es_admin").then(function(r){
    if (r.error || !r.data) { DB.auth.signOut(); vista("v-login"); $("#l-err").textContent = "Esta cuenta no es administradora."; $("#l-err").hidden = false; return; }
    DB.auth.getUser().then(function(u){ USER = u.data && u.data.user; $("#s-who").textContent = USER ? USER.email : ""; A.user = USER; });
    q("config").select("datos").eq("id", 1).single().then(function(c){
      CFG = (c.data && c.data.datos) || {};
      aplicarCfg(); vista("v-app"); pintarMenu(); pintarTema();
      ir((location.hash || "").slice(1) || "inicio");
      tiempoReal();
    });
  });
}
window.conectar().then(function(db){
  DB = A.DB = db;
  if (!db) { if (window.SUPABASE_URL) { $("#off-t").textContent = "No pudimos conectarnos"; $("#off-p").textContent = "Revise su conexión a internet y vuelva a intentarlo."; } return vista("v-off"); }
  db.auth.getSession().then(function(r){ if (r.data && r.data.session) entrar(); else { vista("v-login"); $("#l-mail").focus(); } });
});
})();
