-- PHASE 1: run ONCE in Supabase > SQL Editor (safe to re-run)
alter table restaurants add column if not exists gstin text, add column if not exists gst_rate numeric default 5, add column if not exists gst_on bool default false;
alter table bills add column if not exists tax numeric default 0, add column if not exists gst_rate numeric default 0, add column if not exists gstin text;
alter table menu add column if not exists sizes jsonb;

create or replace function owner_set_gst(r_id uuid,g text,rt numeric,on_ bool) returns void language plpgsql security definer set search_path=public as $$
begin
if not (owns(r_id) or is_admin()) then raise exception 'Not allowed';end if;
g:=upper(trim(coalesce(g,'')));
if g<>'' and g !~ '^[0-9A-Z]{15}$' then raise exception 'Enter a valid 15-character GSTIN';end if;
if on_ and g='' then raise exception 'Enter GSTIN to turn GST on';end if;
update restaurants set gstin=nullif(g,''),gst_rate=least(greatest(coalesce(rt,0),0),28),gst_on=on_ where id=r_id;end$$;

create or replace function get_menu(c text) returns json language sql security definer set search_path=public as $$select coalesce(json_agg(json_build_object('id',m.id,'name',m.name,'emoji',m.emoji,'price',m.price,'cat',m.cat,'veg',m.veg,'sizes',m.sizes) order by m.cat,m.name),'[]'::json) from menu m join restaurants r on r.id=m.rid where r.code=c and r.active and (r.valid_till is null or r.valid_till>=current_date) and m.available$$;

create or replace function place_order(c text,t text,p text,its jsonb,nt text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_rid uuid;v_items jsonb;v_total numeric;v_id uuid;begin
v_rid:=session_rid(c,t,p);if v_rid is null then raise exception 'bad_pin';end if;
select jsonb_agg(jsonb_build_object('name',x.nm,'price',x.pr,'qty',x.qty)),sum(x.pr*x.qty) into v_items,v_total from (
 select case when sp.p is not null then m.name||' ('||q.sz||')' else m.name end nm,coalesce(sp.p,m.price) pr,q.qty
 from (select (i->>'id')::uuid id,least(greatest((i->>'qty')::int,1),20) qty,nullif(i->>'sz','') sz from jsonb_array_elements(its) i) q
 join menu m on m.id=q.id and m.rid=v_rid and m.available
 left join lateral (select (s->>'p')::numeric p from jsonb_array_elements(coalesce(m.sizes,'[]'::jsonb)) s where s->>'n'=q.sz limit 1) sp on true) x;
if v_total is null then raise exception 'empty_order';end if;
insert into orders(rid,tbl,items,note,total) values(v_rid,t,v_items,left(nt,200),v_total) returning id into v_id;return v_id;end$$;

create or replace function staff_orders(c text,p text) returns json language sql security definer set search_path=public as $$
select json_build_object('tables',x.tables,'gst_on',x.gst_on,'gst_rate',x.gst_rate,
'orders',coalesce((select json_agg(o order by o.created_at) from orders o where o.rid=x.id and o.created_at>now()-interval '18 hours' and o.status<>'cancelled' and (o.status in('new','preparing','ready') or o.bill_id is null)),'[]'::json),
'calls',coalesce((select json_agg(k) from calls k where k.rid=x.id and not k.done),'[]'::json),
'sessions',coalesce((select json_agg(json_build_object('tbl',s.tbl,'pin',s.pin)) from table_sessions s where s.rid=x.id and not s.closed and s.opened_at>now()-interval '4 hours'),'[]'::json))
from restaurants x where x.id=staff_rid(c,p)$$;

create or replace function pay_table(c text,p text,t text,mode text,disc numeric) returns json language plpgsql security definer set search_path=public as $$
declare v uuid;its jsonb;sub numeric;b uuid;r json;g record;tx numeric:=0;begin
v:=staff_rid(c,p);if v is null then raise exception 'not_allowed';end if;
select jsonb_agg(i),sum((i->>'price')::numeric*(i->>'qty')::int) into its,sub from orders o,jsonb_array_elements(o.items) i where o.rid=v and o.tbl=t and o.bill_id is null and o.status<>'cancelled';
if sub is null then raise exception 'No unpaid orders';end if;
disc:=least(greatest(coalesce(disc,0),0),sub);
select gst_on,gst_rate,gstin into g from restaurants where id=v;
if g.gst_on then tx:=round((sub-disc)*coalesce(g.gst_rate,0)/100,2);end if;
insert into bills(rid,tbl,items,subtotal,discount,tax,gst_rate,gstin,total,mode) values(v,t,its,sub,disc,tx,case when g.gst_on then g.gst_rate else 0 end,case when g.gst_on then g.gstin end,sub-disc+tx,mode) returning id into b;
update orders set bill_id=b where rid=v and tbl=t and bill_id is null and status<>'cancelled';
update table_sessions set closed=true where rid=v and tbl=t;
select row_to_json(x) into r from bills x where x.id=b;return r;end$$;
