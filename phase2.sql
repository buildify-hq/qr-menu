alter table staff drop constraint if exists staff_role_check;
alter table staff add constraint staff_role_check check(role in('chef','waiter','cashier'));
alter table staff add column if not exists can_bill bool default true, add column if not exists max_disc numeric default 100;
alter table restaurants add column if not exists floors jsonb default '[]'::jsonb;

create table if not exists dues(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,guest text not null,phone text,amount numeric not null check(amount>0),kind text not null check(kind in('due','paid')),mode text,bill_id uuid,note text,who text,created_at timestamptz default now());
create table if not exists expenses(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,cat text,note text,amount numeric not null check(amount>=0),mode text default 'Cash',spent_on date default current_date,created_at timestamptz default now());
create table if not exists audit(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,at timestamptz default now(),who text,role text,action text,detail text);
create index if not exists dues_rid on dues(rid,created_at desc);
create index if not exists exp_rid on expenses(rid,spent_on desc);
create index if not exists audit_rid on audit(rid,at desc);
alter table dues enable row level security;alter table expenses enable row level security;alter table audit enable row level security;
drop policy if exists d_all on dues;create policy d_all on dues for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
drop policy if exists e_all on expenses;create policy e_all on expenses for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
drop policy if exists a_sel on audit;create policy a_sel on audit for select using(owns(rid) or is_admin());
drop policy if exists a_ins on audit;create policy a_ins on audit for insert with check(owns(rid) or is_admin());

create or replace function _audit(r uuid,w text,ro text,a text,d text) returns void language sql security definer set search_path=public as $$insert into audit(rid,who,role,action,detail) values(r,w,ro,a,d)$$;
revoke all on function _audit(uuid,text,text,text,text) from public,anon,authenticated;

create or replace function staff_row(c text,p text) returns staff language sql security definer set search_path=public as $$select s.* from staff s join restaurants x on x.id=s.rid where x.code=c and s.pin=p and x.active and (x.valid_till is null or x.valid_till>=current_date) limit 1$$;

create or replace function staff_orders(c text,p text) returns json language sql security definer set search_path=public as $$
select json_build_object('tables',x.tables,'gst_on',x.gst_on,'gst_rate',x.gst_rate,'floors',coalesce(x.floors,'[]'::jsonb),
'me',(select json_build_object('name',s.name,'role',s.role,'can_bill',coalesce(s.can_bill,true),'max_disc',coalesce(s.max_disc,100)) from staff s where s.rid=x.id and s.pin=p limit 1),
'orders',coalesce((select json_agg(o order by o.created_at) from orders o where o.rid=x.id and o.created_at>now()-interval '18 hours' and o.status<>'cancelled' and (o.status in('new','preparing','ready') or o.bill_id is null)),'[]'::json),
'calls',coalesce((select json_agg(k) from calls k where k.rid=x.id and not k.done),'[]'::json),
'sessions',coalesce((select json_agg(json_build_object('tbl',s.tbl,'pin',s.pin)) from table_sessions s where s.rid=x.id and not s.closed and s.opened_at>now()-interval '4 hours'),'[]'::json))
from restaurants x where x.id=staff_rid(c,p)$$;

drop function if exists pay_table(text,text,text,text,numeric);
create or replace function pay_table(c text,p text,t text,mode text,disc numeric,gname text default null,gphone text default null) returns json language plpgsql security definer set search_path=public as $$
declare sr staff;v uuid;its jsonb;sub numeric;b uuid;r json;g record;tx numeric:=0;tot numeric;begin
sr:=staff_row(c,p);v:=sr.rid;if v is null then raise exception 'not_allowed';end if;
if coalesce(sr.can_bill,true)=false then raise exception 'You do not have billing permission';end if;
if mode not in('Cash','UPI','Card','Udhaar') then raise exception 'Invalid payment mode';end if;
if mode='Udhaar' and length(trim(coalesce(gname,'')))=0 then raise exception 'Enter guest name for Udhaar';end if;
select jsonb_agg(i),sum((i->>'price')::numeric*(i->>'qty')::int) into its,sub from orders o,jsonb_array_elements(o.items) i where o.rid=v and o.tbl=t and o.bill_id is null and o.status<>'cancelled';
if sub is null then raise exception 'No unpaid orders';end if;
disc:=least(greatest(coalesce(disc,0),0),sub);
if disc>sub*coalesce(sr.max_disc,100)/100+0.005 then raise exception 'Your discount limit is % percent',sr.max_disc;end if;
select gst_on,gst_rate,gstin into g from restaurants where id=v;
if g.gst_on then tx:=round((sub-disc)*coalesce(g.gst_rate,0)/100,2);end if;
tot:=sub-disc+tx;
insert into bills(rid,tbl,items,subtotal,discount,tax,gst_rate,gstin,total,mode) values(v,t,its,sub,disc,tx,case when g.gst_on then g.gst_rate else 0 end,case when g.gst_on then g.gstin end,tot,mode) returning id into b;
update orders set bill_id=b where rid=v and tbl=t and bill_id is null and status<>'cancelled';
update table_sessions set closed=true where rid=v and tbl=t;
if mode='Udhaar' and tot>0 then insert into dues(rid,guest,phone,amount,kind,bill_id,who,note) values(v,trim(gname),nullif(trim(coalesce(gphone,'')),''),tot,'due',b,sr.name,'Table '||t);end if;
perform _audit(v,sr.name,sr.role,'bill','Table '||t||' · Rs '||tot||' · '||mode||case when disc>0 then ' · discount Rs '||disc else '' end);
select row_to_json(x) into r from bills x where x.id=b;return r;end$$;

create or replace function staff_set(c text,p text,oid uuid,st text) returns void language plpgsql security definer set search_path=public as $$
declare sr staff;o orders;begin sr:=staff_row(c,p);if sr.id is null then raise exception 'not_allowed';end if;
update orders set status=st where id=oid and rid=sr.rid and st in('preparing','ready','served','cancelled') returning * into o;
if o.id is not null and st='cancelled' then perform _audit(sr.rid,sr.name,sr.role,'order_cancel','Table '||o.tbl||' · Rs '||o.total);end if;end$$;

create or replace function close_table(c text,p text,t text) returns void language plpgsql security definer set search_path=public as $$
declare sr staff;begin sr:=staff_row(c,p);if sr.id is null then return;end if;
update table_sessions set closed=true where rid=sr.rid and tbl=t and not closed;
if found then perform _audit(sr.rid,sr.name,sr.role,'table_close','Table '||t);end if;end$$;

create or replace function owner_set_floors(r_id uuid,fl jsonb,n int) returns void language plpgsql security definer set search_path=public as $$
begin if not (owns(r_id) or is_admin()) then raise exception 'Not allowed';end if;
update restaurants set floors=coalesce(fl,'[]'::jsonb),tables=least(greatest(coalesce(n,1),1),200) where id=r_id;
perform _audit(r_id,'Owner','owner','floors_update',n||' tables');end$$;

create or replace function owner_set_gst(r_id uuid,g text,rt numeric,on_ bool) returns void language plpgsql security definer set search_path=public as $$
begin
if not (owns(r_id) or is_admin()) then raise exception 'Not allowed';end if;
g:=upper(trim(coalesce(g,'')));
if g<>'' and g !~ '^[0-9A-Z]{15}$' then raise exception 'Enter a valid 15-character GSTIN';end if;
if on_ and g='' then raise exception 'Enter GSTIN to turn GST on';end if;
update restaurants set gstin=nullif(g,''),gst_rate=least(greatest(coalesce(rt,0),0),28),gst_on=on_ where id=r_id;
perform _audit(r_id,'Owner','owner','gst_update',case when on_ then 'On '||coalesce(rt,0)||'%' else 'Off' end);end$$;
