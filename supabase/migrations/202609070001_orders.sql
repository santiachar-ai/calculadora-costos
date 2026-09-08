-- Single-company ERP. Only explicitly enabled members can access operational data.
create table public.erp_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true
);
create table public.erp_orders (
 id uuid primary key default gen_random_uuid(),
 number bigint generated always as identity unique,
 payload jsonb not null,
 version integer not null default 1,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.erp_delivery_notes (
 id uuid primary key default gen_random_uuid(),
 number bigint generated always as identity unique,
 order_id uuid not null references public.erp_orders(id),
 payload jsonb not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index on public.erp_delivery_notes(order_id);
create table public.erp_order_events (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.erp_orders(id),
 actor uuid not null references auth.users(id),
 event text not null,
 payload jsonb not null,
 created_at timestamptz not null default now()
);
create index on public.erp_order_events(order_id);
alter table public.erp_members enable row level security;
alter table public.erp_orders enable row level security;
alter table public.erp_delivery_notes enable row level security;
alter table public.erp_order_events enable row level security;
revoke all on public.erp_members, public.erp_orders, public.erp_delivery_notes, public.erp_order_events from anon, authenticated;
grant select on public.erp_members, public.erp_orders, public.erp_delivery_notes, public.erp_order_events to authenticated;
create policy own_membership on public.erp_members for select to authenticated using (user_id = (select auth.uid()));
create policy members_read_orders on public.erp_orders for select to authenticated using (exists (select 1 from public.erp_members where user_id = (select auth.uid()) and enabled));
create policy members_read_notes on public.erp_delivery_notes for select to authenticated using (exists (select 1 from public.erp_members where user_id = (select auth.uid()) and enabled));
create policy members_read_events on public.erp_order_events for select to authenticated using (exists (select 1 from public.erp_members where user_id = (select auth.uid()) and enabled));

create function public.erp_require_member() returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.erp_members where user_id=auth.uid() and enabled) then
  raise exception 'Usuario no habilitado para el ERP' using errcode='42501';
 end if;
end $$;

create function public.erp_save_order(p_id uuid, p_version integer, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
 old public.erp_orders; saved_id uuid; item jsonb; old_item jsonb; qty numeric; sent numeric; next_state text;
begin
 perform public.erp_require_member();
 if jsonb_typeof(p_payload) is distinct from 'object' or length(p_payload::text)>100000 then raise exception 'Pedido inválido'; end if;
 if coalesce(length(trim(p_payload->>'cliente')),0)=0 or coalesce(length(trim(p_payload->>'transporte')),0)=0 then raise exception 'Complete cliente y transporte'; end if;
 if nullif(p_payload->>'fechaPedido','')::date is null or nullif(p_payload->>'fechaEntrega','')::date is null then raise exception 'Complete las fechas'; end if;
 if jsonb_typeof(p_payload->'items') is distinct from 'array' then raise exception 'Artículos inválidos'; end if;
 if jsonb_array_length(p_payload->'items') not between 1 and 100 then raise exception 'Cargue entre 1 y 100 artículos'; end if;
 if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(p_payload->'items') x) then raise exception 'Artículos duplicados'; end if;
 for item in select * from jsonb_array_elements(p_payload->'items') loop
  if nullif(item->>'id','')::uuid is null or coalesce(length(trim(item->>'articulo')),0)=0 or coalesce(item->>'unidad','') not in ('L','KG','TN','UN','IBC','BIDON') then raise exception 'Artículo inválido'; end if;
  if jsonb_typeof(item->'cantidad') is distinct from 'number' then raise exception 'Cantidad inválida'; end if;
  qty := (item->>'cantidad')::numeric;
  if qty<=0 or qty>1000000000 then raise exception 'La cantidad debe ser positiva'; end if;
 end loop;
 next_state := p_payload->>'estado';
 if next_state is null or next_state not in ('BORRADOR','CONFIRMADO','PREPARACION','PARCIAL','DESPACHADO','CANCELADO') then raise exception 'Estado inválido'; end if;
 if p_id is null then
  if next_state in ('PARCIAL','DESPACHADO') then raise exception 'El estado entregado se calcula a partir de remitos'; end if;
  insert into public.erp_orders(payload,created_by) values(p_payload,auth.uid()) returning id into saved_id;
 else
  select * into old from public.erp_orders where id=p_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if p_version is distinct from old.version then raise exception 'El pedido cambió en otra sesión. Actualice y vuelva a intentar'; end if;
  if old.payload->>'estado' in ('CANCELADO','DESPACHADO') then raise exception 'El pedido está cerrado'; end if;
  if exists(select 1 from public.erp_delivery_notes where order_id=p_id) then
   if p_payload->>'cliente' is distinct from old.payload->>'cliente' then raise exception 'No puede cambiar el cliente de un pedido remitido'; end if;
   if next_state not in ('PARCIAL','CANCELADO') then raise exception 'Un pedido parcialmente remitido solo admite editar o cancelar su saldo'; end if;
   for old_item in select * from jsonb_array_elements(old.payload->'items') loop
    select coalesce(sum((i->>'cantidad')::numeric),0) into sent from public.erp_delivery_notes n cross join lateral jsonb_array_elements(n.payload->'items') i where n.order_id=p_id and i->>'id'=old_item->>'id';
    select x into item from jsonb_array_elements(p_payload->'items') x where x->>'id'=old_item->>'id';
    if sent>0 and (item is null or (item->>'cantidad')::numeric<sent or item->>'articulo' is distinct from old_item->>'articulo' or item->>'unidad' is distinct from old_item->>'unidad') then raise exception 'No modifique artículos remitidos ni reduzca su cantidad por debajo de lo entregado'; end if;
   end loop;
   if next_state <> 'CANCELADO' and not exists (
    select 1 from jsonb_array_elements(p_payload->'items') x where (x->>'cantidad')::numeric > (select coalesce(sum((i->>'cantidad')::numeric),0) from public.erp_delivery_notes n cross join lateral jsonb_array_elements(n.payload->'items') i where n.order_id=p_id and i->>'id'=x->>'id')
   ) then next_state := 'DESPACHADO'; end if;
  elsif next_state in ('PARCIAL','DESPACHADO') then raise exception 'El estado entregado se calcula a partir de remitos'; end if;
  update public.erp_orders set payload=jsonb_set(p_payload,'{estado}',to_jsonb(next_state)),version=version+1,updated_at=now() where id=p_id;
  saved_id := p_id;
 end if;
 insert into public.erp_order_events(order_id,actor,event,payload) values(saved_id,auth.uid(),case when p_id is null then 'CREADO' else 'ACTUALIZADO' end,jsonb_build_object('before',old.payload,'after',p_payload));
 return saved_id;
end $$;

create function public.erp_issue_note(p_order_id uuid, p_version integer, p_items jsonb, p_date date, p_confirm boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare o public.erp_orders; request_item jsonb; original jsonb; qty numeric; sent numeric; note_items jsonb := '[]'; note_id uuid; next_state text;
begin
 perform public.erp_require_member();
 if p_confirm is distinct from true then raise exception 'Confirme manualmente la emisión'; end if;
 if p_date is null then raise exception 'Seleccione fecha del remito'; end if;
 select * into o from public.erp_orders where id=p_order_id for update;
 if not found then raise exception 'Pedido no encontrado'; end if;
 if o.version is distinct from p_version then raise exception 'El pedido cambió en otra sesión. Actualice y vuelva a intentar'; end if;
 if o.payload->>'estado' not in ('CONFIRMADO','PREPARACION','PARCIAL') then raise exception 'El pedido debe estar confirmado y tener saldo pendiente'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Entrega inválida'; end if;
 if jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Seleccione artículos para entregar'; end if;
 if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(p_items) x) then raise exception 'No repita artículos'; end if;
 for request_item in select * from jsonb_array_elements(p_items) loop
  select x into original from jsonb_array_elements(o.payload->'items') x where x->>'id'=request_item->>'id';
  if original is null or jsonb_typeof(request_item->'cantidad') is distinct from 'number' then raise exception 'Artículo inválido'; end if;
  qty := (request_item->>'cantidad')::numeric;
  select coalesce(sum((x->>'cantidad')::numeric),0) into sent from public.erp_delivery_notes n cross join lateral jsonb_array_elements(n.payload->'items') x where n.order_id=p_order_id and x->>'id'=request_item->>'id';
  if qty<=0 or qty+sent>(original->>'cantidad')::numeric then raise exception 'La cantidad supera el saldo pendiente o es inválida'; end if;
  note_items := note_items || jsonb_build_array(jsonb_set(original,'{cantidad}',to_jsonb(qty)));
 end loop;
 insert into public.erp_delivery_notes(order_id,payload,created_by) values(p_order_id,o.payload || jsonb_build_object('items',note_items,'fechaRemito',p_date,'estado','EMITIDO'),auth.uid()) returning id into note_id;
 select case when exists(
  select 1 from jsonb_array_elements(o.payload->'items') x where (x->>'cantidad')::numeric > (select coalesce(sum((i->>'cantidad')::numeric),0) from public.erp_delivery_notes n cross join lateral jsonb_array_elements(n.payload->'items') i where n.order_id=p_order_id and i->>'id'=x->>'id')
 ) then 'PARCIAL' else 'DESPACHADO' end into next_state;
 update public.erp_orders set payload=jsonb_set(payload,'{estado}',to_jsonb(next_state)),version=version+1,updated_at=now() where id=p_order_id;
 insert into public.erp_order_events(order_id,actor,event,payload) values(p_order_id,auth.uid(),'REMITO_EMITIDO',jsonb_build_object('remitoId',note_id,'items',note_items));
 return note_id;
end $$;
revoke all on function public.erp_require_member(), public.erp_save_order(uuid,integer,jsonb), public.erp_issue_note(uuid,integer,jsonb,date,boolean) from public, anon, authenticated;
grant execute on function public.erp_save_order(uuid,integer,jsonb), public.erp_issue_note(uuid,integer,jsonb,date,boolean) to authenticated;
