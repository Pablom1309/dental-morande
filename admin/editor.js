/* =====================================================================
   Panel de la clínica: editor de la página web y configuración
   Edita un borrador (D) de la configuración; "Guardar cambios" lo publica.
   La vista previa muestra el borrador en vivo sin publicarlo.
   ===================================================================== */
(function(){
"use strict";
var A = window.A, $ = A.$, $$ = A.$$, esc = A.esc, I = A.I;
var D = null, sucio = false, abiertos = { datos: true, reglas: true };
var DEF_REGLAS = { intervalo: 30, anticipacion_min: 60, ventana_dias: 60, max_futuras: 3, cancelar_hasta_horas: 2 };
var SECCIONES = [["tratamientos", "Tratamientos"], ["clinica", "La clínica"], ["resenas", "Reseñas de Google"], ["ubicacion", "Ubicación y horario"], ["preguntas", "Preguntas frecuentes"]];

A.sucio = function(){ return sucio; };
A.descartar = function(){ D = null; sucio = false; marcar(); };

function copia(o){ return JSON.parse(JSON.stringify(o || {})); }
function borrador(){
  if (!D) {
    D = copia(A.cfg());
    D.textos = D.textos || {}; D.imagenes = D.imagenes || {}; D.google = D.google || {}; D.horario = D.horario || []; D.tratamientos = D.tratamientos || []; D.profesionales = D.profesionales || [];
    D.reglas = Object.assign({}, DEF_REGLAS, D.reglas || {}); D.mensajes = Object.assign({}, A.PLANTILLAS, D.mensajes || {}); D.faq = D.faq || []; D.secciones = D.secciones || {};
    D.aviso = D.aviso || { activo: false, texto: "" }; D.seo = D.seo || {};
    D.tratamientos.forEach(function(t){ if (!t.duracion) t.duracion = D.reglas.intervalo; });
    D.profesionales.forEach(function(p, i){ if (!p.color) p.color = A.COLORES[i % A.COLORES.length]; });
  }
  return D;
}
function get(path){ return path.split(".").reduce(function(o, k){ return o == null ? o : o[k]; }, D); }
function set(path, v){ var ks = path.split("."), o = D; ks.slice(0, -1).forEach(function(k, i){ if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; }); o[ks[ks.length - 1]] = v; }
function marcar(){ $("#savebar").classList.toggle("on", sucio); if (sucio) $("#save-msg").textContent = "Tiene cambios sin guardar"; }
function cambio(){ sucio = true; marcar(); vistaPrevia(); }

/* ---------- Componentes de formulario ---------- */
function campo(path, etq, tipo, ayuda, extra){
  var v = get(path); v = v == null ? "" : v;
  if (tipo === "area") return '<label class="field"><span>' + etq + '</span><textarea data-p="' + path + '"' + (extra || "") + ">" + esc(v) + "</textarea>" + (ayuda ? "<small>" + ayuda + "</small>" : "") + "</label>";
  return '<label class="field"><span>' + etq + '</span><input type="' + (tipo || "text") + '" data-p="' + path + '"' + (tipo === "number" ? ' data-num="1"' : "") + ' value="' + esc(v) + '"' + (extra || "") + ">" + (ayuda ? "<small>" + ayuda + "</small>" : "") + "</label>";
}
function selector(path, etq, ops, ayuda, num){
  var v = String(get(path));
  return '<label class="field"><span>' + etq + '</span><select data-p="' + path + '"' + (num ? ' data-num="1"' : "") + ">" + ops.map(function(o){ return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === v ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>" + (ayuda ? "<small>" + ayuda + "</small>" : "") + "</label>";
}
function interruptor(path, etq, invertido){
  var v = get(path), on = invertido ? v !== false : !!v;
  return '<label class="switch"><input type="checkbox" data-p="' + path + '" data-bool="' + (invertido ? "inv" : "1") + '"' + (on ? " checked" : "") + "><i></i>" + etq + "</label>";
}
function horarioEditor(path){
  var L = get(path) || [];
  return '<div class="form">' + L.map(function(b, i){
    var p = path + "." + i;
    return '<div class="item"><div class="item-h"><div class="days" role="group" aria-label="Días">' + [1, 2, 3, 4, 5, 6, 0].map(function(d){ return '<label><input type="checkbox" data-dia="' + p + '" value="' + d + '"' + ((b.dias || []).indexOf(d) >= 0 ? " checked" : "") + "><span>" + A.DIAS_C[d] + "</span></label>"; }).join("") +
      '</div><button type="button" class="btn sm ghost icon" data-act="del" data-list="' + path + '" data-i="' + i + '" aria-label="Quitar horario">' + I("trash") + "</button></div>" +
      '<div class="row2">' + campo(p + ".abre", "Abre", "time", "", ' step="900"') + campo(p + ".cierra", "Cierra", "time", "", ' step="900"') + "</div>" +
      '<div class="row2"><label class="field"><span>Pausa desde</span><input type="time" step="900" data-pausa="' + p + '.0" value="' + esc(b.pausa ? b.pausa[0] : "") + '"></label><label class="field"><span>Pausa hasta</span><input type="time" step="900" data-pausa="' + p + '.1" value="' + esc(b.pausa ? b.pausa[1] : "") + '"></label></div></div>';
  }).join("") + '<button type="button" class="btn sm sec" data-act="add" data-list="' + path + '" data-tpl="horario" style="align-self:flex-start">' + I("plus") + "Agregar rango de días</button></div>";
}
function acc(id, titulo, resumen, cuerpo){ return '<details class="acc" data-acc="' + id + '"' + (abiertos[id] ? " open" : "") + "><summary>" + titulo + "<small>" + esc(resumen || "") + '</small></summary><div class="in">' + cuerpo + "</div></details>"; }
function mover(lista, i, d){ var j = i + d; if (j < 0 || j >= lista.length) return; var x = lista[i]; lista[i] = lista[j]; lista[j] = x; }
function itemHead(titulo, path, i, n, extra){
  return '<div class="item-h"><b>' + esc(titulo) + "</b>" + (extra || "") +
    '<button type="button" class="btn sm ghost icon" data-act="up" data-list="' + path + '" data-i="' + i + '" aria-label="Subir"' + (i === 0 ? " disabled" : "") + ">" + I("up") + "</button>" +
    '<button type="button" class="btn sm ghost icon" data-act="down" data-list="' + path + '" data-i="' + i + '" aria-label="Bajar"' + (i === n - 1 ? " disabled" : "") + ">" + I("dn") + "</button>" +
    '<button type="button" class="btn sm ghost icon" data-act="del" data-list="' + path + '" data-i="' + i + '" aria-label="Quitar">' + I("trash") + "</button></div>";
}
var DURS = [[10, "10 min"], [15, "15 min"], [20, "20 min"], [30, "30 min"], [40, "40 min"], [45, "45 min"], [60, "1 hora"], [75, "1 h 15 min"], [90, "1 h 30 min"], [120, "2 horas"], [150, "2 h 30 min"], [180, "3 horas"]];
function imagen(clave, etq, ayuda){
  var u = D.imagenes[clave];
  return '<div class="img"><b style="font-size:13px">' + etq + '</b><div class="pv"' + (u ? ' style="background-image:url(&quot;' + esc(u) + '&quot;)"' : "") + ">" + (u ? "" : "Imagen original") + '</div><small class="help">' + ayuda + '</small><div class="tools"><label class="btn sm sec"><input type="file" class="file" accept="image/jpeg,image/png,image/webp" data-img="' + clave + '">Cambiar</label>' +
    (u ? '<button type="button" class="btn sm ghost" data-quitar-img="' + clave + '">Original</button>' : "") + "</div></div>";
}

/* =====================================================================
   PÁGINA WEB
   ===================================================================== */
A.VISTAS.pagina = function(v){
  borrador();
  v.innerHTML = '<div class="head"><div><h2>Página web</h2><p>Todo lo que ven los pacientes. Los cambios se ven a la derecha y se publican al guardar.</p></div><div class="tools"><a class="btn sec" href="index.html" target="_blank" rel="noopener">' + I("ext") + "Abrir página</a></div></div>" +
    '<div class="editor"><div class="ed-nav" id="ed"></div><div class="preview" id="pv"><div class="tools"><div class="seg" role="group" aria-label="Dispositivo"><button type="button" data-disp="pc" aria-pressed="true">Computador</button><button type="button" data-disp="movil" aria-pressed="false">Celular</button></div><span class="count">Vista previa (no publicada)</span></div><div class="frame"><iframe id="pv-frame" title="Vista previa de la página"></iframe></div></div></div>';
  pintarPagina();
  enlazar($("#ed"), pintarPagina);
  v.onclick = function(ev){ var b = ev.target.closest("[data-disp]"); if (b) { $$("[data-disp]", v).forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); }); $("#pv").classList.toggle("mobile", b.dataset.disp === "movil"); } };
  vistaPrevia(true);
};
function pintarPagina(){
  var d = D, ed = $("#ed"); if (!ed) return;
  var ts = d.tratamientos, ps = d.profesionales;
  ed.innerHTML =
    acc("datos", "Datos de la clínica", d.nombre, '<div class="row2">' + campo("nombre", "Nombre") + campo("direccion", "Dirección") + "</div>" +
      '<div class="row2">' + campo("whatsapp", "WhatsApp", "tel", "Con código de país: 56912345678", ' inputmode="numeric"') + campo("telefono", "Teléfono visible", "tel", "Ej: +56 2 2345 6789") + "</div>" +
      campo("mapaUrl", "Enlace de Google Maps", "url", "Botón “Cómo llegar”.")) +
    acc("portada", "Portada", d.textos.titulo, campo("textos.titulo", "Título principal", "area", "Máximo dos líneas.", ' rows="2" maxlength="90"') + campo("textos.subtitulo", "Texto bajo el título", "area", "Una o dos frases.", ' rows="2" maxlength="160"') +
      '<div class="imgs" style="grid-template-columns:minmax(0,1fr)">' + imagen("portada", "Foto de portada", "Horizontal, 1600 px o más. También se usa en “Ubicación”.") + "</div>") +
    acc("aviso", "Aviso destacado", d.aviso.activo ? "Visible: " + d.aviso.texto : "Oculto", interruptor("aviso.activo", "Mostrar una franja arriba de toda la página") +
      campo("aviso.texto", "Texto del aviso", "text", "Ej: “Cerrado el 18 y 19 de septiembre” o “Primera evaluación sin costo en octubre”.", ' maxlength="140"')) +
    acc("trat", "Tratamientos", ts.length + " tratamientos", '<div class="form">' + ts.map(function(t, i){
      var p = "tratamientos." + i;
      return '<div class="item">' + itemHead(t.nombre || "Nuevo tratamiento", "tratamientos", i, ts.length, interruptor(p + ".activo", "Visible", true)) +
        '<div class="row2">' + campo(p + ".nombre", "Nombre") + selector(p + ".duracion", "Duración de la cita", DURS, "", true) + "</div>" +
        campo(p + ".texto", "Texto corto", "text", "Se ve al reservar.") + campo(p + ".largo", "Descripción", "text", "Se ve en la tarjeta del tratamiento.") +
        campo(p + ".precio", "Precio (opcional)", "text", "Ej: Desde $25.000. Si lo deja vacío no se muestra.") + "</div>";
    }).join("") + '<button type="button" class="btn sm sec" data-act="add" data-list="tratamientos" data-tpl="tratamiento" style="align-self:flex-start">' + I("plus") + "Agregar tratamiento</button></div>") +
    acc("prof", "Profesionales", ps.length + " profesionales", '<div class="form">' + ps.map(function(p, i){
      var pp = "profesionales." + i, propio = !!(p.horario && p.horario.length);
      return '<div class="item">' + itemHead(p.nombre || "Nuevo profesional", "profesionales", i, ps.length, interruptor(pp + ".activo", "Recibe reservas", true)) +
        '<div class="row2">' + campo(pp + ".nombre", "Nombre", "text", "Ej: Dra. Ana Rojas") + campo(pp + ".especialidad", "Especialidad") + "</div>" +
        '<div class="field"><span>Tratamientos que atiende</span><div class="chipset">' + ts.map(function(t){ return '<label><input type="checkbox" data-pt="' + i + '" value="' + esc(t.id || "") + '"' + ((p.tratamientos || []).indexOf(t.id) >= 0 ? " checked" : "") + (t.id ? "" : " disabled") + "><span>" + esc(t.nombre || "(sin nombre)") + "</span></label>"; }).join("") + "</div></div>" +
        '<div class="field"><span>Color en la agenda</span><div class="colors">' + A.COLORES.map(function(c){ return '<button type="button" data-color="' + i + '" data-c="' + c + '" style="background:' + c + '" aria-pressed="' + (p.color === c) + '" aria-label="Color ' + c + '"></button>'; }).join("") + "</div></div>" +
        '<label class="switch"><input type="checkbox" data-propio="' + i + '"' + (propio ? " checked" : "") + "><i></i>Horario propio (si no, usa el horario de la clínica)</label>" +
        (propio ? horarioEditor(pp + ".horario") : "") + "</div>";
    }).join("") + '<button type="button" class="btn sm sec" data-act="add" data-list="profesionales" data-tpl="profesional" style="align-self:flex-start">' + I("plus") + "Agregar profesional</button></div>") +
    acc("faq", "Preguntas frecuentes", d.faq.length + " preguntas", '<div class="form">' + d.faq.map(function(f, i){
      return '<div class="item">' + itemHead(f.q || "Nueva pregunta", "faq", i, d.faq.length) + campo("faq." + i + ".q", "Pregunta") + campo("faq." + i + ".a", "Respuesta", "area", "", ' rows="2"') + "</div>";
    }).join("") + '<button type="button" class="btn sm sec" data-act="add" data-list="faq" data-tpl="faq" style="align-self:flex-start">' + I("plus") + "Agregar pregunta</button></div>") +
    acc("imgs", "Otras imágenes", "", '<div class="imgs" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + imagen("clinica", "Foto de la clínica", "Sección “La clínica”.") + imagen("resenas", "Franja de reseñas", "Va oscurecida detrás del puntaje.") + "</div>") +
    acc("secs", "Secciones visibles", SECCIONES.filter(function(s){ return d.secciones[s[0]] !== false; }).length + " de " + SECCIONES.length, '<div class="form">' + SECCIONES.map(function(s){ return interruptor("secciones." + s[0], s[1], true); }).join("") + "</div>") +
    acc("google", "Google: reseñas y buscador", "", '<div class="row2">' + campo("google.nota", "Nota en Google", "text", "Ej: 4,8") + campo("google.resenas", "N° de reseñas", "number", "", ' min="0"') + "</div>" + campo("google.url", "Enlace a la ficha de Google", "url") +
      campo("seo.titulo", "Título en Google", "text", "Lo que aparece en la búsqueda. Ideal: menos de 60 caracteres.", ' maxlength="70"') + campo("seo.descripcion", "Descripción en Google", "area", "Ideal: 120 a 155 caracteres.", ' rows="2" maxlength="170"')) +
    acc("demo", "Modo demostración", d.demo ? "Activado" : "Desactivado", interruptor("demo", "Mostrar al pie “profesionales y horas son de ejemplo”") + '<p class="help">Desactívelo cuando los datos sean los reales.</p>');
}

/* =====================================================================
   CONFIGURACIÓN
   ===================================================================== */
A.VISTAS.config = function(v){
  borrador();
  v.innerHTML = '<div class="head"><div><h2>Configuración</h2><p>Reglas de la agenda, horario y mensajes. Se aplican al guardar.</p></div></div><div class="ed-nav" id="ed" style="max-width:860px"></div>';
  pintarConfig();
  enlazar($("#ed"), pintarConfig);
};
function pintarConfig(){
  var d = D, ed = $("#ed"); if (!ed) return;
  var r = d.reglas;
  var muestra = { paciente_nombre: "María Pérez", tratamiento: (d.tratamientos[0] || {}).nombre || "Limpieza", fecha: A.mas(A.hoy(), 1), hora: "10:00", profesional: (d.profesionales[0] || {}).nombre || "Dra. Rojas", codigo: "ABC123" };
  var cfgPrev = A.cfg(); A.setCfg(d);
  var burbuja = function(k){ return '<div class="bubble">' + esc(A.llenar(d.mensajes[k], muestra)) + "</div>"; };
  A.setCfg(cfgPrev);
  var vars = '<div class="vars">' + ["nombre", "clinica", "tratamiento", "fecha", "hora", "profesional", "direccion", "codigo", "enlace"].map(function(x){ return '<button type="button" data-var="{' + x + '}">{' + x + "}</button>"; }).join("") + "</div>";
  ed.innerHTML =
    acc("reglas", "Reglas de reserva", "Cada " + r.intervalo + " min · hasta " + r.ventana_dias + " días", '<div class="row2">' +
      selector("reglas.intervalo", "Horas de inicio cada", [[10, "10 minutos"], [15, "15 minutos"], [20, "20 minutos"], [30, "30 minutos"], [45, "45 minutos"], [60, "1 hora"]], "Ej: con 30 min se ofrecen 9:00, 9:30, 10:00…", true) +
      selector("reglas.anticipacion_min", "Anticipación mínima", [[0, "Sin mínimo"], [30, "30 minutos"], [60, "1 hora"], [120, "2 horas"], [240, "4 horas"], [720, "12 horas"], [1440, "1 día"], [2880, "2 días"]], "No se puede reservar con menos aviso.", true) + "</div>" +
      '<div class="row3">' + selector("reglas.ventana_dias", "Se puede reservar hasta", [[7, "1 semana"], [14, "2 semanas"], [30, "1 mes"], [60, "2 meses"], [90, "3 meses"], [120, "4 meses"], [180, "6 meses"]], "", true) +
      selector("reglas.max_futuras", "Horas futuras por paciente", [[1, "1"], [2, "2"], [3, "3"], [5, "5"], [10, "10"]], "Evita que alguien acapare la agenda.", true) +
      selector("reglas.cancelar_hasta_horas", "Anular en línea hasta", [[0, "La misma hora"], [1, "1 hora antes"], [2, "2 horas antes"], [4, "4 horas antes"], [12, "12 horas antes"], [24, "24 horas antes"], [48, "48 horas antes"]], "Después, el paciente debe llamar.", true) + "</div>") +
    acc("horario", "Horario de la clínica", resumenHorario(d.horario), '<p class="help">Cada profesional puede tener su propio horario en Página web → Profesionales. Para vacaciones o feriados use <b>Bloqueos</b>.</p>' + horarioEditor("horario")) +
    acc("msgs", "Mensajes de WhatsApp", "Confirmación, recordatorio y cambio de hora", '<p class="help">Se usan con los botones de WhatsApp del panel. Toque una variable para insertarla donde está el cursor.</p>' +
      [["confirmar", "Pedir confirmación"], ["recordatorio", "Recordatorio"], ["reagendar", "Hora creada o cambiada"]].map(function(m){
        return '<div class="item">' + campo("mensajes." + m[0], m[1], "area", "", ' rows="3"') + vars + "<small class=\"help\">Así se verá:</small>" + burbuja(m[0]) + "</div>";
      }).join("")) +
    acc("cuenta", "Cuenta y acceso", A.user ? A.user.email : "", '<div class="form"><b>Cambiar mi contraseña</b><div class="row2"><label class="field"><span>Nueva contraseña</span><input type="password" id="cf-pass" autocomplete="new-password" minlength="10"></label><label class="field"><span>Repetir</span><input type="password" id="cf-pass2" autocomplete="new-password"></label></div><button type="button" class="btn sm sec" data-pass style="align-self:flex-start">Cambiar contraseña</button>' +
      '<b style="margin-top:8px">Dar acceso a otra persona (ej. recepción)</b><ol class="help" style="margin:0;padding-left:18px"><li>En Supabase: Authentication → Users → Add user, con su correo y una clave.</li><li>En SQL Editor, ejecute la línea de abajo con ese correo.</li></ol>' +
      '<textarea readonly rows="2" id="cf-sql">insert into public.admins (user_id, correo) select id, email from auth.users where lower(email) = lower(\'correo@ejemplo.cl\');</textarea><button type="button" class="btn sm sec" data-copiar style="align-self:flex-start">' + I("copy") + "Copiar</button></div>");
}
function resumenHorario(h){ return (h || []).map(function(b){ return (b.dias || []).slice().sort(function(a, z){ return ((a + 6) % 7) - ((z + 6) % 7); }).map(function(x){ return A.DIAS_C[x]; }).join(" ") + " " + (b.abre || "") + "–" + (b.cierra || ""); }).join(" · "); }

/* ---------- Enlace de controles con el borrador ---------- */
var TPL = {
  horario: function(){ return { dias: [1, 2, 3, 4, 5], abre: "09:00", cierra: "18:00" }; },
  tratamiento: function(){ return { id: "", nombre: "", texto: "", largo: "", duracion: D.reglas.intervalo || 30, activo: true }; },
  profesional: function(){ return { id: "", nombre: "", especialidad: "", tratamientos: [], activo: true, color: A.COLORES[D.profesionales.length % A.COLORES.length] }; },
  faq: function(){ return { q: "", a: "" }; }
};
var ultimoFoco = null;
function enlazar(ed, repintar){
  var re = function(){ var foco = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.p : null; repintar(); if (foco) { var el = $('[data-p="' + foco + '"]', ed); if (el) el.focus(); } };
  ed.addEventListener("toggle", function(ev){ if (ev.target.dataset && ev.target.dataset.acc) abiertos[ev.target.dataset.acc] = ev.target.open; }, true);
  ed.addEventListener("focusin", function(ev){ if (ev.target.tagName === "TEXTAREA" || ev.target.tagName === "INPUT") ultimoFoco = ev.target; });
  ed.addEventListener("input", function(ev){
    var el = ev.target, p = el.dataset.p;
    if (p && el.type !== "checkbox" && el.tagName !== "SELECT") { set(p, el.dataset.num ? (el.value === "" ? "" : +el.value) : el.value); cambio(); if (/^mensajes\./.test(p)) actualizarBurbuja(el); }
  });
  ed.addEventListener("change", function(ev){
    var el = ev.target, p = el.dataset.p, i;
    if (p && el.tagName === "SELECT") { set(p, el.dataset.num ? +el.value : el.value); cambio(); if (/^reglas|duracion/.test(p)) re(); return; }
    if (p && el.type === "checkbox") { set(p, el.dataset.bool === "inv" ? el.checked : el.checked); cambio(); re(); return; }
    if (el.dataset.dia) { get(el.dataset.dia).dias = $$('input[data-dia="' + el.dataset.dia + '"]:checked', ed).map(function(x){ return +x.value; }); cambio(); return; }
    if (el.dataset.pausa) { var a = el.dataset.pausa.split("."), k = +a.pop(), b = get(a.join(".")); b.pausa = b.pausa || ["", ""]; b.pausa[k] = el.value; if (!b.pausa[0] && !b.pausa[1]) delete b.pausa; cambio(); return; }
    if (el.dataset.pt) { i = +el.dataset.pt; D.profesionales[i].tratamientos = $$('input[data-pt="' + i + '"]:checked', ed).map(function(x){ return x.value; }); cambio(); return; }
    if (el.dataset.propio) { i = +el.dataset.propio; D.profesionales[i].horario = el.checked ? copia(D.horario) : []; cambio(); re(); return; }
    if (el.dataset.img && el.files && el.files[0]) subirImagen(el.dataset.img, el.files[0], el, re);
    if (/^(tratamientos|profesionales|faq)\.\d+\.(nombre|q)$/.test(p || "")) { if (/^tratamientos/.test(p)) asegurarId(D.tratamientos[+p.split(".")[1]]); re(); }
  });
  ed.addEventListener("click", function(ev){
    var b = ev.target.closest("button"); if (!b) return;
    var act = b.dataset.act;
    if (act) {
      var lista = get(b.dataset.list), i = +b.dataset.i;
      if (act === "add") { lista.push(TPL[b.dataset.tpl]()); abiertos[b.closest("[data-acc]").dataset.acc] = true; }
      if (act === "up") mover(lista, i, -1);
      if (act === "down") mover(lista, i, 1);
      if (act === "del") {
        var it = lista[i];
        if (!confirm("¿Quitar " + (it.nombre || it.q ? "“" + (it.nombre || it.q) + "”" : "este elemento") + "? Las citas ya hechas no se borran.")) return;
        lista.splice(i, 1);
        if (b.dataset.list === "tratamientos" && it.id) D.profesionales.forEach(function(p){ p.tratamientos = (p.tratamientos || []).filter(function(t){ return t !== it.id; }); });
      }
      cambio(); return re();
    }
    if (b.dataset.color) { D.profesionales[+b.dataset.color].color = b.dataset.c; cambio(); return re(); }
    if (b.dataset.quitarImg) { delete D.imagenes[b.dataset.quitarImg]; cambio(); return re(); }
    if (b.dataset.var && ultimoFoco && ultimoFoco.dataset.p && /^mensajes\./.test(ultimoFoco.dataset.p)) {
      var t = ultimoFoco, s = t.selectionStart || t.value.length; t.value = t.value.slice(0, s) + b.dataset.var + t.value.slice(t.selectionEnd || s); set(t.dataset.p, t.value); cambio(); actualizarBurbuja(t); t.focus(); t.selectionStart = t.selectionEnd = s + b.dataset.var.length; return;
    }
    if (b.hasAttribute("data-pass")) return cambiarPass();
    if (b.hasAttribute("data-copiar")) { var ta = $("#cf-sql"); ta.select(); try { navigator.clipboard.writeText(ta.value); } catch (e) { document.execCommand("copy"); } A.toast("Copiado"); }
  });
}
function actualizarBurbuja(el){
  var item = el.closest(".item"), bb = item && $(".bubble", item); if (!bb) return;
  var cfgPrev = A.cfg(); A.setCfg(D);
  bb.textContent = A.llenar(el.value, { paciente_nombre: "María Pérez", tratamiento: (D.tratamientos[0] || {}).nombre || "Limpieza", fecha: A.mas(A.hoy(), 1), hora: "10:00", profesional: (D.profesionales[0] || {}).nombre || "", codigo: "ABC123" });
  A.setCfg(cfgPrev);
}
function slug(t){ return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item"; }
function asegurarId(t){
  if (!t || t.id || !String(t.nombre || "").trim()) return;
  var id = slug(t.nombre), k = 2; while (D.tratamientos.some(function(o){ return o !== t && o.id === id; })) id = slug(t.nombre) + "-" + k++;
  t.id = id;
}
function cambiarPass(){
  var a = $("#cf-pass").value, b = $("#cf-pass2").value;
  if (a.length < 10) return A.toast("Use al menos 10 caracteres.", { tipo: "bad" });
  if (a !== b) return A.toast("Las contraseñas no coinciden.", { tipo: "bad" });
  A.DB.auth.updateUser({ password: a }).then(function(r){ if (r.error) return A.toast(A.errorTxt(r.error), { tipo: "bad" }); $("#cf-pass").value = $("#cf-pass2").value = ""; A.toast("Contraseña cambiada"); });
}

/* ---------- Imágenes: se achican antes de subir (máx. 2000 px) ---------- */
function achicar(file){
  return new Promise(function(ok, mal){
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function(){
      var s = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(function(b){ b ? ok(b) : mal(new Error("No se pudo leer la imagen")); }, "image/jpeg", .84);
    };
    img.onerror = function(){ mal(new Error("El archivo no es una imagen válida")); };
    img.src = url;
  });
}
function subirImagen(clave, file, input, re){
  var lbl = input.parentNode; lbl.setAttribute("aria-busy", "true"); lbl.lastChild.textContent = "Subiendo…";
  achicar(file).then(function(blob){
    var nombre = clave + "-" + Date.now() + ".jpg";
    return A.DB.storage.from("imagenes").upload(nombre, blob, { contentType: "image/jpeg", upsert: false }).then(function(r){
      if (r.error) throw r.error;
      D.imagenes[clave] = A.DB.storage.from("imagenes").getPublicUrl(nombre).data.publicUrl; cambio(); re();
    });
  }).catch(function(e){ A.toast("No se pudo subir: " + esc(e.message || e), { tipo: "bad" }); lbl.removeAttribute("aria-busy"); lbl.lastChild.textContent = "Cambiar"; });
}

/* ---------- Vista previa en vivo (sin publicar) ---------- */
var vistaPrevia = A.debounce(function(){
  var f = $("#pv-frame"); if (!f) return;
  try { sessionStorage.setItem("vista_previa", JSON.stringify(D)); } catch (e) {}
  var y = 0; try { y = f.contentWindow.scrollY || 0; } catch (e) {}
  f.onload = function(){ try { if (y) f.contentWindow.scrollTo(0, y); } catch (e) {} };
  f.src = "index.html?preview=1&t=" + Date.now();
}, 700);

/* ---------- Validar y guardar ---------- */
function validar(){
  var e = [], d = D;
  if (!String(d.nombre || "").trim()) e.push("Falta el nombre de la clínica.");
  var wa = String(d.whatsapp || "").replace(/\D/g, ""); if (wa && !/^\d{10,13}$/.test(wa)) e.push("El WhatsApp debe tener código de país, por ejemplo 56912345678."); d.whatsapp = wa;
  function revisarHorario(h, quien){
    (h || []).forEach(function(b, i){
      var n = quien + " (rango " + (i + 1) + ")";
      if (!(b.dias || []).length) e.push(n + ": marque al menos un día.");
      if (!b.abre || !b.cierra || b.abre >= b.cierra) e.push(n + ": el cierre debe ser después de la apertura.");
      if (b.pausa && (!b.pausa[0] || !b.pausa[1] || b.pausa[0] >= b.pausa[1])) e.push(n + ": la pausa está incompleta.");
    });
  }
  revisarHorario(d.horario, "Horario de la clínica");
  d.tratamientos.forEach(function(t, i){ if (!String(t.nombre || "").trim()) e.push("El tratamiento " + (i + 1) + " no tiene nombre."); asegurarId(t); if (!t.texto) t.texto = t.nombre; t.duracion = +t.duracion || 30; });
  d.profesionales.forEach(function(p, i){
    if (!String(p.nombre || "").trim()) return e.push("El profesional " + (i + 1) + " no tiene nombre.");
    if (!p.id) { var n = 1; while (d.profesionales.some(function(o){ return o.id === "p" + n; })) n++; p.id = "p" + n; }
    p.iniciales = String(p.nombre).replace(/^(dra?\.|dr\.)\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map(function(w){ return w[0].toUpperCase(); }).join("");
    p.tratamientos = (p.tratamientos || []).filter(function(t){ return d.tratamientos.some(function(x){ return x.id === t; }); });
    if (p.activo !== false && !p.tratamientos.length) e.push(p.nombre + " no tiene tratamientos marcados.");
    revisarHorario(p.horario, p.nombre);
  });
  if (!d.profesionales.some(function(p){ return p.activo !== false; })) e.push("Debe haber al menos un profesional que reciba reservas.");
  d.faq = d.faq.filter(function(f){ return String(f.q || "").trim(); });
  if (d.google && d.google.resenas !== "" && d.google.resenas != null) d.google.resenas = +d.google.resenas;
  if (d.aviso.activo && !String(d.aviso.texto || "").trim()) e.push("Escriba el texto del aviso o desactívelo.");
  return e;
}
$("#b-guardar").addEventListener("click", function(){
  if (!D) return;
  var e = validar();
  if (e.length) { alert("Revise antes de guardar:\n\n• " + e.join("\n• ")); if (A.actual.id === "pagina") pintarPagina(); else pintarConfig(); return; }
  var b = $("#b-guardar"); b.setAttribute("aria-busy", "true"); b.textContent = "Guardando…";
  A.q("config").update({ datos: D, actualizada: new Date().toISOString() }).eq("id", 1).select("datos").single().then(function(r){
    b.removeAttribute("aria-busy"); b.textContent = "Guardar cambios";
    if (r.error) return A.toast("No se pudo guardar: " + esc(A.errorTxt(r.error)), { tipo: "bad" });
    A.setCfg(r.data.datos); D = null; sucio = false; marcar();
    A.toast("Guardado. La página ya muestra los cambios.");
    A.ir(A.actual.id);
  });
});
$("#b-descartar").addEventListener("click", function(){ if (!confirm("¿Descartar los cambios sin guardar?")) return; A.descartar(); A.ir(A.actual.id); });
window.addEventListener("beforeunload", function(ev){ if (sucio) { ev.preventDefault(); ev.returnValue = ""; } });
})();
