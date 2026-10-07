-- SmartOpsSupportHub profile storage.
-- Run this script in Supabase SQL Editor before using profile dropdown data.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text not null default '',
  full_name text not null default '',
  phone_number text not null default '',
  birthday date,
  address text not null default '',
  access_type text not null default 'User'
    check (access_type in ('Super Admin', 'Admin', 'User')),
  role text not null default 'User'
    check (role in ('Super Admin', 'Admin', 'User')),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists username text not null default '',
  add column if not exists phone_number text not null default '',
  add column if not exists birthday date,
  add column if not exists address text not null default '',
  add column if not exists access_type text not null default 'User';

update public.profiles
set role = 'User'
where role not in ('Super Admin', 'Admin', 'User');

update public.profiles
set access_type = case
  when role in ('Super Admin', 'Admin', 'User') then role
  else 'User'
end
where access_type not in ('Super Admin', 'Admin', 'User');

update public.profiles
set username = coalesce(email, '')
where username = '';

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

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile"
  on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile"
  on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
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
begin
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
        username = excluded.email,
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

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
  before update on public.profiles
  for each row execute procedure public.prevent_profile_security_changes();

revoke update (id, email, username, role, access_type, created_at, updated_at)
  on public.profiles from authenticated;
grant update (full_name, phone_number, birthday, address, avatar_url)
  on public.profiles to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Per-user conversation history.
create table if not exists public.prompt_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  channel text not null default 'main'
    check (channel in ('main', 'sidebar')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prompt_conversations_user_updated_idx
  on public.prompt_conversations (user_id, updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prompt_conversations_id_user_key'
  ) then
    alter table public.prompt_conversations
      add constraint prompt_conversations_id_user_key unique (id, user_id);
  end if;
end;
$$;

alter table public.prompt_conversations enable row level security;

drop policy if exists "Users can view their own conversations"
  on public.prompt_conversations;
create policy "Users can view their own conversations"
  on public.prompt_conversations for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own conversations"
  on public.prompt_conversations;
create policy "Users can create their own conversations"
  on public.prompt_conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own conversations"
  on public.prompt_conversations;
create policy "Users can update their own conversations"
  on public.prompt_conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own conversations"
  on public.prompt_conversations;
create policy "Users can delete their own conversations"
  on public.prompt_conversations for delete
  using (auth.uid() = user_id);

-- Prompt/answer exchanges belong to a conversation. Nullable keeps this
-- migration safe for rows created before conversation grouping was added.
create table if not exists public.prompt_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.prompt_conversations(id) on delete cascade,
  prompt text not null,
  response text not null default '',
  source text not null default 'rag',
  latency_ms numeric,
  channel text not null default 'main'
    check (channel in ('main', 'sidebar')),
  rating smallint
    check (rating in (1, 2)),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists prompt_history_user_created_idx
  on public.prompt_history (user_id, created_at desc);

alter table public.prompt_history enable row level security;

alter table public.prompt_history
  add column if not exists conversation_id uuid;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'prompt_history_conversation_id_fkey'
  ) then
    alter table public.prompt_history
      drop constraint prompt_history_conversation_id_fkey;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'prompt_history_conversation_user_fkey'
  ) then
    alter table public.prompt_history
      add constraint prompt_history_conversation_user_fkey
      foreign key (conversation_id, user_id)
      references public.prompt_conversations(id, user_id)
      on delete cascade;
  end if;
end;
$$;

create index if not exists prompt_history_conversation_created_idx
  on public.prompt_history (conversation_id, created_at asc);

-- Keep existing prompt rows available under one legacy conversation per user
-- and channel instead of displaying each old prompt as a separate conversation.
insert into public.prompt_conversations (user_id, title, channel)
select distinct user_id, 'Previous conversation', channel
from public.prompt_history
where conversation_id is null
  and not exists (
    select 1
    from public.prompt_conversations conversations
    where conversations.user_id = prompt_history.user_id
      and conversations.channel = prompt_history.channel
      and conversations.title = 'Previous conversation'
  );

update public.prompt_history history
set conversation_id = conversations.id
from public.prompt_conversations conversations
where history.conversation_id is null
  and conversations.user_id = history.user_id
  and conversations.channel = history.channel
  and conversations.title = 'Previous conversation';

drop policy if exists "Users can view their own prompt history"
  on public.prompt_history;
create policy "Users can view their own prompt history"
  on public.prompt_history for select
  using (
    auth.uid() = user_id
    and (
      conversation_id is null
      or exists (
        select 1
        from public.prompt_conversations conversations
        where conversations.id = prompt_history.conversation_id
          and conversations.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can create their own prompt history"
  on public.prompt_history;
create policy "Users can create their own prompt history"
  on public.prompt_history for insert
  with check (
    auth.uid() = user_id
    and (
      conversation_id is null
      or exists (
        select 1
        from public.prompt_conversations conversations
        where conversations.id = prompt_history.conversation_id
          and conversations.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can update their own prompt history"
  on public.prompt_history;
create policy "Users can update their own prompt history"
  on public.prompt_history for update
  using (
    auth.uid() = user_id
    and (
      conversation_id is null
      or exists (
        select 1
        from public.prompt_conversations conversations
        where conversations.id = prompt_history.conversation_id
          and conversations.user_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() = user_id
    and (
      conversation_id is null
      or exists (
        select 1
        from public.prompt_conversations conversations
        where conversations.id = prompt_history.conversation_id
          and conversations.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can delete their own prompt history"
  on public.prompt_history;
create policy "Users can delete their own prompt history"
  on public.prompt_history for delete
  using (
    auth.uid() = user_id
    and (
      conversation_id is null
      or exists (
        select 1
        from public.prompt_conversations conversations
        where conversations.id = prompt_history.conversation_id
          and conversations.user_id = auth.uid()
      )
    )
  );
