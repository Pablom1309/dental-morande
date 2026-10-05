# Dental Clinic Morande

Sitio web de la clínica con agenda en línea, base de datos en la nube y panel de administración.

| Página | Para quién | Qué hace |
|---|---|---|
| `index.html` | Pacientes | Información de la clínica y agenda en 4 pasos (RUT, especialidad, profesional y hora, confirmación). |
| `mi-reserva.html` | Pacientes | Revisar o anular una hora con el código de reserva y el RUT. |
| `admin.html` | Clínica | Estadísticas, reservas (cambiar estado, buscar, descargar Excel) y edición del contenido de la página (textos, fotos, horario, tratamientos, profesionales). |

Sin conexión a la base de datos, la página funciona en **modo demostración**: muestra horas de ejemplo y envía la solicitud por WhatsApp, sin guardar nada.

## Cómo funciona

- **Hosting:** GitHub Pages (gratis). Las páginas son archivos estáticos.
- **Base de datos, usuarios y fotos:** [Supabase](https://supabase.com), plan gratis (500 MB de datos, 1 GB de fotos).
- **Seguridad:** la base de datos tiene reglas (RLS) para que un visitante solo pueda reservar, ver las horas ocupadas (sin datos de pacientes) y revisar o anular su propia reserva con código + RUT. Solo los administradores ven las reservas y editan la página.

## Puesta en marcha (una vez, unos 15 minutos)

1. **Crear el proyecto en Supabase**
   - Entre a https://supabase.com, cree una cuenta y un proyecto nuevo (región: São Paulo, la más cercana a Chile). Guarde la contraseña de la base de datos.
2. **Crear las tablas**
   - En el proyecto: **SQL Editor → New query**, pegue todo el contenido de `supabase/schema.sql` y pulse **Run**.
3. **Crear su usuario administrador**
   - **Authentication → Users → Add user → Create new user**: su correo y una contraseña segura (marque *Auto Confirm User*).
   - Vuelva al **SQL Editor** y ejecute, con su correo:
     ```sql
     insert into public.admins (user_id, correo) select id, email from auth.users where email = 'su-correo@ejemplo.cl';
     ```
4. **Cerrar el registro público**
   - **Authentication → Sign In / Providers → Email**: desactive **Allow new users to sign up**. Así nadie más puede crear cuentas.
5. **Conectar la página**
   - **Project Settings → API** (o **Data API**): copie **Project URL** y la clave pública **anon / publishable**.
   - Péguelas en `conexion.js` (`SUPABASE_URL` y `SUPABASE_KEY`). Nunca use la clave `service_role` / `secret`.
   - En **Authentication → URL Configuration**, ponga como *Site URL* la dirección de la página, por ejemplo `https://pablom1309.github.io/dental-morande/`.
6. **Entrar al panel:** `https://pablom1309.github.io/dental-morande/admin.html`

## Uso diario

- **Reservas:** en el panel, pestaña *Reservas*. Cambie el estado (Reservada → Confirmada → Atendida / No asistió / Anulada). Al anular, la hora queda libre de nuevo.
- **Contenido:** pestaña *Contenido*. Los cambios se ven en la página apenas pulsa *Guardar cambios*.
- **Estadísticas:** pestaña *Resumen*. Cuenta visitas (sin datos personales), reservas, conversión y de dónde llegan las visitas.

## Bueno saber

- **Supabase gratis pausa el proyecto tras 7 días sin actividad.** Con visitas a la página no pasa; si ocurre, se reactiva desde el panel de Supabase con un clic.
- **Datos de salud y RUT:** son datos personales sensibles (Ley 19.628 y Ley 21.719). Publique una política de privacidad que explique para qué se usan, y no comparta la clave del panel.
- **Límites contra abuso:** máximo 3 horas futuras por paciente y 20 reservas por minuto en total.
