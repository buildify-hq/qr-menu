alter table restaurants add column if not exists valid_till date;
alter table menu add column if not exists veg bool default true;
alter table orders add column if not exists bill_id uuid;
create table if not exists bills(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,tbl text,items jsonb,subtotal numeric,discount numeric default 0,total numeric,mode text,created_at timestamptz default now());
alter table bills enable row level security;
drop policy if exists b_all on bills;
create policy b_all on bills for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
create or replace function rest_resolve(c text) returns json language sql security definer set search_path=public as $$
select json_build_object('code',code,'email',owner_email,'name',name) from restaurants where active and (lower(code)=lower(trim(c)) or lower(name)=lower(trim(c))) limit 1$$;
create or replace function rest_info(c text) returns json language sql security definer set search_path=public as $$select json_build_object('name',name,'tables',tables) from restaurants where code=c and active and (valid_till is null or valid_till>=current_date)$$;
create or replace function get_menu(c text) returns json language sql security definer set search_path=public as $$select coalesce(json_agg(json_build_object('id',m.id,'name',m.name,'emoji',m.emoji,'price',m.price,'cat',m.cat,'veg',m.veg) order by m.cat,m.name),'[]'::json) from menu m join restaurants r on r.id=m.rid where r.code=c and r.active and (r.valid_till is null or r.valid_till>=current_date) and m.available$$;
create or replace function session_rid(c text,t text,p text) returns uuid language sql security definer set search_path=public as $$select s.rid from table_sessions s join restaurants r on r.id=s.rid where r.code=c and r.active and (r.valid_till is null or r.valid_till>=current_date) and s.tbl=t and s.pin=p and not s.closed and s.opened_at>now()-interval '4 hours' order by s.opened_at desc limit 1$$;
create or replace function staff_rid(c text,p text) returns uuid language sql security definer set search_path=public as $$select s.rid from staff s join restaurants x on x.id=s.rid where x.code=c and s.pin=p and x.active and (x.valid_till is null or x.valid_till>=current_date) limit 1$$;
create or replace function staff_login(c text,p text) returns json language sql security definer set search_path=public as $$select json_build_object('name',s.name,'role',s.role,'rname',x.name) from staff s join restaurants x on x.id=s.rid where x.code=c and s.pin=p and x.active and (x.valid_till is null or x.valid_till>=current_date) limit 1$$;
create or replace function staff_orders(c text,p text) returns json language sql security definer set search_path=public as $$
select json_build_object('tables',x.tables,
'orders',coalesce((select json_agg(o order by o.created_at) from orders o where o.rid=x.id and o.created_at>now()-interval '18 hours' and o.status<>'cancelled' and (o.status in('new','preparing','ready') or o.bill_id is null)),'[]'::json),
'calls',coalesce((select json_agg(k) from calls k where k.rid=x.id and not k.done),'[]'::json),
'sessions',coalesce((select json_agg(json_build_object('tbl',s.tbl,'pin',s.pin)) from table_sessions s where s.rid=x.id and not s.closed and s.opened_at>now()-interval '4 hours'),'[]'::json))
from restaurants x where x.id=staff_rid(c,p)$$;
create or replace function pay_table(c text,p text,t text,mode text,disc numeric) returns json language plpgsql security definer set search_path=public as $$
declare v uuid;its jsonb;sub numeric;b uuid;r json;begin
v:=staff_rid(c,p);if v is null then raise exception 'not_allowed';end if;
select jsonb_agg(i),sum((i->>'price')::numeric*(i->>'qty')::int) into its,sub from orders o,jsonb_array_elements(o.items) i where o.rid=v and o.tbl=t and o.bill_id is null and o.status<>'cancelled';
if sub is null then raise exception 'No unpaid orders';end if;
disc:=least(greatest(coalesce(disc,0),0),sub);
insert into bills(rid,tbl,items,subtotal,discount,total,mode) values(v,t,its,sub,disc,sub-disc,mode) returning id into b;
update orders set bill_id=b where rid=v and tbl=t and bill_id is null and status<>'cancelled';
update table_sessions set closed=true where rid=v and tbl=t;
select row_to_json(x) into r from bills x where x.id=b;return r;end$$;
