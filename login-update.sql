-- SJ Restaurant: Shop Name + PIN login. supabase.sql नंतर हे पूर्ण Run कर.
create extension if not exists pgcrypto with schema extensions;
create or replace function rest_resolve(c text) returns json language sql security definer set search_path=public as $$
select json_build_object('code',code,'email',owner_email,'name',name) from restaurants where active and (lower(code)=lower(trim(c)) or lower(name)=lower(trim(c))) limit 1$$;
create or replace function _set_owner(c text,pin text) returns void language plpgsql security definer set search_path=public,extensions,auth as $$
declare e text:=lower(trim(c))||'@owner.sjr';uid uuid;
begin
 select id into uid from auth.users where email=e;
 if uid is null then
  uid:=gen_random_uuid();
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change,email_change_token_new)
  values('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',e,crypt(pin,gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
  insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
  values(gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',e),'email',now(),now(),now());
 else update auth.users set encrypted_password=crypt(pin,gen_salt('bf')) where id=uid; end if;
 update public.restaurants set owner_email=e where lower(code)=lower(trim(c));
end$$;
revoke all on function _set_owner(text,text) from public,anon,authenticated;
create or replace function admin_set_owner(c text,pin text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() then raise exception 'not_allowed';end if;
if length(pin)<6 then raise exception 'PIN must be at least 6 digits';end if;
perform _set_owner(c,pin);end$$;
-- Owner (demo): Shop Name = demo, PIN = 739204
select _set_owner('demo','739204');
-- Super Admin: Shop Name = admin, PIN = 482916 (ईमेल sj201250@gmail.com)
update auth.users set encrypted_password=extensions.crypt('482916',extensions.gen_salt('bf')),email_confirmed_at=coalesce(email_confirmed_at,now()) where lower(email)='sj201250@gmail.com';
select email from auth.users;
