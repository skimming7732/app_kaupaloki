update public.profiles
set role = 'super_admin'
where lower(btrim(email)) = 'desarrollor@jeroallsolutions.com'
  and role = 'administrador';
