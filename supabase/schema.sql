-- SmartOpsSupportHub profile storage.
-- Run this script in Supabase SQL Editor before using profile dropdown data.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  phone_number text not null default '',
  birthday date,
  address text not null default '',
  role text not null default 'Support agent',
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists phone_number text not null default '',
  add column if not exists birthday date,
  add column if not exists address text not null default '';

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
begin
  insert into public.profiles (id, email, full_name, phone_number, birthday, address)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'birthday', '')::date,
    coalesce(new.raw_user_meta_data ->> 'address', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        phone_number = excluded.phone_number,
        birthday = excluded.birthday,
        address = excluded.address,
        updated_at = timezone('utc', now());
  return new;
end;
$$;

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
