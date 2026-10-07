create or replace function public.prevent_profile_security_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and (
      new.id <> old.id
      or new.email is distinct from old.email
      or new.username is distinct from old.username
      or new.role is distinct from old.role
      or new.access_type is distinct from old.access_type
    ) then
    raise exception 'Security-managed profile fields cannot be changed by the user';
  end if;
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
