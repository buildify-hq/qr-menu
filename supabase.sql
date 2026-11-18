-- SJ Restaurant: पूर्ण नवीन setup. नवीन project साठी; जुने tables पुसले जातात.
drop table if exists calls,orders,menu,staff,table_sessions,restaurants,admins cascade;
drop function if exists is_admin(),owns(uuid),am_admin(),rest_info(text),get_menu(text),session_rid(text,text,text),place_order(text,text,text,jsonb,text),order_status(uuid),ring(text,text,text),staff_rid(text,text),staff_login(text,text),staff_login(text,text,text),staff_orders(text,text),staff_set(text,text,uuid,text),call_done(text,text,uuid),open_table(text,text,text),close_table(text,text,text) cascade;
create table admins(email text primary key);
create table restaurants(id uuid primary key default gen_random_uuid(),name text not null,code text unique not null,owner_email text not null,tables int default 10,active bool default true,created_at timestamptz default now());
create table menu(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,name text not null,emoji text default '🍽️',price numeric not null check(price>=0),cat text default 'Menu',available bool default true);
create table orders(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,tbl text,items jsonb,note text,total numeric,status text default 'new' check(status in('new','preparing','ready','served','cancelled')),created_at timestamptz default now());
create table calls(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,tbl text,done bool default false,created_at timestamptz default now());
create table staff(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,name text,pin text not null,role text check(role in('chef','waiter')),unique(rid,pin));
create table table_sessions(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,tbl text,pin text,closed bool default false,opened_at timestamptz default now());
alter table admins enable row level security;alter table restaurants enable row level security;alter table menu enable row level security;alter table orders enable row level security;alter table calls enable row level security;alter table staff enable row level security;alter table table_sessions enable row level security;
create function is_admin() returns bool language sql security definer stable set search_path=public as $$select exists(select 1 from admins where lower(email)=lower(auth.jwt()->>'email'))$$;
create function owns(r uuid) returns bool language sql security definer stable set search_path=public as $$select exists(select 1 from restaurants where id=r and lower(owner_email)=lower(auth.jwt()->>'email'))$$;
create function am_admin() returns bool language sql security definer stable set search_path=public as $$select is_admin()$$;
-- Owner/Admin: login केलेले लोक फक्त स्वतःचा डेटा बघतात. Anonymous ला थेट काहीही नाही.
create policy r_all on restaurants for all using(is_admin()) with check(is_admin());
create policy r_own on restaurants for select using(lower(owner_email)=lower(auth.jwt()->>'email'));
create policy m_all on menu for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
create policy o_all on orders for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
create policy c_all on calls for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
create policy s_all on staff for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
create policy t_all on table_sessions for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
-- Customer functions (QR)
create function rest_info(c text) returns json language sql security definer set search_path=public as $$select json_build_object('name',name,'tables',tables) from restaurants where code=c and active$$;
create function get_menu(c text) returns json language sql security definer set search_path=public as $$select coalesce(json_agg(json_build_object('id',m.id,'name',m.name,'emoji',m.emoji,'price',m.price,'cat',m.cat) order by m.cat,m.name),'[]'::json) from menu m join restaurants r on r.id=m.rid where r.code=c and r.active and m.available$$;
create function session_rid(c text,t text,p text) returns uuid language sql security definer set search_path=public as $$select s.rid from table_sessions s join restaurants r on r.id=s.rid where r.code=c and r.active and s.tbl=t and s.pin=p and not s.closed and s.opened_at>now()-interval '4 hours' order by s.opened_at desc limit 1$$;
create function place_order(c text,t text,p text,its jsonb,nt text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_rid uuid;v_items jsonb;v_total numeric;v_id uuid;begin
v_rid:=session_rid(c,t,p);if v_rid is null then raise exception 'bad_pin';end if;
select jsonb_agg(jsonb_build_object('name',m.name,'price',m.price,'qty',q.qty)),sum(m.price*q.qty) into v_items,v_total
from (select (i->>'id')::uuid id,least(greatest((i->>'qty')::int,1),20) qty from jsonb_array_elements(its) i) q join menu m on m.id=q.id and m.rid=v_rid and m.available;
if v_total is null then raise exception 'empty_order';end if;
insert into orders(rid,tbl,items,note,total) values(v_rid,t,v_items,left(nt,200),v_total) returning id into v_id;return v_id;end$$;
create function order_status(oid uuid) returns text language sql security definer set search_path=public as $$select status from orders where id=oid$$;
create function ring(c text,t text,p text) returns void language plpgsql security definer set search_path=public as $$
declare v uuid;begin v:=session_rid(c,t,p);if v is null then raise exception 'bad_pin';end if;insert into calls(rid,tbl) values(v,t);end$$;
-- Staff functions (restaurant code + PIN)
create function staff_rid(c text,p text) returns uuid language sql security definer set search_path=public as $$select s.rid from staff s join restaurants x on x.id=s.rid where x.code=c and s.pin=p and x.active limit 1$$;
create function staff_login(c text,p text) returns json language sql security definer set search_path=public as $$select json_build_object('name',s.name,'role',s.role,'rname',x.name) from staff s join restaurants x on x.id=s.rid where x.code=c and s.pin=p and x.active limit 1$$;
create function staff_orders(c text,p text) returns json language sql security definer set search_path=public as $$
select json_build_object('tables',x.tables,
'orders',coalesce((select json_agg(o order by o.created_at) from orders o where o.rid=x.id and o.created_at>now()-interval '18 hours' and o.status in('new','preparing','ready')),'[]'::json),
'calls',coalesce((select json_agg(k) from calls k where k.rid=x.id and not k.done),'[]'::json),
'sessions',coalesce((select json_agg(json_build_object('tbl',s.tbl,'pin',s.pin)) from table_sessions s where s.rid=x.id and not s.closed and s.opened_at>now()-interval '4 hours'),'[]'::json))
from restaurants x where x.id=staff_rid(c,p)$$;
create function staff_set(c text,p text,oid uuid,st text) returns void language sql security definer set search_path=public as $$update orders set status=st where id=oid and rid=staff_rid(c,p) and st in('preparing','ready','served','cancelled')$$;
create function call_done(c text,p text,cid uuid) returns void language sql security definer set search_path=public as $$update calls set done=true where id=cid and rid=staff_rid(c,p)$$;
create function open_table(c text,p text,t text) returns text language plpgsql security definer set search_path=public as $$
declare v uuid;n text;begin v:=staff_rid(c,p);if v is null then raise exception 'not_allowed';end if;
update table_sessions set closed=true where rid=v and tbl=t;n:=lpad((floor(random()*10000))::int::text,4,'0');
insert into table_sessions(rid,tbl,pin) values(v,t,n);return n;end$$;
create function close_table(c text,p text,t text) returns void language sql security definer set search_path=public as $$update table_sessions set closed=true where rid=staff_rid(c,p) and tbl=t$$;
-- Super Admin आणि demo
insert into admins values('sj201250@gmail.com');
insert into restaurants(name,code,owner_email) values('Demo Hotel','demo','sj201250@gmail.com');
insert into menu(rid,name,emoji,price,cat) select id,'Paneer Masala','🍛',180,'Main Course' from restaurants where code='demo';
insert into menu(rid,name,emoji,price,cat) select id,'Momos','🥟',90,'Starters' from restaurants where code='demo';
insert into menu(rid,name,emoji,price,cat) select id,'Cold Drink','🥤',40,'Drinks' from restaurants where code='demo';
