/* ============================================================
   CONEXIÓN CON LA BASE DE DATOS (Supabase)
   Pegue aquí los dos datos de su proyecto:
   Supabase → Project Settings → API (o "Data API").
   - SUPABASE_URL: "Project URL"
   - SUPABASE_KEY: la clave pública "anon" / "publishable" (NUNCA la "service_role" / "secret")
   Si quedan vacíos, la página funciona en modo demostración (sin guardar reservas).
   ============================================================ */
window.SUPABASE_URL = "https://aovqurmjrgyvrxvbolis.supabase.co";
window.SUPABASE_KEY = "sb_publishable_OWHWlPKj94uUgd_kJxM24Q_5LJdpjBk";

/* Carga la librería de Supabase y entrega el cliente, o null si no hay conexión configurada. */
window.conectar = function(){
  if (window._conexion) return window._conexion;
  window._conexion = new Promise(function(ok){
    if (!window.SUPABASE_URL || !window.SUPABASE_KEY) return ok(null);
    var listo = false, fin = function(v){ if (!listo) { listo = true; ok(v); } };
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    s.onload = function(){ try { fin(window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY)); } catch (e) { fin(null); } };
    s.onerror = function(){ fin(null); };
    setTimeout(function(){ fin(null); }, 8000);
    document.head.appendChild(s);
  });
  return window._conexion;
};
