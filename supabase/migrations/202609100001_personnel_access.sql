-- Existing Supabase Auth accounts and passwords remain unchanged.
begin;
alter table public.erp_members add column is_admin boolean not null default false;
alter table public.erp_members add column permissions text[] not null default '{}';
alter table public.erp_members add column version integer not null default 1;

-- Preserve access previously available to existing members.
update public.erp_members set permissions = array[
 'dashboard:view','personal:view','personal:manage','ventas:view','ventas:manage',
 'pedidos:view','pedidos:manage','stock:view','stock:manage','compras:view','compras:manage',
 'produccion:view','produccion:manage','tesoreria:view','tesoreria:manage',
 'contabilidad:view','contabilidad:manage','reportes:view','reportes:manage','maestros:view','maestros:manage'
];
do $$ begin
 if not exists(select 1 from public.erp_members m join auth.users u on u.id=m.user_id where lower(u.email)='santi.achar@gmail.com' and m.enabled) then
  raise exception 'No se encontró la cuenta habilitada santi.achar@gmail.com. Verificar proyecto y membresía antes de migrar.';
 end if;
 update public.erp_members set is_admin=true where user_id in(select id from auth.users where lower(email)='santi.achar@gmail.com');
end $$;

create function public.erp_can(p_module text,p_action text default 'view') returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.erp_members where user_id=auth.uid() and enabled and
 (is_admin or (p_module||':view'=any(permissions) and p_module||':'||p_action=any(permissions))))
$$;
create function public.erp_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.erp_members where user_id=auth.uid() and enabled and is_admin)
$$;
create function public.erp_require_permission(p_module text,p_action text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not public.erp_can(p_module,p_action) then raise exception 'No tenés permiso para esta operación' using errcode='42501'; end if;
end $$;

create table public.erp_access_events (
 id uuid primary key default gen_random_uuid(), actor uuid not null references auth.users(id),
 target uuid not null references auth.users(id), details jsonb not null, created_at timestamptz not null default now()
);
alter table public.erp_access_events enable row level security;
revoke all on public.erp_access_events from public,anon,authenticated;
grant select on public.erp_access_events to authenticated;
create policy admins_read_access_events on public.erp_access_events for select to authenticated using(public.erp_is_admin());

create function public.erp_list_members() returns table(user_id uuid,email text,enabled boolean,is_admin boolean,permissions text[],version integer)
language plpgsql security definer set search_path='' as $$ begin
 if not public.erp_is_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
 return query select m.user_id,u.email::text,m.enabled,m.is_admin,m.permissions,m.version from public.erp_members m join auth.users u on u.id=m.user_id order by u.email;
end $$;

create function public.erp_set_access(p_email text,p_enabled boolean,p_is_admin boolean,p_permissions text[],p_version integer default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare target_id uuid; previous public.erp_members; k text;
begin
 -- Serialize access changes so concurrent demotions cannot remove all admins.
 perform pg_advisory_xact_lock(9182401);
 if not public.erp_is_admin() then raise exception 'Solo administradores' using errcode='42501'; end if;
 if p_enabled is null or p_is_admin is null or p_permissions is null then raise exception 'Datos de acceso incompletos'; end if;
 foreach k in array p_permissions loop
  if k is null or k !~ '^(dashboard|personal|ventas|pedidos|stock|compras|produccion|tesoreria|contabilidad|reportes|maestros):(view|manage)$' then raise exception 'Permiso inválido'; end if;
  if k like '%:manage' and not replace(k,':manage',':view')=any(p_permissions) then raise exception 'Operar requiere Ver'; end if;
 end loop;
 select id into target_id from auth.users where lower(email)=lower(trim(p_email));
 if target_id is null then raise exception 'La cuenta no existe en Supabase Auth. Primero invitá al usuario en el proyecto existente.'; end if;
 select * into previous from public.erp_members where user_id=target_id for update;
 if found and (p_version is null or p_version<>previous.version) then raise exception 'El acceso cambió. Actualizá la lista antes de guardar.' using errcode='40001'; end if;
 if previous.user_id is null and p_version is not null then raise exception 'Membresía inexistente'; end if;
 if previous.enabled and previous.is_admin and (not p_enabled or not p_is_admin) and
 (select count(*) from public.erp_members where enabled and is_admin)<=1 then raise exception 'Debe quedar un administrador activo'; end if;
 insert into public.erp_members(user_id,enabled,is_admin,permissions) values(target_id,p_enabled,p_is_admin,p_permissions)
 on conflict(user_id) do update set enabled=excluded.enabled,is_admin=excluded.is_admin,permissions=excluded.permissions,version=public.erp_members.version+1;
 insert into public.erp_access_events(actor,target,details) values(auth.uid(),target_id,jsonb_build_object('email',p_email,'enabled',p_enabled,'is_admin',p_is_admin,'permissions',p_permissions));
 return target_id;
end $$;

create table public.erp_employees (
 id uuid primary key default gen_random_uuid(), employee_number text not null unique,
 document_number text not null unique, payload jsonb not null, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.erp_employees enable row level security;
revoke all on public.erp_employees from public,anon,authenticated;
grant select on public.erp_employees to authenticated;
create policy personnel_read on public.erp_employees for select to authenticated using(public.erp_can('personal','view'));
create function public.erp_save_employee(p_id uuid,p_version integer,p_payload jsonb) returns public.erp_employees
language plpgsql security definer set search_path='' as $$
declare saved public.erp_employees; doc text; num text; k text; clean jsonb; hire date;
begin
 perform public.erp_require_permission('personal','manage');
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Legajo inválido'; end if;
 foreach k in array array['employeeNumber','documentNumber','firstName','lastName','hireDate'] loop
  if coalesce(trim(p_payload->>k),'')='' then raise exception 'Falta un campo obligatorio: %',k; end if;
 end loop;
 foreach k in array array['employeeNumber','documentNumber','firstName','lastName','email','phone','address','department','position','hireDate','notes'] loop
  if p_payload ? k and jsonb_typeof(p_payload->k)<>'string' then raise exception 'Campo inválido: %',k; end if;
  if length(coalesce(p_payload->>k,'')) > (case when k='notes' then 3000 when k='address' then 300 else 254 end) then raise exception 'Campo demasiado largo: %',k; end if;
 end loop;
 if p_payload->>'hireDate' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha inválida'; end if;
 hire := (p_payload->>'hireDate')::date;
 if jsonb_typeof(p_payload->'isActive') is distinct from 'boolean' then raise exception 'Estado inválido'; end if;
 doc:=regexp_replace(p_payload->>'documentNumber','[.\s-]','','g');
 num:=upper(trim(p_payload->>'employeeNumber'));
 if doc !~ '^\d{7,8}$' then raise exception 'El DNI debe tener 7 u 8 dígitos'; end if;
 if length(num)>30 then raise exception 'Legajo demasiado largo'; end if;
 if coalesce(p_payload->>'email','')<>'' and p_payload->>'email' !~ '^[^ @]+@[^ @]+\.[^ @]+$' then raise exception 'Email inválido'; end if;
 clean:=jsonb_build_object('employeeNumber',num,'documentNumber',doc,'hireDate',to_char(hire,'YYYY-MM-DD'),'isActive',p_payload->'isActive');
 foreach k in array array['firstName','lastName','email','phone','address','department','position','notes'] loop
  clean:=clean||jsonb_build_object(k,trim(coalesce(p_payload->>k,'')));
 end loop;
 if p_id is null then
  insert into public.erp_employees(employee_number,document_number,payload) values(num,doc,clean) returning * into saved;
 else
  update public.erp_employees set employee_number=num,document_number=doc,payload=clean,version=version+1,updated_at=now()
  where id=p_id and version=p_version returning * into saved;
  if not found then raise exception 'El legajo cambió o no existe. Actualizá la lista.' using errcode='40001'; end if;
 end if;
 return saved;
exception when unique_violation then raise exception 'Ya existe un empleado con ese legajo o DNI';
end $$;

drop policy members_read_orders on public.erp_orders;
drop policy members_read_notes on public.erp_delivery_notes;
drop policy members_read_events on public.erp_order_events;
create policy permitted_read_orders on public.erp_orders for select to authenticated using(public.erp_can('pedidos','view'));
create policy permitted_read_notes on public.erp_delivery_notes for select to authenticated using(public.erp_can('pedidos','view'));
create policy permitted_read_events on public.erp_order_events for select to authenticated using(public.erp_can('pedidos','view'));
-- Existing order RPCs already call this internal guard before writing.
create or replace function public.erp_require_member() returns void language plpgsql security definer set search_path='' as $$ begin
 perform public.erp_require_permission('pedidos','manage');
end $$;

revoke all on function public.erp_can(text,text),public.erp_is_admin(),public.erp_require_permission(text,text),public.erp_list_members(),public.erp_set_access(text,boolean,boolean,text[],integer),public.erp_save_employee(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.erp_can(text,text),public.erp_is_admin(),public.erp_list_members(),public.erp_set_access(text,boolean,boolean,text[],integer),public.erp_save_employee(uuid,integer,jsonb) to authenticated;
commit;
