/* Agregar una cita al calendario del paciente (Google Calendar o archivo .ics para iPhone/Outlook).
   Las horas de la clínica son de Chile; se convierten a UTC para que el calendario las muestre bien
   aunque el paciente esté en otra zona horaria. */
(function(){
  "use strict";
  var pad = function(n){ return (n < 10 ? "0" : "") + n; };
  /* Diferencia en minutos entre la hora de Chile y UTC para un instante dado */
  function offsetChile(ms){
    try {
      var p = {}; new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(ms)).forEach(function(x){ p[x.type] = x.value; });
      return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - ms) / 60000;
    } catch (e) { return -180; }
  }
  /* "2026-10-06" + "10:00" en Chile -> milisegundos UTC */
  function aUTC(fecha, hora){
    var f = fecha.split("-"), h = String(hora).split(":");
    var local = Date.UTC(+f[0], +f[1] - 1, +f[2], +h[0], +h[1]);
    var ms = local - offsetChile(local) * 60000;
    return local - offsetChile(ms) * 60000;
  }
  function sello(ms){ var d = new Date(ms); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z"; }
  function rango(ev){ var i = aUTC(ev.fecha, ev.hora); return [i, i + (ev.duracion || 30) * 60000]; }
  function google(ev){
    var r = rango(ev);
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(ev.titulo) + "&dates=" + sello(r[0]) + "/" + sello(r[1]) +
      "&details=" + encodeURIComponent(ev.detalle || "") + "&location=" + encodeURIComponent(ev.lugar || "") + "&ctz=America/Santiago";
  }
  function escIcs(t){ return String(t || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1"); }
  function ics(ev){
    var r = rango(ev), uid = (ev.codigo || Date.now()) + "@reserva";
    var txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Agenda clinica//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      "UID:" + uid, "DTSTAMP:" + sello(Date.now()), "DTSTART:" + sello(r[0]), "DTEND:" + sello(r[1]),
      "SUMMARY:" + escIcs(ev.titulo), "DESCRIPTION:" + escIcs(ev.detalle), "LOCATION:" + escIcs(ev.lugar),
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:" + escIcs(ev.titulo), "END:VALARM",
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:" + escIcs(ev.titulo), "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(txt);
  }
  /* Botones listos para insertar */
  function botones(ev, clase){
    var e = function(t){ return String(t).replace(/[&<>"]/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    return '<a class="' + clase + '" target="_blank" rel="noopener" href="' + e(google(ev)) + '">Agregar a Google Calendar</a>' +
      '<a class="' + clase + '" href="' + e(ics(ev)) + '" download="cita-' + e(ev.codigo || "dental") + '.ics">Agregar al calendario del celular</a>';
  }
  window.Calendario = { google: google, ics: ics, botones: botones };
})();
