create table restaurants(id uuid primary key default gen_random_uuid(),name text not null,code text unique not null,owner_email text,tables int default 10,active bool default true,features jsonb default '{"bell":true,"track":true,"waiter":true}',created_at timestamptz default now());
create table menu(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,name text,emoji text default '🍽️',price numeric,cat text default 'मेनू',available bool default true);
create table orders(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,tbl text,items jsonb,note text,status text default 'new',created_at timestamptz default now());
create table calls(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,tbl text,done bool default false,created_at timestamptz default now());
create table staff(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,name text,pin text,role text check(role in('chef','waiter')),unique(rid,pin));
create table admins(email text primary key);
alter table restaurants enable row level security;alter table menu enable row level security;alter table orders enable row level security;alter table calls enable row level security;alter table staff enable row level security;alter table admins enable row level security;
create function is_admin() returns bool language sql security definer stable as $$select exists(select 1 from admins where email=auth.jwt()->>'email')$$;
create function owns(r uuid) returns bool language sql security definer stable as $$select exists(select 1 from restaurants where id=r and owner_email=auth.jwt()->>'email')$$;
create policy r_read on restaurants for select using(true);
create policy r_adm on restaurants for all using(is_admin()) with check(is_admin());
create policy m_read on menu for select using(true);
create policy m_own on menu for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
create policy o_sel on orders for select using(true);
create policy o_ins on orders for insert with check(true);
create policy o_upd on orders for update using(true);
create policy c_sel on calls for select using(true);
create policy c_ins on calls for insert with check(true);
create policy c_upd on calls for update using(true);
create policy s_own on staff for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
create function staff_login(c text,p text,r text) returns json language sql security definer as $$select json_build_object('rid',s.rid,'name',s.name) from staff s join restaurants x on x.id=s.rid where x.code=c and s.pin=p and s.role=r and x.active and (r='chef' or coalesce((x.features->>'waiter')::bool,true)) limit 1$$;
alter publication supabase_realtime add table orders,calls;
-- तुमचा ईमेल Super Admin म्हणून टाका:
insert into admins values('your@email.com');
-- डेमो रेस्टॉरंट (ऐच्छिक):
insert into restaurants(name,code,owner_email) values('डेमो हॉटेल','demo','your@email.com');
insert into menu(rid,name,emoji,price,cat) select id,'पनीर मसाला','🍛',180,'मेन कोर्स' from restaurants where code='demo';
insert into menu(rid,name,emoji,price,cat) select id,'मोमोज','🥟',90,'स्टार्टर' from restaurants where code='demo';
insert into menu(rid,name,emoji,price,cat) select id,'कोल्ड्रिंक','🥤',40,'ड्रिंक्स' from restaurants where code='demo';
