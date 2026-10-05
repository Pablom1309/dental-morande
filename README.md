# Dental Clinic Morande

Sitio web de la clínica con agenda en línea, base de datos en la nube y panel de administración.

| Página | Para quién | Qué hace |
|---|---|---|
| `index.html` | Pacientes | Información de la clínica y agenda en 4 pasos (RUT, especialidad, profesional y hora, confirmación). |
| `mi-reserva.html` | Pacientes | Revisar o anular una hora con el código de reserva y el RUT. |
| `admin.html` | Clínica | Panel de administración (ver abajo). |

Sin conexión a la base de datos, la página funciona en **modo demostración**: muestra horas de ejemplo y envía la solicitud por WhatsApp, sin guardar nada.

## El panel de administración

| Sección | Para qué sirve |
|---|---|
| **Inicio** | Lo urgente primero: citas por confirmar, citas de hoy, pacientes en sala y reservas web nuevas. Indicadores con comparación contra el periodo anterior (citas, ocupación, inasistencia, pacientes nuevos, conversión) y la lista de hoy con acciones de un clic (Confirmar, Llegó, Atendida). |
| **Agenda** | Calendario por profesional (día) o por semana. Clic en un hueco libre crea una cita; clic en una cita la abre. Muestra pausas, bloqueos y la hora actual. Se puede imprimir. |
| **Reservas** | Lista con filtros (fechas, estado, profesional, origen web/panel) y búsqueda por nombre, RUT, código o teléfono. Descarga a Excel. |
| **Pacientes** | Ficha armada desde las reservas: historial, inasistencias, próxima cita. Nueva cita para el paciente en un clic. |
| **Bloqueos** | Vacaciones, feriados o congresos para toda la clínica o un profesional. Avisa si hay citas en ese horario. |
| **Página web** | Edita todo lo que ven los pacientes con vista previa en vivo: datos, portada, aviso destacado, tratamientos (duración y precio), profesionales (tratamientos, color, horario propio), preguntas frecuentes, imágenes, secciones visibles y textos para Google. |
| **Configuración** | Reglas de reserva (cada cuántos minutos, anticipación, hasta cuándo, máximo por paciente, plazo para anular), horario de la clínica, mensajes de WhatsApp con variables, cambio de contraseña y cómo dar acceso a otra persona. |
| **Actividad** | Quién hizo qué y cuándo. |

Además: búsqueda rápida con **Ctrl + K**, nueva cita con la tecla **N**, reservas nuevas que aparecen solas (en vivo) con aviso, deshacer al cambiar un estado, tema claro u oscuro, y diseño para celular.

## Cómo funciona

- **Hosting:** GitHub Pages (gratis). Las páginas son archivos estáticos.
- **Base de datos, usuarios y fotos:** [Supabase](https://supabase.com), plan gratis (500 MB de datos, 1 GB de fotos).
- **Seguridad:** la base de datos tiene reglas (RLS) para que un visitante solo pueda reservar, ver las horas ocupadas (sin datos de pacientes) y revisar o anular su propia reserva con código + RUT. Solo los administradores ven las reservas y editan la página. Dos citas del mismo profesional no pueden cruzarse: lo impide la propia base de datos.

## Puesta en marcha (una vez, unos 15 minutos)

1. **Crear el proyecto en Supabase**
   - Entre a https://supabase.com, cree una cuenta y un proyecto nuevo (región: São Paulo). Guarde la contraseña de la base de datos.
2. **Crear las tablas**
   - **SQL Editor → New query**, pegue todo `supabase/schema.sql` y pulse **Run**.
   - Luego, en otra consulta nueva, pegue todo `supabase/02-panel-pro.sql` y pulse **Run**.
3. **Crear su usuario administrador**
   - **Authentication → Users → Add user → Create new user**: su correo y una contraseña segura (marque *Auto Confirm User*).
   - En el **SQL Editor**, con su correo:
     ```sql
     insert into public.admins (user_id, correo) select id, email from auth.users where lower(email) = lower('su-correo@ejemplo.cl');
     ```
4. **Cerrar el registro público**
   - **Authentication → Sign In / Providers**: desactive **Allow new users to sign up**.
5. **Conectar la página**
   - **Project Settings → API Keys**: copie **Project URL** y la clave **publishable / anon** en `conexion.js`. Nunca use la clave `secret` / `service_role`.
6. **Entrar al panel:** `https://pablom1309.github.io/dental-morande/admin.html`

Los dos archivos SQL se pueden volver a ejecutar sin perder datos.

## Bueno saber

- **Supabase gratis pausa el proyecto tras 7 días sin actividad.** Con visitas a la página no pasa; si ocurre, se reactiva desde Supabase con un clic.
- **Datos de salud y RUT:** son datos personales sensibles (Ley 19.628 y Ley 21.719). Publique una política de privacidad y no comparta la clave del panel.
- **Límites contra abuso:** máximo de horas futuras por paciente (configurable) y 20 reservas por minuto en total.
