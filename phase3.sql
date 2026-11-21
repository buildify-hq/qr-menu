alter table orders add column if not exists stock_done bool default false;
create table if not exists suppliers(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,name text not null,phone text,note text,created_at timestamptz default now());
create table if not exists stock_items(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,name text not null,unit text not null default 'kg',qty numeric not null default 0,min_qty numeric not null default 0,cost numeric not null default 0,supplier_id uuid references suppliers on delete set null,active bool default true,created_at timestamptz default now());
create table if not exists stock_moves(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,item_id uuid references stock_items on delete cascade,kind text not null check(kind in('in','out','waste','adjust','sale')),qty numeric not null,cost numeric,supplier_id uuid references suppliers on delete set null,note text,who text,created_at timestamptz default now());
create table if not exists recipes(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,menu_id uuid references menu on delete cascade,item_id uuid references stock_items on delete cascade,qty numeric not null check(qty>0),unique(menu_id,item_id));
create table if not exists riders(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,name text not null,phone text,pay_per_run numeric default 0,active bool default true,created_at timestamptz default now());
create table if not exists deliveries(id uuid primary key default gen_random_uuid(),rid uuid references restaurants on delete cascade,no int,cust_name text not null,phone text,address text,order_id uuid references orders on delete set null,items jsonb,subtotal numeric default 0,fee numeric default 0,total numeric default 0,status text default 'new' check(status in('new','out','delivered','cancelled')),rider_id uuid references riders on delete set null,mode text,bill_id uuid,settled bool default false,note text,created_at timestamptz default now(),out_at timestamptz,done_at timestamptz);
create index if not exists si_rid on stock_items(rid);create index if not exists sm_item on stock_moves(item_id,created_at desc);create index if not exists rc_menu on recipes(menu_id);create index if not exists dv_rid on deliveries(rid,created_at desc);
alter table suppliers enable row level security;alter table stock_items enable row level security;alter table stock_moves enable row level security;alter table recipes enable row level security;alter table riders enable row level security;alter table deliveries enable row level security;
drop policy if exists sp_all on suppliers;create policy sp_all on suppliers for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
drop policy if exists si_all on stock_items;create policy si_all on stock_items for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
drop policy if exists sm_sel on stock_moves;create policy sm_sel on stock_moves for select using(owns(rid) or is_admin());
drop policy if exists rc_all on recipes;create policy rc_all on recipes for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
drop policy if exists rd_all on riders;create policy rd_all on riders for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());
drop policy if exists dv_all on deliveries;create policy dv_all on deliveries for all using(owns(rid) or is_admin()) with check(owns(rid) or is_admin());

create or replace function _consume(o orders) returns void language plpgsql security definer set search_path=public as $$
declare i jsonb;mid uuid;f numeric;rc record;begin
for i in select value from jsonb_array_elements(o.items) loop
 mid:=coalesce(nullif(i->>'mid','')::uuid,(select m.id from menu m where m.rid=o.rid and m.name=regexp_replace(i->>'name',' \([^)]*\)$','') limit 1));
 f:=coalesce((i->>'f')::numeric,1)*coalesce((i->>'qty')::numeric,1);
 if mid is null then continue;end if;
 for rc in select r.item_id,r.qty from recipes r where r.menu_id=mid loop
  update stock_items set qty=qty-rc.qty*f where id=rc.item_id;
  insert into stock_moves(rid,item_id,kind,qty,note,who) values(o.rid,rc.item_id,'sale',-rc.qty*f,'Order '||o.tbl,'Auto');
 end loop;
end loop;
update orders set stock_done=true where id=o.id;end$$;
create or replace function _restore(o orders) returns void language plpgsql security definer set search_path=public as $$
declare i jsonb;mid uuid;f numeric;rc record;begin
for i in select value from jsonb_array_elements(o.items) loop
 mid:=coalesce(nullif(i->>'mid','')::uuid,(select m.id from menu m where m.rid=o.rid and m.name=regexp_replace(i->>'name',' \([^)]*\)$','') limit 1));
 f:=coalesce((i->>'f')::numeric,1)*coalesce((i->>'qty')::numeric,1);
 if mid is null then continue;end if;
 for rc in select r.item_id,r.qty from recipes r where r.menu_id=mid loop
  update stock_items set qty=qty+rc.qty*f where id=rc.item_id;
  insert into stock_moves(rid,item_id,kind,qty,note,who) values(o.rid,rc.item_id,'sale',rc.qty*f,'Cancelled '||o.tbl,'Auto');
 end loop;
end loop;
update orders set stock_done=false where id=o.id;end$$;
revoke all on function _consume(orders) from public,anon,authenticated;
revoke all on function _restore(orders) from public,anon,authenticated;

create or replace function place_order(c text,t text,p text,its jsonb,nt text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_rid uuid;v_items jsonb;v_total numeric;v_id uuid;begin
v_rid:=session_rid(c,t,p);if v_rid is null then raise exception 'bad_pin';end if;
select jsonb_agg(jsonb_build_object('name',x.nm,'price',x.pr,'qty',x.qty,'mid',x.mid,'f',x.f)),sum(x.pr*x.qty) into v_items,v_total from (
 select case when sp.p is not null then m.name||' ('||q.sz||')' else m.name end nm,coalesce(sp.p,m.price) pr,q.qty,m.id mid,coalesce(sp.f,1) f
 from (select (i->>'id')::uuid id,least(greatest((i->>'qty')::int,1),20) qty,nullif(i->>'sz','') sz from jsonb_array_elements(its) i) q
 join menu m on m.id=q.id and m.rid=v_rid and m.available
 left join lateral (select (s->>'p')::numeric p,coalesce((s->>'f')::numeric,1) f from jsonb_array_elements(coalesce(m.sizes,'[]'::jsonb)) s where s->>'n'=q.sz limit 1) sp on true) x;
if v_total is null then raise exception 'empty_order';end if;
insert into orders(rid,tbl,items,note,total) values(v_rid,t,v_items,left(nt,200),v_total) returning id into v_id;return v_id;end$$;

create or replace function staff_set(c text,p text,oid uuid,st text) returns void language plpgsql security definer set search_path=public as $$
declare sr staff;o orders;begin sr:=staff_row(c,p);if sr.id is null then raise exception 'not_allowed';end if;
update orders set status=st where id=oid and rid=sr.rid and st in('preparing','ready','served','cancelled') returning * into o;
if o.id is null then return;end if;
if st in('preparing','ready') and not coalesce(o.stock_done,false) then perform _consume(o);
elsif st='cancelled' then
 if coalesce(o.stock_done,false) then perform _restore(o);end if;
 perform _audit(sr.rid,sr.name,sr.role,'order_cancel','Table '||o.tbl||' · Rs '||o.total);
end if;end$$;

create or replace function stock_move(r_id uuid,it uuid,k text,q numeric,uc numeric default null,sup uuid default null,nt text default null) returns void language plpgsql security definer set search_path=public as $$
declare s stock_items;d numeric;begin
if not (owns(r_id) or is_admin()) then raise exception 'Not allowed';end if;
select * into s from stock_items where id=it and rid=r_id for update;if s.id is null then raise exception 'Item not found';end if;
if k='in' then
 if q<=0 then raise exception 'Quantity must be more than 0';end if;d:=q;
 update stock_items set cost=case when uc is null then cost when qty>0 then round((qty*cost+q*uc)/(qty+q),4) else uc end,qty=qty+q,supplier_id=coalesce(sup,supplier_id) where id=it;
elsif k in('waste','out') then
 if q<=0 then raise exception 'Quantity must be more than 0';end if;d:=-q;update stock_items set qty=qty-q where id=it;
elsif k='adjust' then
 if q<0 then raise exception 'Count cannot be negative';end if;d:=q-s.qty;update stock_items set qty=q where id=it;
else raise exception 'Bad type';end if;
insert into stock_moves(rid,item_id,kind,qty,cost,supplier_id,note,who) values(r_id,it,k,d,case when k='in' then uc end,sup,nt,'Owner');
if k in('waste','adjust') then perform _audit(r_id,'Owner','owner','stock_'||k,s.name||' · '||d||' '||s.unit);end if;end$$;

create or replace function delivery_create(r_id uuid,cn text,ph text,ad text,its jsonb,fee numeric,nt text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_items jsonb;v_total numeric;v_oid uuid;v_no int;v_id uuid;begin
if not (owns(r_id) or is_admin()) then raise exception 'Not allowed';end if;
if length(trim(coalesce(cn,'')))=0 then raise exception 'Enter customer name';end if;
select jsonb_agg(jsonb_build_object('name',x.nm,'price',x.pr,'qty',x.qty,'mid',x.mid,'f',x.f)),sum(x.pr*x.qty) into v_items,v_total from (
 select case when sp.p is not null then m.name||' ('||q.sz||')' else m.name end nm,coalesce(sp.p,m.price) pr,q.qty,m.id mid,coalesce(sp.f,1) f
 from (select (i->>'id')::uuid id,least(greatest((i->>'qty')::int,1),50) qty,nullif(i->>'sz','') sz from jsonb_array_elements(its) i) q
 join menu m on m.id=q.id and m.rid=r_id and m.available
 left join lateral (select (s->>'p')::numeric p,coalesce((s->>'f')::numeric,1) f from jsonb_array_elements(coalesce(m.sizes,'[]'::jsonb)) s where s->>'n'=q.sz limit 1) sp on true) x;
if v_total is null then raise exception 'Add at least one item';end if;
fee:=greatest(coalesce(fee,0),0);
select coalesce(max(no),0)+1 into v_no from deliveries where rid=r_id and created_at>=date_trunc('day',now());
insert into orders(rid,tbl,items,note,total) values(r_id,'D'||v_no,v_items,left(nt,200),v_total) returning id into v_oid;
insert into deliveries(rid,no,cust_name,phone,address,order_id,items,subtotal,fee,total,note) values(r_id,v_no,trim(cn),nullif(trim(coalesce(ph,'')),''),nullif(trim(coalesce(ad,'')),''),v_oid,v_items,v_total,fee,v_total+fee,left(nt,200)) returning id into v_id;
return v_id;end$$;

create or replace function delivery_set(r_id uuid,d_id uuid,st text,rd uuid default null,pm text default null) returns void language plpgsql security definer set search_path=public as $$
declare d deliveries;g record;tx numeric:=0;sub numeric;tot numeric;b uuid;o orders;its jsonb;begin
if not (owns(r_id) or is_admin()) then raise exception 'Not allowed';end if;
select * into d from deliveries where id=d_id and rid=r_id for update;if d.id is null then raise exception 'Delivery not found';end if;
if d.status in('delivered','cancelled') then raise exception 'Already %',d.status;end if;
if st='out' then
 if rd is null then raise exception 'Choose a rider';end if;
 update deliveries set status='out',rider_id=rd,out_at=now() where id=d_id;
elsif st='delivered' then
 if pm is null or pm not in('Cash','UPI','Card','Udhaar') then raise exception 'Choose payment mode';end if;
 select gst_on,gst_rate,gstin into g from restaurants where id=r_id;
 sub:=d.subtotal+d.fee;
 if g.gst_on then tx:=round(sub*coalesce(g.gst_rate,0)/100,2);end if;
 tot:=sub+tx;
 its:=d.items||case when d.fee>0 then jsonb_build_array(jsonb_build_object('name','Delivery charge','price',d.fee,'qty',1)) else '[]'::jsonb end;
 insert into bills(rid,tbl,items,subtotal,discount,tax,gst_rate,gstin,total,mode) values(r_id,'D'||d.no,its,sub,0,tx,case when g.gst_on then g.gst_rate else 0 end,case when g.gst_on then g.gstin end,tot,pm) returning id into b;
 update orders set bill_id=b,status=case when status in('new','preparing','ready') then 'served' else status end where id=d.order_id;
 update deliveries set status='delivered',mode=pm,bill_id=b,done_at=now(),total=tot where id=d_id;
 if pm='Udhaar' and tot>0 then insert into dues(rid,guest,phone,amount,kind,bill_id,who,note) values(r_id,d.cust_name,d.phone,tot,'due',b,'Owner','Delivery D'||d.no);end if;
 select * into o from orders where id=d.order_id;
 if o.id is not null and not coalesce(o.stock_done,false) then perform _consume(o);end if;
 perform _audit(r_id,'Owner','owner','bill','Delivery D'||d.no||' · Rs '||tot||' · '||pm);
elsif st='cancelled' then
 select * into o from orders where id=d.order_id;
 update deliveries set status='cancelled',done_at=now() where id=d_id;
 update orders set status='cancelled' where id=d.order_id;
 if o.id is not null and coalesce(o.stock_done,false) then perform _restore(o);end if;
 perform _audit(r_id,'Owner','owner','delivery_cancel','D'||d.no||' · Rs '||d.total);
else raise exception 'Bad status';end if;end$$;
