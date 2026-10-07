create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  full_name_value text;
  phone_value text;
  birthday_value date;
begin
  full_name_value := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  phone_value := trim(coalesce(new.raw_user_meta_data ->> 'phone', ''));

  begin
    birthday_value := nullif(new.raw_user_meta_data ->> 'birthday', '')::date;
  exception when others then
    raise exception 'Birthday must be a valid date';
  end;

  if full_name_value = ''
    or full_name_value !~ '^[[:alpha:]]+([ ''-][[:alpha:]]+)*$' then
    raise exception 'Full Name contains invalid characters';
  end if;
  if phone_value !~ '^(09[0-9]{9}|\+639[0-9]{9})$' then
    raise exception 'Phone number must be a valid Philippine mobile number';
  end if;
  if birthday_value is null
    or birthday_value > (current_date - interval '18 years')::date then
    raise exception 'User must be at least 18 years old';
  end if;
  if trim(coalesce(new.raw_user_meta_data ->> 'address', '')) = '' then
    raise exception 'Address is required';
  end if;

  insert into public.profiles (
    id, email, username, full_name, phone_number, birthday, address, access_type, role
  )
  values (
    new.id,
    new.email,
    coalesce(new.email, ''),
    full_name_value,
    phone_value,
    birthday_value,
    trim(new.raw_user_meta_data ->> 'address'),
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
