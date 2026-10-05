-- =====================================================================
-- Dental Clinic Morande: base de datos en Supabase
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin perder datos.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tablas ----------

-- Contenido editable de la página (un solo registro, id = 1)
create table if not exists public.config (
  id          int primary key default 1 check (id = 1),
  datos       jsonb not null default '{}'::jsonb,
  actualizada timestamptz not null default now()
);
-- Datos iniciales (los mismos de la página). Solo se cargan si la tabla está vacía; después se editan en el panel.
insert into public.config (id, datos) values (1, $seed${
 "demo": true,
 "nombre": "Dental Clinic Morande",
 "direccion": "Morandé 835, Santiago Centro",
 "whatsapp": "",
 "telefono": "",
 "correo": "",
 "google": {
  "nota": "4,8",
  "resenas": 62,
  "url": "https://www.google.com/maps/search/?api=1&query=Dental+Clinic+Morande+Santiago+Centro"
 },
 "mapaUrl": "https://www.google.com/maps/search/?api=1&query=Morand%C3%A9+835+Santiago+Chile",
 "textos": {
  "titulo": "Sonría tranquilo: su dentista de confianza en el centro",
  "subtitulo": "Clínica dental en Santiago Centro. Elija especialidad, profesional y hora en línea."
 },
 "imagenes": {
  "portada": "",
  "clinica": "",
  "resenas": ""
 },
 "horario": [
  {
   "dias": [
    1,
    2,
    3,
    4,
    5
   ],
   "abre": "09:00",
   "cierra": "19:00",
   "pausa": [
    "13:00",
    "15:00"
   ]
  },
  {
   "dias": [
    6
   ],
   "abre": "10:00",
   "cierra": "14:00"
  }
 ],
 "tratamientos": [
  {
   "id": "ortodoncia",
   "nombre": "Ortodoncia",
   "texto": "Frenillos y alineadores",
   "largo": "Frenillos y alineadores para corregir la mordida."
  },
  {
   "id": "restauraciones",
   "nombre": "Restauraciones",
   "texto": "Tapaduras y coronas",
   "largo": "Tapaduras y coronas del color de su diente."
  },
  {
   "id": "limpieza",
   "nombre": "Limpieza",
   "texto": "Destartraje y pulido",
   "largo": "Destartraje y pulido para encías sanas."
  },
  {
   "id": "endodoncia",
   "nombre": "Endodoncia",
   "texto": "Tratamiento de conducto",
   "largo": "Tratamiento de conducto para salvar el diente."
  },
  {
   "id": "blanqueamiento",
   "nombre": "Blanqueamiento",
   "texto": "Dientes más claros",
   "largo": "Un tono más claro, con supervisión profesional."
  },
  {
   "id": "urgencia",
   "nombre": "Urgencia",
   "texto": "Dolor o fractura, hoy",
   "largo": "Dolor o fractura: la hora más próxima del día."
  }
 ],
 "profesionales": [
  {
   "id": "p1",
   "nombre": "Dra. Nombre Apellido",
   "iniciales": "NA",
   "especialidad": "Ortodoncia",
   "tratamientos": [
    "ortodoncia",
    "limpieza",
    "urgencia"
   ],
   "activo": true
  },
  {
   "id": "p2",
   "nombre": "Dr. Nombre Apellido",
   "iniciales": "NA",
   "especialidad": "Odontología general y endodoncia",
   "tratamientos": [
    "restauraciones",
    "endodoncia",
    "limpieza",
    "urgencia",
    "ortodoncia"
   ],
   "activo": true
  },
  {
   "id": "p3",
   "nombre": "Dra. Nombre Apellido",
   "iniciales": "NA",
   "especialidad": "Estética y rehabilitación",
   "tratamientos": [
    "blanqueamiento",
    "restauraciones",
    "limpieza",
    "urgencia"
   ],
   "activo": true
  }
 ]
}$seed$::jsonb)
on conflict (id) do update set datos = excluded.datos where public.config.datos = '{}'::jsonb;

-- Personas que pueden entrar al panel de administración
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  correo  text
);

create table if not exists public.reservas (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique,
  creada            timestamptz not null default now(),
  fecha             date not null,
  hora              time not null,
  profesional_id    text not null,
  profesional       text not null,
  tratamiento_id    text not null,
  tratamiento       text not null,
  paciente_nombre   text not null,
  paciente_doc_tipo text not null check (paciente_doc_tipo in ('rut', 'pasaporte')),
  paciente_doc      text not null,
  prevision         text,
  telefono          text not null,
  correo            text,
  estado            text not null default 'pendiente'
                    check (estado in ('pendiente', 'confirmada', 'atendida', 'no_asistio', 'cancelada')),
  cancelada_por     text check (cancelada_por in ('paciente', 'clinica')),
  notas             text
);
-- Una hora ocupada no se puede volver a reservar (las canceladas liberan la hora)
create unique index if not exists reservas_hora_unica
  on public.reservas (profesional_id, fecha, hora) where estado <> 'cancelada';
create index if not exists reservas_fecha on public.reservas (fecha);

-- Visitas a la página, para las estadísticas (sin datos personales)
create table if not exists public.visitas (
  id     bigint generated always as identity primary key,
  creada timestamptz not null default now(),
  evento text not null check (evento in ('visita', 'inicio_reserva', 'reserva')),
  movil  boolean,
  origen text check (char_length(origen) <= 200)
);
create index if not exists visitas_creada on public.visitas (creada);

-- ---------- Ayudantes ----------

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.hoy_chile() returns date
language sql stable as $$ select (now() at time zone 'America/Santiago')::date; $$;

create or replace function public.doc_normal(tipo text, doc text) returns text
language sql immutable as $$
  select case when tipo = 'rut' then upper(regexp_replace(coalesce(doc, ''), '[^0-9kK]', '', 'g'))
              else upper(regexp_replace(coalesce(doc, ''), '\s', '', 'g')) end;
$$;

create or replace function public.rut_valido(rut text) returns boolean
language plpgsql immutable as $$
declare
  c text := upper(regexp_replace(coalesce(rut, ''), '[^0-9kK]', '', 'g'));
  cuerpo text; dv text; s int := 0; m int := 2; r int; esperado text;
begin
  if length(c) < 8 or length(c) > 9 then return false; end if;
  cuerpo := left(c, -1); dv := right(c, 1);
  if cuerpo !~ '^\d+$' then return false; end if;
  for i in reverse length(cuerpo)..1 loop
    s := s + substr(cuerpo, i, 1)::int * m;
    m := case when m = 7 then 2 else m + 1 end;
  end loop;
  r := 11 - s % 11;
  esperado := case r when 11 then '0' when 10 then 'K' else r::text end;
  return dv = esperado;
end $$;

-- ¿La hora cae dentro del horario de atención configurado?
create or replace function public.hora_en_horario(f date, h time) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare b jsonb; dow int := extract(dow from f);
begin
  if extract(minute from h)::int % 30 <> 0 or extract(second from h) <> 0 then return false; end if;
  for b in select jsonb_array_elements(coalesce((select datos -> 'horario' from config where id = 1), '[]'::jsonb)) loop
    if b -> 'dias' @> to_jsonb(dow) then
      if h < (b ->> 'abre')::time or h + interval '30 minutes' > (b ->> 'cierra')::time then return false; end if;
      if b ? 'pausa' and h >= (b -> 'pausa' ->> 0)::time and h < (b -> 'pausa' ->> 1)::time then return false; end if;
      return true;
    end if;
  end loop;
  return false;
end $$;

-- ---------- Seguridad (RLS): por defecto nadie ve nada ----------

alter table public.config   enable row level security;
alter table public.admins   enable row level security;
alter table public.reservas enable row level security;
alter table public.visitas  enable row level security;

drop policy if exists "config: todos leen" on public.config;
create policy "config: todos leen" on public.config for select using (true);
drop policy if exists "config: admin edita" on public.config;
create policy "config: admin edita" on public.config for update using (public.es_admin()) with check (public.es_admin());

drop policy if exists "admins: se ve a sí mismo" on public.admins;
create policy "admins: se ve a sí mismo" on public.admins for select using (user_id = auth.uid());

drop policy if exists "reservas: admin todo" on public.reservas;
create policy "reservas: admin todo" on public.reservas for all using (public.es_admin()) with check (public.es_admin());

drop policy if exists "visitas: cualquiera registra" on public.visitas;
create policy "visitas: cualquiera registra" on public.visitas for insert with check (true);
drop policy if exists "visitas: admin lee" on public.visitas;
create policy "visitas: admin lee" on public.visitas for select using (public.es_admin());

revoke all on public.reservas from anon;
revoke all on public.visitas from anon;
grant insert (evento, movil, origen) on public.visitas to anon, authenticated;
grant select on public.config to anon, authenticated;
-- Permisos explícitos (funciona aunque "Automatically expose new tables" esté desactivado)
grant usage on schema public to anon, authenticated;
grant update on public.config to authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.reservas to authenticated;
grant select on public.visitas to authenticated;

-- ---------- Funciones públicas (lo único que un visitante puede hacer) ----------

-- Horas ya tomadas, sin datos del paciente, para pintar la disponibilidad
create or replace function public.horas_ocupadas(desde date, hasta date)
returns table (profesional_id text, fecha date, hora time)
language sql stable security definer set search_path = public as $$
  select r.profesional_id, r.fecha, r.hora from reservas r
  where r.estado <> 'cancelada' and r.fecha between desde and least(hasta, desde + 120);
$$;

-- Crear una reserva. Devuelve el código que el paciente usa para revisarla o anularla.
create or replace function public.reservar(p jsonb)
returns table (codigo text)
language plpgsql volatile security definer set search_path = public as $$
declare
  cfg jsonb := (select datos from config where id = 1);
  prof jsonb; trat jsonb;
  f date := (p ->> 'fecha')::date;
  h time := (p ->> 'hora')::time;
  tipo text := coalesce(p ->> 'doc_tipo', 'rut');
  doc text := doc_normal(tipo, p ->> 'doc');
  fono text := regexp_replace(coalesce(p ->> 'telefono', ''), '[^0-9+]', '', 'g');
  nombre text := btrim(coalesce(p ->> 'nombre', ''));
  mail text := nullif(btrim(coalesce(p ->> 'correo', '')), '');
  nuevo text;
begin
  select x into prof from jsonb_array_elements(cfg -> 'profesionales') x where x ->> 'id' = p ->> 'profesional_id' and coalesce((x ->> 'activo')::boolean, true);
  select x into trat from jsonb_array_elements(cfg -> 'tratamientos') x where x ->> 'id' = p ->> 'tratamiento_id';
  if prof is null or trat is null or not (prof -> 'tratamientos' ? (trat ->> 'id')) then raise exception 'datos_invalidos: profesional o tratamiento'; end if;
  if f is null or f < hoy_chile() or f > hoy_chile() + 90 then raise exception 'datos_invalidos: fecha'; end if;
  if f = hoy_chile() and h <= (now() at time zone 'America/Santiago')::time + interval '1 hour' then raise exception 'datos_invalidos: hora pasada'; end if;
  if not hora_en_horario(f, h) then raise exception 'datos_invalidos: fuera de horario'; end if;
  if tipo not in ('rut', 'pasaporte') or (tipo = 'rut' and not rut_valido(doc)) or (tipo = 'pasaporte' and length(doc) not between 5 and 20) then raise exception 'datos_invalidos: documento'; end if;
  if char_length(nombre) not between 3 and 120 then raise exception 'datos_invalidos: nombre'; end if;
  if length(regexp_replace(fono, '\D', '', 'g')) not between 8 and 12 then raise exception 'datos_invalidos: telefono'; end if;
  if mail is not null and (char_length(mail) > 160 or mail !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') then raise exception 'datos_invalidos: correo'; end if;
  if (select count(*) from reservas r where r.paciente_doc = doc and r.estado in ('pendiente', 'confirmada') and r.fecha >= hoy_chile()) >= 3 then
    raise exception 'limite: el paciente ya tiene 3 horas futuras';
  end if;
  if (select count(*) from reservas r where r.creada > now() - interval '1 minute') >= 20 then raise exception 'limite: intente en un minuto'; end if;

  loop
    nuevo := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from reservas r where r.codigo = nuevo);
  end loop;

  begin
    insert into reservas (codigo, fecha, hora, profesional_id, profesional, tratamiento_id, tratamiento,
                          paciente_nombre, paciente_doc_tipo, paciente_doc, prevision, telefono, correo)
    values (nuevo, f, h, prof ->> 'id', prof ->> 'nombre', trat ->> 'id', trat ->> 'nombre',
            nombre, tipo, doc, left(p ->> 'prevision', 40), fono, mail);
  exception when unique_violation then
    raise exception 'ocupada: esa hora se acaba de tomar';
  end;
  return query select nuevo;
end $$;

-- El paciente revisa su reserva con el código y su RUT o pasaporte
create or replace function public.ver_reserva(cod text, doc text)
returns table (codigo text, fecha date, hora time, profesional text, tratamiento text, estado text, paciente_nombre text)
language sql stable security definer set search_path = public as $$
  select r.codigo, r.fecha, r.hora, r.profesional, r.tratamiento, r.estado, r.paciente_nombre
  from reservas r
  where r.codigo = upper(btrim(cod)) and r.paciente_doc = doc_normal(r.paciente_doc_tipo, doc);
$$;

-- El paciente anula su reserva (solo si aún no pasa)
create or replace function public.cancelar_reserva(cod text, doc text)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare n int;
begin
  update reservas r set estado = 'cancelada', cancelada_por = 'paciente'
  where r.codigo = upper(btrim(cod)) and r.paciente_doc = doc_normal(r.paciente_doc_tipo, doc)
    and r.estado in ('pendiente', 'confirmada') and r.fecha >= hoy_chile();
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Estadísticas para el panel (solo administradores)
create or replace function public.resumen(desde date, hasta date)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'sin_permiso'; end if;
  return jsonb_build_object(
    'visitas',        (select count(*) from visitas where evento = 'visita' and (creada at time zone 'America/Santiago')::date between desde and hasta),
    'inicios',        (select count(*) from visitas where evento = 'inicio_reserva' and (creada at time zone 'America/Santiago')::date between desde and hasta),
    'reservas',       (select count(*) from reservas where (creada at time zone 'America/Santiago')::date between desde and hasta),
    'canceladas',     (select count(*) from reservas where estado = 'cancelada' and (creada at time zone 'America/Santiago')::date between desde and hasta),
    'movil',          (select count(*) from visitas where evento = 'visita' and movil and (creada at time zone 'America/Santiago')::date between desde and hasta),
    'por_dia',        (select coalesce(jsonb_agg(d order by d ->> 'dia'), '[]'::jsonb) from (
                         select jsonb_build_object('dia', g::date,
                           'visitas',  (select count(*) from visitas v where v.evento = 'visita' and (v.creada at time zone 'America/Santiago')::date = g::date),
                           'reservas', (select count(*) from reservas r where (r.creada at time zone 'America/Santiago')::date = g::date)) d
                         from generate_series(desde, hasta, interval '1 day') g) t),
    'por_tratamiento',(select coalesce(jsonb_object_agg(tratamiento, n), '{}'::jsonb) from (select tratamiento, count(*) n from reservas where estado <> 'cancelada' and (creada at time zone 'America/Santiago')::date between desde and hasta group by 1) t),
    'por_profesional',(select coalesce(jsonb_object_agg(profesional, n), '{}'::jsonb) from (select profesional, count(*) n from reservas where estado <> 'cancelada' and (creada at time zone 'America/Santiago')::date between desde and hasta group by 1) t),
    'por_estado',     (select coalesce(jsonb_object_agg(estado, n), '{}'::jsonb) from (select estado, count(*) n from reservas where (creada at time zone 'America/Santiago')::date between desde and hasta group by 1) t),
    'origenes',       (select coalesce(jsonb_object_agg(origen, n), '{}'::jsonb) from (select coalesce(nullif(origen, ''), 'directo') origen, count(*) n from visitas where evento = 'visita' and (creada at time zone 'America/Santiago')::date between desde and hasta group by 1 order by 2 desc limit 8) t)
  );
end $$;

revoke all on function public.reservar(jsonb), public.ver_reserva(text, text), public.cancelar_reserva(text, text),
                       public.horas_ocupadas(date, date), public.resumen(date, date), public.hora_en_horario(date, time) from public;
grant execute on function public.reservar(jsonb), public.ver_reserva(text, text), public.cancelar_reserva(text, text),
                          public.horas_ocupadas(date, date) to anon, authenticated;
grant execute on function public.resumen(date, date), public.es_admin() to authenticated;

-- ---------- Imágenes de la página (Storage) ----------

insert into storage.buckets (id, name, public) values ('imagenes', 'imagenes', true) on conflict (id) do nothing;

drop policy if exists "imagenes: admin sube" on storage.objects;
create policy "imagenes: admin sube" on storage.objects for insert to authenticated with check (bucket_id = 'imagenes' and public.es_admin());
drop policy if exists "imagenes: admin cambia" on storage.objects;
create policy "imagenes: admin cambia" on storage.objects for update to authenticated using (bucket_id = 'imagenes' and public.es_admin());
drop policy if exists "imagenes: admin borra" on storage.objects;
create policy "imagenes: admin borra" on storage.objects for delete to authenticated using (bucket_id = 'imagenes' and public.es_admin());

-- =====================================================================
-- Último paso (una vez): crear su usuario administrador.
-- 1) Supabase → Authentication → Users → Add user → con su correo y una clave.
-- 2) Ejecute esta línea cambiando el correo:
--    insert into public.admins (user_id, correo) select id, email from auth.users where email = 'su-correo@ejemplo.cl';
-- =====================================================================
