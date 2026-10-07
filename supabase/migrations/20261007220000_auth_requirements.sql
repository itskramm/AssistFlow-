alter table public.profiles
  add column if not exists username text not null default '',
  add column if not exists access_type text not null default 'User';

update public.profiles
set username = coalesce(email, '')
where username = '';

update public.profiles
set role = 'User'
where role not in ('Super Admin', 'Admin', 'User');

update public.profiles
set access_type = case
  when role in ('Super Admin', 'Admin', 'User') then role
  else 'User'
end
where access_type not in ('Super Admin', 'Admin', 'User');

alter table public.profiles
  drop constraint if exists profiles_role_check,
  drop constraint if exists profiles_access_type_check,
  add constraint profiles_role_check
    check (role in ('Super Admin', 'Admin', 'User')),
  add constraint profiles_access_type_check
    check (access_type in ('Super Admin', 'Admin', 'User'));

alter table public.profiles
  alter column role set default 'User',
  alter column access_type set default 'User';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, username, full_name, phone_number, birthday, address, access_type, role
  )
  values (
    new.id,
    new.email,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'birthday', '')::date,
    coalesce(new.raw_user_meta_data ->> 'address', ''),
    case
      when new.raw_user_meta_data ->> 'access_type'
        in ('Super Admin', 'Admin', 'User')
        then new.raw_user_meta_data ->> 'access_type'
      else 'User'
    end,
    'User'
  )
  on conflict (id) do update
    set email = excluded.email,
        username = excluded.username,
        full_name = excluded.full_name,
        phone_number = excluded.phone_number,
        birthday = excluded.birthday,
        address = excluded.address,
        access_type = excluded.access_type,
        updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.prevent_profile_security_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id <> old.id
    or new.email is distinct from old.email
    or new.username is distinct from old.username
    or new.role is distinct from old.role
    or new.access_type is distinct from old.access_type then
    raise exception 'Security-managed profile fields cannot be changed by the user';
  end if;
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
  before update on public.profiles
  for each row execute procedure public.prevent_profile_security_changes();

revoke update (id, email, username, role, access_type, created_at, updated_at)
  on public.profiles from authenticated;
grant update (full_name, phone_number, birthday, address, avatar_url)
  on public.profiles to authenticated;
