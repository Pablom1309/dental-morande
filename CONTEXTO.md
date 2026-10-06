# CONTEXTO DEL PROYECTO: plataforma web de reservas para clínicas dentales (Chile)

Resumen para continuar el trabajo en otra IA. Autor y dueño: Pablo Muñoz (GitHub: Pablom1309). Idioma: español de Chile.

## 1. Objetivo y modelo de negocio
- Partió como el sitio de una clínica ("Dental Clinic Morande", Morandé 835, Santiago Centro). Hoy es una **plantilla para vender sitios con agenda en línea a varias clínicas**.
- Modelo elegido: **una plataforma multi-clínica (multi-tenant)**: un solo código y una sola base de datos, donde cada clínica ve solo sus datos y cada dominio carga su contenido. **Todavía no se implementa**: hoy el sistema atiende a una sola clínica.
- Se cobraría instalación más mensualidad. Costos fijos estimados: Supabase Pro US$25/mes + Resend Pro US$20/mes (desde la 2ª clínica) + Cloudflare Pages gratis. Dominio .cl de cada clínica: $9.940 + IVA/año en NIC Chile, a nombre de la clínica.

## 2. Repositorios y URLs
- **Repo principal:** `github.com/Pablom1309/dental-morande` (rama `main`, público). Publicado con GitHub Pages: https://pablom1309.github.io/dental-morande/
  - Página pública: `index.html` · Mi reserva: `mi-reserva.html` · Panel: `admin.html`
- **Otro repo (no tocar):** `Pablom1309/Tienda-shopify-`. Ahí vive otra tienda, de mascotas ("Kuchiwau"), publicada por GitHub Actions desde la rama `claude/shopify-autonomous-agent-d55vw7` en https://pablom1309.github.io/Tienda-shopify-/ . Un error previo la reemplazó por la página dental; ya se restauró. La rama `ccr-c3f196df-5et8x8` de ese repo tiene una versión antigua del sitio dental que ya no se usa.
- **Supabase:** proyecto `aovqurmjrgyvrxvbolis`, región São Paulo, plan Free.
  - URL: `https://aovqurmjrgyvrxvbolis.supabase.co`
  - Clave pública (publishable, va en el sitio): `sb_publishable_OWHWlPKj94uUgd_kJxM24Q_5LJdpjBk`
  - Configuración: Data API activada, "Automatically expose new tables" **desactivado**, RLS automático activado, registro de nuevos usuarios **desactivado**, usuario admin creado y registrado en `public.admins` (correo `pablom12389@gmail.com`).
  - Ya se ejecutaron `supabase/schema.sql` y `supabase/02-panel-pro.sql`. Verificado contra la base real: reservas, cruces, anulación y permisos funcionan.
  - Nunca poner la clave secret/service_role en el sitio.

## 3. Arquitectura (sin build; HTML/CSS/JS puro)
- `conexion.js`: URL y clave de Supabase, y `window.conectar()`. Carga `vendor/supabase.min.js` (supabase-js 2.58.0, copia local para no depender de un CDN). Sin claves, la página funciona en **modo demostración**: horas de ejemplo y envío de la solicitud por WhatsApp.
- `calendario.js`: botones "Agregar a Google Calendar" y descarga `.ics` (con avisos 1 día y 2 h antes; convierte la hora de Chile a UTC).
- `index.html`: sitio de la clínica + agenda tipo RedSalud en 4 pasos:
  1. Paciente: RUT validado con dígito verificador (o pasaporte) y previsión (Fonasa/Isapre/Particular).
  2. Especialidad: se salta si ya se eligió en el buscador de la portada.
  3. Profesional y hora: horas reales según duración del tratamiento, horario (de la clínica o propio del profesional), pausa, bloqueos, anticipación mínima y ventana máxima.
  4. Confirmación: nombre, teléfono y correo opcional → RPC `reservar` → código de 6 caracteres + botones de calendario.
  - Carga el contenido desde `config.datos`: textos, imágenes, tratamientos (con duración y precio), profesionales, preguntas frecuentes, secciones visibles, aviso destacado, SEO y reglas.
  - Con `?preview=1` lee la configuración desde `sessionStorage` (vista previa del editor del panel).
  - Registra visitas (sin datos personales) en `visitas`.
  - Si `disponibilidad` no existe, cae a `horas_ocupadas`.
  - Si la base de datos está configurada pero no responde, muestra "No pudimos cargar la agenda" en vez de horas inventadas.
- `mi-reserva.html`: el paciente busca con código + RUT/pasaporte, ve el estado y anula. Respeta `reglas.cancelar_hasta_horas`.
- `admin.html` + `admin/app.css` + `admin/app.js` + `admin/editor.js`: panel profesional inspirado en Linear, Stripe, Jane App y Cliniko.
  - Barra lateral con: Inicio, Agenda, Reservas (con contador de citas por confirmar), Pacientes, Bloqueos, Página web, Configuración y Actividad.
  - **Inicio:** alertas, indicadores con comparación contra el periodo anterior (citas, ocupación, reservas web, inasistencia, pacientes nuevos, conversión), lista de hoy con acciones rápidas (Confirmar, Llegó, Atendida, No asistió) y gráficos en SVG.
  - **Agenda:** calendario de día (una columna por profesional) o semana. Muestra fuera de horario y bloqueos rayados, línea de "ahora", clic en un hueco crea una cita y se puede imprimir.
  - **Detalle de cita** (panel lateral): estados con deshacer, notas internas, WhatsApp con plantillas, reagendar/editar e historial.
  - **Nueva cita:** búsqueda de paciente existente, horas libres calculadas y opción de hora manual.
  - **Reservas:** filtros y descarga CSV.
  - **Pacientes:** RPC `pacientes`, ficha con historial y alerta si falta seguido.
  - **Bloqueos:** con atajos de feriado y vacaciones; avisa si hay citas en ese horario.
  - **Página web:** editor con vista previa en vivo en iframe.
  - **Configuración:** reglas, horario, plantillas de WhatsApp con variables `{nombre} {clinica} {tratamiento} {fecha} {hora} {profesional} {direccion} {codigo} {enlace}`, cambio de contraseña y SQL para dar acceso a otra persona.
  - **Actividad:** tabla `historial`.
  - Otros: Ctrl+K para buscar, tecla N para nueva cita, tiempo real con Supabase Realtime (aviso + sonido ante reservas web nuevas), tema claro/oscuro/automático y diseño para celular.
- Estados de cita: `pendiente` (Reservada), `confirmada`, `en_sala`, `atendida`, `no_asistio`, `cancelada` (Anulada).

## 4. Base de datos (Supabase/Postgres)
- **`schema.sql`:**
  - Tablas: `config` (id=1, `datos` jsonb con todo el contenido), `admins`, `reservas`, `visitas`.
  - RLS en todas; el visitante anónimo no ve reservas.
  - Funciones SECURITY DEFINER: `reservar(p jsonb)`, `ver_reserva(cod, doc)`, `cancelar_reserva(cod, doc)`, `horas_ocupadas`, `resumen`, `es_admin`, `rut_valido`, `doc_normal`, `hoy_chile`.
  - Bucket público `imagenes`: solo los administradores suben imágenes.
  - Permisos explícitos (funciona aunque las tablas no se expongan automáticamente).
- **`02-panel-pro.sql`** (idempotente):
  - En `reservas`: columnas `duracion`, `origen` (web/panel), `actualizada` y `rango` (tsrange generado), con restricción **EXCLUDE gist** `reservas_sin_cruce` (impide que dos citas activas del mismo profesional se crucen). Requiere `btree_gist`.
  - El código de reserva se genera solo (`nuevo_codigo()`).
  - Tabla `bloqueos` (`profesional_id` nulo = toda la clínica; `inicio`/`fin` en hora de Chile).
  - Tabla `historial` con disparadores sobre reservas, bloqueos y config. `quien()` devuelve el correo del admin, "Paciente (web)" o "Sistema".
  - Reglas en `config.datos.reglas`: `intervalo`, `anticipacion_min`, `ventana_dias`, `max_futuras`, `cancelar_hasta_horas`.
  - Funciones `regla()`, `bloque_de()` (horario propio del profesional o el de la clínica) y `cabe_en_horario()`.
  - Funciones públicas: `disponibilidad(desde, hasta)` → `{ocupadas:[{p,f,h,d}], bloqueos:[{p,i,f}]}`. `reservar` y `cancelar_reserva` actualizados.
  - Solo admin: `pacientes(q, lim)` y `resumen(desde, hasta)` ampliado.
  - Publicación realtime de `reservas`.
  - Valores iniciales: reglas, duraciones (endodoncia y blanqueamiento 60 min, el resto 30), mensajes de WhatsApp y preguntas frecuentes.
- Pruebas: los dos SQL se probaron en Postgres 16 local con simulaciones de `auth`/`storage` (todas pasaron), y el sitio se probó con una simulación del cliente Supabase en el navegador.

## 5. Datos aún de ejemplo
- Profesionales "Dra./Dr. Nombre Apellido" (p1, p2, p3); WhatsApp y teléfono vacíos; `demo: true`. Se cambian desde el panel (Página web).
- En la base real hay reservas de prueba "PRUEBA Claude (borrar)", todas anuladas.

## 6. Pendiente (en orden recomendado)
1. **Pasar a plataforma multi-clínica:**
   - Agregar `clinica_id` a todas las tablas y una tabla `clinicas` con dominio y configuración.
   - RLS por clínica, con administradores asociados a su clínica.
   - Que la página pública resuelva la clínica por `location.hostname`.
   - Panel de dueño para Pablo: crear clínicas, asignar administradores y ver el estado de cada una.
   - Migrar la clínica actual como la primera.
2. **Avisos automáticos** (diseñados, sin código todavía):
   - Edge Function de Supabase `notificar` (Deno). Lee la reserva con la service role; envía correo con Resend (HTML + `.ics` adjunto + enlace a mi-reserva) y WhatsApp con la API de Meta usando plantillas aprobadas. Variables: 1 nombre, 2 clínica, 3 tratamiento, 4 fecha, 5 hora, 6 profesional, 7 enlace.
   - Tipos de aviso: confirmación, cambio, anulación y recordatorio.
   - SQL 03:
     - `pg_net` + disparador sobre `reservas` que llama a la función con un encabezado secreto guardado en un esquema `privado`.
     - `pg_cron` cada hora para los recordatorios (columnas `aviso_confirmacion` y `aviso_recordatorio`).
     - Separar el disparador de historial para que no registre las actualizaciones de avisos.
   - Interruptores en Configuración (`datos.avisos`).
   - Secretos de la función: `RESEND_API_KEY`, `CORREO_REMITENTE`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `AVISOS_SECRETO`, `SITIO_URL`.
   - Requiere dominio propio verificado en Resend y una cuenta verificada de Meta Business por clínica.
3. **Legal (Chile):** política de privacidad, casilla de consentimiento al reservar, contrato de encargo de tratamiento con cada clínica y aviso de que los datos se guardan fuera de Chile. Ley 19.628 vigente; la Ley 21.719 parte el 1-dic-2026 (se propuso postergarla a 2027). Datos de salud = datos sensibles. Facturación ante el SII.
4. **Hosting:** mover a Cloudflare Pages (repositorio privado gratis, hasta 100 dominios por proyecto) con DNS en Cloudflare. Pasar a Supabase Pro con el primer cliente que pague (respaldos diarios, sin pausas).
5. **Monitoreo** (UptimeRobot) y una demo con datos ficticios para vender.
6. Opcional: roles (administrador vs recepción), WhatsApp de la clínica configurado, fotos reales.

## 7. Preferencias del usuario
- Explicaciones en español simple, paso a paso, sin jerga.
- No reemplazar sus otras páginas.
- Diseño de calidad: guías de Emil Kowalski, Taste e Impeccable (sin etiquetas pequeñas sobre los títulos, tipografía sans, movimiento sobrio, estados completos, accesibilidad, modo oscuro).
- Prefiere que el trabajo avance de forma autónoma.
- Cada cambio se prueba antes de subirlo a `main` de `dental-morande`.
