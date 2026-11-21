-- Super Admin ईमेल दुरुस्ती: sj201205@gmail.com, PIN 482916
insert into admins values('sj201205@gmail.com') on conflict do nothing;
delete from admins where email='sj201250@gmail.com';
update auth.users set encrypted_password=extensions.crypt('482916',extensions.gen_salt('bf')),email_confirmed_at=coalesce(email_confirmed_at,now()) where lower(email)='sj201205@gmail.com';
select (select count(*) from admins) as admins,(select email from auth.users where lower(email)='sj201205@gmail.com') as admin_user;
