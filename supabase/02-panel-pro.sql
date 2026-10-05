-- =====================================================================
-- Dental Clinic Morande: actualización 02 (panel profesional)
-- Requiere haber ejecutado antes supabase/schema.sql.
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin perder datos.
--
-- Agrega: duración por tratamiento, bloqueos de agenda (vacaciones, feriados),
-- horario propio por profesional, reglas de reserva editables, estado "En sala",
-- reservas creadas desde el panel, ficha de pacientes, historial de cambios
-- y avisos en tiempo real de nuevas reservas.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------- Reservas: duración y rango de tiempo ----------

alter table public.reservas add column if not exists duracion int not null default 30;
alter table public.reservas add column if not exists origen text not null default 'web';
alter table public.reservas add column if not exists actualizada timestamptz;
alter table public.reservas drop constraint if exists reservas_duracion_check;
alter table public.reservas add constraint reservas_duracion_check check (duracion between 5 and 480);
alter table public.reservas drop constraint if exists reservas_origen_check;
alter table public.reservas add constraint reservas_origen_check check (origen in ('web', 'panel'));
alter table public.reservas drop constraint if exists reservas_estado_check;
alter table public.reservas add constraint reservas_estado_check
  check (estado in ('pendiente', 'confirmada', 'en_sala', 'atendida', 'no_asistio', 'cancelada'));

alter table public.reservas add column if not exists rango tsrange
  generated always as (tsrange(fecha + hora, fecha + hora + duracion * interval '1 minute')) stored;

-- Dos citas activas del mismo profesional no pueden cruzarse en el tiempo
drop index if exists public.reservas_hora_unica;
alter table public.reservas drop constraint if exists reservas_sin_cruce;
alter table public.reservas add constraint reservas_sin_cruce
  exclude using gist (profesional_id with =, rango with &&) where (estado <> 'cancelada');

-- Código de reserva automático (también para las creadas desde el panel)
create or replace function public.nuevo_codigo() returns text
language plpgsql volatile set search_path = public as $$
declare c text;
begin
  loop
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from reservas r where r.codigo = c);
  end loop;
  return c;
end $$;
alter table public.reservas alter column codigo set default public.nuevo_codigo();

create or replace function public.marcar_actualizada() returns trigger
language plpgsql as $$ begin new.actualizada := now(); return new; end $$;
drop trigger if exists reservas_actualizada on public.reservas;
create trigger reservas_actualizada before update on public.reservas for each row execute function public.marcar_actualizada();

-- ---------- Bloqueos de agenda ----------

create table if not exists public.bloqueos (
  id             uuid primary key default gen_random_uuid(),
  profesional_id text,                       -- vacío = toda la clínica
  inicio         timestamp not null,         -- hora de Chile
  fin            timestamp not null,
  motivo         text check (char_length(motivo) <= 120),
  creada         timestamptz not null default now(),
  check (fin > inicio)
);
create index if not exists bloqueos_rango on public.bloqueos (inicio, fin);
alter table public.bloqueos enable row level security;
drop policy if exists "bloqueos: admin todo" on public.bloqueos;
create policy "bloqueos: admin todo" on public.bloqueos for all using (public.es_admin()) with check (public.es_admin());
revoke all on public.bloqueos from anon;
grant select, insert, update, delete on public.bloqueos to authenticated;

-- ---------- Historial de cambios ----------

create table if not exists public.historial (
  id      bigint generated always as identity primary key,
  creada  timestamptz not null default now(),
  usuario text,
  tipo    text not null,
  accion  text not null,
  detalle jsonb
);
create index if not exists historial_creada on public.historial (creada desc);
alter table public.historial enable row level security;
drop policy if exists "historial: admin lee" on public.historial;
create policy "historial: admin lee" on public.historial for select using (public.es_admin());
revoke all on public.historial from anon;
grant select on public.historial to authenticated;

create or replace function public.quien() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select email from auth.users where id = auth.uid()),
                  case when session_user = 'authenticator' then 'Paciente (web)' else 'Sistema' end);
$$;

create or replace function public.registrar_historial() returns trigger
language plpgsql security definer set search_path = public as $$
declare d jsonb; a text;
begin
  if tg_table_name = 'reservas' then
    if tg_op = 'INSERT' then a := 'creó';
    elsif tg_op = 'DELETE' then a := 'eliminó';
    elsif old.estado is distinct from new.estado then a := 'cambió estado';
    elsif old.fecha is distinct from new.fecha or old.hora is distinct from new.hora or old.profesional_id is distinct from new.profesional_id then a := 'reagendó';
    else a := 'editó'; end if;
    d := jsonb_build_object('codigo', coalesce(new.codigo, old.codigo), 'paciente', coalesce(new.paciente_nombre, old.paciente_nombre),
           'fecha', coalesce(new.fecha, old.fecha), 'hora', left((coalesce(new.hora, old.hora))::text, 5),
           'profesional', coalesce(new.profesional, old.profesional), 'tratamiento', coalesce(new.tratamiento, old.tratamiento),
           'antes', case when tg_op = 'UPDATE' then jsonb_build_object('estado', old.estado, 'fecha', old.fecha, 'hora', left((old.hora)::text, 5), 'profesional', old.profesional) end,
           'estado', coalesce(new.estado, old.estado), 'origen', coalesce(new.origen, old.origen));
    insert into historial (usuario, tipo, accion, detalle) values (quien(), 'reserva', a, d);
  elsif tg_table_name = 'bloqueos' then
    insert into historial (usuario, tipo, accion, detalle) values (quien(), 'bloqueo', case tg_op when 'INSERT' then 'bloqueó' when 'DELETE' then 'desbloqueó' else 'editó bloqueo' end,
      jsonb_build_object('profesional_id', coalesce(new.profesional_id, old.profesional_id), 'inicio', coalesce(new.inicio, old.inicio), 'fin', coalesce(new.fin, old.fin), 'motivo', coalesce(new.motivo, old.motivo)));
  elsif tg_table_name = 'config' then
    insert into historial (usuario, tipo, accion, detalle) values (quien(), 'pagina', 'editó la página',
      (select jsonb_build_object('secciones', coalesce(jsonb_agg(k), '[]'::jsonb)) from jsonb_object_keys(new.datos) k where new.datos -> k is distinct from old.datos -> k));
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists reservas_historial on public.reservas;
create trigger reservas_historial after insert or update or delete on public.reservas for each row execute function public.registrar_historial();
drop trigger if exists bloqueos_historial on public.bloqueos;
create trigger bloqueos_historial after insert or update or delete on public.bloqueos for each row execute function public.registrar_historial();
drop trigger if exists config_historial on public.config;
create trigger config_historial after update on public.config for each row when (old.datos is distinct from new.datos) execute function public.registrar_historial();

-- ---------- Reglas y horarios ----------

create or replace function public.regla(clave text, defecto numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select datos -> 'reglas' ->> clave from config where id = 1), '')::numeric, defecto);
$$;

create or replace function public.ahora_chile() returns timestamp
language sql stable as $$ select (now() at time zone 'America/Santiago'); $$;

-- Bloque de atención de un profesional en una fecha (su horario propio o el de la clínica)
create or replace function public.bloque_de(prof_id text, f date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cfg jsonb := (select datos from config where id = 1); hor jsonb; b jsonb;
begin
  select coalesce(nullif(x -> 'horario', '[]'::jsonb), cfg -> 'horario') into hor
  from jsonb_array_elements(cfg -> 'profesionales') x where x ->> 'id' = prof_id;
  hor := coalesce(hor, cfg -> 'horario', '[]'::jsonb);
  for b in select jsonb_array_elements(hor) loop
    if b -> 'dias' @> to_jsonb(extract(dow from f)::int) then return b; end if;
  end loop;
  return null;
end $$;

create or replace function public.cabe_en_horario(prof_id text, f date, h time, dur int) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare b jsonb := bloque_de(prof_id, f); paso int := regla('intervalo', 30)::int; ab time; ci time;
begin
  if b is null then return false; end if;
  ab := (b ->> 'abre')::time; ci := (b ->> 'cierra')::time;
  if h < ab or h + dur * interval '1 minute' > ci then return false; end if;
  if (extract(epoch from h - ab) / 60)::int % paso <> 0 then return false; end if;
  if b ? 'pausa' and h < (b -> 'pausa' ->> 1)::time and h + dur * interval '1 minute' > (b -> 'pausa' ->> 0)::time then return false; end if;
  return true;
end $$;

-- ---------- Funciones públicas ----------

-- Todo lo ocupado (citas y bloqueos) sin datos de pacientes
create or replace function public.disponibilidad(desde date, hasta date)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ocupadas', coalesce((select jsonb_agg(jsonb_build_object('p', r.profesional_id, 'f', r.fecha, 'h', left((r.hora)::text, 5), 'd', r.duracion))
                          from reservas r where r.estado <> 'cancelada' and r.fecha between desde and least(hasta, desde + 180)), '[]'::jsonb),
    'bloqueos', coalesce((select jsonb_agg(jsonb_build_object('p', b.profesional_id, 'i', b.inicio, 'f', b.fin))
                          from bloqueos b where b.fin >= desde::timestamp and b.inicio <= (least(hasta, desde + 180) + 1)::timestamp), '[]'::jsonb));
$$;

create or replace function public.reservar(p jsonb)
returns table (codigo text)
language plpgsql volatile security definer set search_path = public as $$
declare
  cfg jsonb := (select datos from config where id = 1);
  prof jsonb; trat jsonb; dur int;
  f date := (p ->> 'fecha')::date;
  h time := (p ->> 'hora')::time;
  v_ini timestamp; v_fin timestamp;
  tipo text := coalesce(p ->> 'doc_tipo', 'rut');
  doc text := doc_normal(tipo, p ->> 'doc');
  fono text := regexp_replace(coalesce(p ->> 'telefono', ''), '[^0-9+]', '', 'g');
  nombre text := btrim(coalesce(p ->> 'nombre', ''));
  mail text := nullif(btrim(coalesce(p ->> 'correo', '')), '');
  nuevo text;
begin
  select x into prof from jsonb_array_elements(cfg -> 'profesionales') x where x ->> 'id' = p ->> 'profesional_id' and coalesce((x ->> 'activo')::boolean, true);
  select x into trat from jsonb_array_elements(cfg -> 'tratamientos') x where x ->> 'id' = p ->> 'tratamiento_id' and coalesce((x ->> 'activo')::boolean, true);
  if prof is null or trat is null or not (prof -> 'tratamientos' ? (trat ->> 'id')) then raise exception 'datos_invalidos: profesional o tratamiento'; end if;
  dur := coalesce(nullif(trat ->> 'duracion', '')::int, regla('intervalo', 30)::int);
  if f is null or h is null then raise exception 'datos_invalidos: fecha'; end if;
  v_ini := f + h; v_fin := v_ini + dur * interval '1 minute';
  if v_ini < ahora_chile() + regla('anticipacion_min', 60) * interval '1 minute' then raise exception 'datos_invalidos: hora muy próxima'; end if;
  if f > ahora_chile()::date + regla('ventana_dias', 60)::int then raise exception 'datos_invalidos: fecha muy lejana'; end if;
  if not cabe_en_horario(prof ->> 'id', f, h, dur) then raise exception 'datos_invalidos: fuera de horario'; end if;
  if exists (select 1 from bloqueos b where (b.profesional_id is null or b.profesional_id = prof ->> 'id') and b.inicio < v_fin and b.fin > v_ini) then
    raise exception 'ocupada: horario bloqueado';
  end if;
  if tipo not in ('rut', 'pasaporte') or (tipo = 'rut' and not rut_valido(doc)) or (tipo = 'pasaporte' and length(doc) not between 5 and 20) then raise exception 'datos_invalidos: documento'; end if;
  if char_length(nombre) not between 3 and 120 then raise exception 'datos_invalidos: nombre'; end if;
  if length(regexp_replace(fono, '\D', '', 'g')) not between 8 and 12 then raise exception 'datos_invalidos: telefono'; end if;
  if mail is not null and (char_length(mail) > 160 or mail !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') then raise exception 'datos_invalidos: correo'; end if;
  if (select count(*) from reservas r where r.paciente_doc = doc and r.estado in ('pendiente', 'confirmada') and r.fecha >= ahora_chile()::date) >= regla('max_futuras', 3) then
    raise exception 'limite: el paciente ya tiene el máximo de horas futuras';
  end if;
  if (select count(*) from reservas r where r.creada > now() - interval '1 minute') >= 20 then raise exception 'limite: intente en un minuto'; end if;

  begin
    insert into reservas (fecha, hora, duracion, profesional_id, profesional, tratamiento_id, tratamiento,
                          paciente_nombre, paciente_doc_tipo, paciente_doc, prevision, telefono, correo, origen)
    values (f, h, dur, prof ->> 'id', prof ->> 'nombre', trat ->> 'id', trat ->> 'nombre',
            nombre, tipo, doc, left(p ->> 'prevision', 40), fono, mail, 'web')
    returning reservas.codigo into nuevo;
  exception when unique_violation or exclusion_violation then
    raise exception 'ocupada: esa hora se acaba de tomar';
  end;
  return query select nuevo;
end $$;

create or replace function public.cancelar_reserva(cod text, doc text)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare n int;
begin
  update reservas r set estado = 'cancelada', cancelada_por = 'paciente'
  where r.codigo = upper(btrim(cod)) and r.paciente_doc = doc_normal(r.paciente_doc_tipo, doc)
    and r.estado in ('pendiente', 'confirmada')
    and r.fecha + r.hora >= ahora_chile() + regla('cancelar_hasta_horas', 2) * interval '1 hour';
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Ficha de pacientes (se arma desde las reservas)
create or replace function public.pacientes(q text default '', lim int default 200)
returns table (doc_tipo text, doc text, nombre text, telefono text, correo text, prevision text,
               total bigint, atendidas bigint, no_asistio bigint, canceladas bigint, primera date, ultima date, proxima date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'sin_permiso'; end if;
  return query
  with base as (
    select r.*, row_number() over (partition by r.paciente_doc_tipo, r.paciente_doc order by r.creada desc) rn from reservas r
  )
  select b.paciente_doc_tipo, b.paciente_doc,
         max(b.paciente_nombre) filter (where b.rn = 1), max(b.telefono) filter (where b.rn = 1), max(b.correo) filter (where b.rn = 1), max(b.prevision) filter (where b.rn = 1),
         count(*) filter (where b.estado <> 'cancelada'), count(*) filter (where b.estado = 'atendida'), count(*) filter (where b.estado = 'no_asistio'), count(*) filter (where b.estado = 'cancelada'),
         min(b.fecha) filter (where b.estado <> 'cancelada'),
         max(b.fecha) filter (where b.estado in ('atendida', 'en_sala') or (b.estado <> 'cancelada' and b.fecha < ahora_chile()::date)),
         min(b.fecha) filter (where b.estado in ('pendiente', 'confirmada') and b.fecha >= ahora_chile()::date)
  from base b
  group by b.paciente_doc_tipo, b.paciente_doc
  having coalesce(q, '') = '' or bool_or(b.paciente_nombre ilike '%' || q || '%' or b.paciente_doc ilike '%' || upper(regexp_replace(q, '[^0-9kK]', '', 'g')) || '%' and length(regexp_replace(q, '[^0-9kK]', '', 'g')) >= 3 or b.telefono like '%' || regexp_replace(q, '\D', '', 'g') || '%' and length(regexp_replace(q, '\D', '', 'g')) >= 4)
  order by max(b.creada) desc
  limit lim;
end $$;

-- Estadísticas ampliadas
create or replace function public.resumen(desde date, hasta date)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not es_admin() then raise exception 'sin_permiso'; end if;
  with vis as (select * from visitas where (creada at time zone 'America/Santiago')::date between desde and hasta),
       res as (select * from reservas where (creada at time zone 'America/Santiago')::date between desde and hasta),
       cit as (select * from reservas where fecha between desde and hasta and estado <> 'cancelada')
  select jsonb_build_object(
    'visitas',     (select count(*) from vis where evento = 'visita'),
    'inicios',     (select count(*) from vis where evento = 'inicio_reserva'),
    'movil',       (select count(*) from vis where evento = 'visita' and movil),
    'reservas',    (select count(*) from res),
    'web',         (select count(*) from res where origen = 'web'),
    'canceladas',  (select count(*) from res where estado = 'cancelada'),
    'citas',       (select count(*) from cit),
    'minutos',     (select coalesce(sum(duracion), 0) from cit),
    'atendidas',   (select count(*) from cit where estado = 'atendida'),
    'no_asistio',  (select count(*) from cit where estado = 'no_asistio'),
    'pacientes_nuevos', (select count(*) from (select paciente_doc from reservas where estado <> 'cancelada' group by paciente_doc having min(fecha) between desde and hasta) t),
    'por_dia',     (select coalesce(jsonb_agg(jsonb_build_object('dia', g::date,
                      'visitas',  (select count(*) from vis where evento = 'visita' and (creada at time zone 'America/Santiago')::date = g::date),
                      'reservas', (select count(*) from res where (creada at time zone 'America/Santiago')::date = g::date),
                      'citas',    (select count(*) from cit where fecha = g::date)) order by g), '[]'::jsonb)
                    from generate_series(desde, hasta, interval '1 day') g),
    'por_tratamiento', (select coalesce(jsonb_object_agg(tratamiento, n), '{}'::jsonb) from (select tratamiento, count(*) n from cit group by 1) t),
    'por_profesional', (select coalesce(jsonb_object_agg(profesional, n), '{}'::jsonb) from (select profesional, count(*) n from cit group by 1) t),
    'por_estado',      (select coalesce(jsonb_object_agg(estado, n), '{}'::jsonb) from (select estado, count(*) n from res group by 1) t),
    'por_prevision',   (select coalesce(jsonb_object_agg(coalesce(prevision, 'Sin dato'), n), '{}'::jsonb) from (select prevision, count(*) n from cit group by 1) t),
    'por_hora',        (select coalesce(jsonb_object_agg(h, n), '{}'::jsonb) from (select left(hora::text, 2) h, count(*) n from cit group by 1) t),
    'origenes',        (select coalesce(jsonb_object_agg(origen, n), '{}'::jsonb) from (select coalesce(nullif(origen, ''), 'directo') origen, count(*) n from vis where evento = 'visita' group by 1 order by 2 desc limit 8) t)
  ) into v;
  return v;
end $$;

revoke all on function public.disponibilidad(date, date), public.pacientes(text, int), public.bloque_de(text, date),
                       public.cabe_en_horario(text, date, time, int), public.regla(text, numeric), public.quien() from public;
grant execute on function public.disponibilidad(date, date) to anon, authenticated;
grant execute on function public.pacientes(text, int), public.bloque_de(text, date), public.cabe_en_horario(text, date, time, int) to authenticated;
grant execute on function public.nuevo_codigo() to authenticated;

-- ---------- Avisos en tiempo real de nuevas reservas ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservas') then
    execute 'alter publication supabase_realtime add table public.reservas';
  end if;
end $$;

-- ---------- Valores iniciales de las reglas y duraciones ----------
update public.config set datos = jsonb_set(datos, '{reglas}',
  coalesce(datos -> 'reglas', '{}'::jsonb) || jsonb_build_object(
    'intervalo',            coalesce(datos -> 'reglas' -> 'intervalo', '30'::jsonb),
    'anticipacion_min',     coalesce(datos -> 'reglas' -> 'anticipacion_min', '60'::jsonb),
    'ventana_dias',         coalesce(datos -> 'reglas' -> 'ventana_dias', '60'::jsonb),
    'max_futuras',          coalesce(datos -> 'reglas' -> 'max_futuras', '3'::jsonb),
    'cancelar_hasta_horas', coalesce(datos -> 'reglas' -> 'cancelar_hasta_horas', '2'::jsonb)))
where id = 1;
update public.config set datos = jsonb_set(datos, '{tratamientos}', (
  select jsonb_agg(case when t ? 'duracion' then t else t || jsonb_build_object('duracion', case t ->> 'id' when 'endodoncia' then 60 when 'blanqueamiento' then 60 else 30 end) end)
  from jsonb_array_elements(datos -> 'tratamientos') t))
where id = 1 and jsonb_typeof(datos -> 'tratamientos') = 'array';
update public.config set datos = datos || jsonb_build_object('mensajes', jsonb_build_object(
  'confirmar',   'Hola {nombre}, le escribimos de {clinica} para confirmar su hora de {tratamiento} el {fecha} a las {hora} con {profesional}. ¿Nos confirma su asistencia? Dirección: {direccion}.',
  'recordatorio','Hola {nombre}, le recordamos su hora en {clinica} mañana {fecha} a las {hora} con {profesional}. Si no puede asistir, anúlela aquí: {enlace}',
  'reagendar',   'Hola {nombre}, de {clinica}: su hora quedó para el {fecha} a las {hora} con {profesional}. Su código es {codigo}.'))
where id = 1 and not (datos ? 'mensajes');
update public.config set datos = datos || jsonb_build_object('faq', jsonb_build_array(
  jsonb_build_object('q', '¿Cómo confirmo mi hora?', 'a', 'La hora queda guardada al reservar y recibe un código. La clínica puede escribirle por WhatsApp para confirmarla.'),
  jsonb_build_object('q', '¿Puedo cambiar o anular una hora?', 'a', 'Sí. Entre a “Mi reserva” con su código y su RUT y anule la hora. Para cambiarla, anúlela y reserve otra.'),
  jsonb_build_object('q', '¿Atienden urgencias?', 'a', 'Sí, según la disponibilidad del día. Elija “Urgencia” al reservar o escríbanos por WhatsApp.')))
where id = 1 and not (datos ? 'faq');
