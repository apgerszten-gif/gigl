-- Run this in your Supabase SQL editor

-- Users table (extends Supabase auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  city text default 'Coachella',
  created_at timestamp with time zone default now()
);

-- Shows logged by users
create table public.logged_shows (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  artist_id text not null,
  artist_name text not null,
  stage text not null,
  day text not null,
  genre text not null,
  emoji text not null,
  review text,
  tags text[],
  elo integer default 1500,
  created_at timestamp with time zone default now(),
  unique(user_id, artist_id)
);

-- Head-to-head matchup results
create table public.matchups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  winner_id uuid references public.logged_shows(id) not null,
  loser_id uuid references public.logged_shows(id) not null,
  winner_delta integer not null,
  created_at timestamp with time zone default now()
);

-- Friend connections
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key(follower_id, following_id)
);

-- Row level security
alter table public.profiles enable row level security;
alter table public.logged_shows enable row level security;
alter table public.matchups enable row level security;
alter table public.follows enable row level security;

-- Profiles: anyone can read, only owner can write
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_write" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Shows: anyone can read, only owner can write
create policy "shows_read" on public.logged_shows for select using (true);
create policy "shows_insert" on public.logged_shows for insert with check (auth.uid() = user_id);
create policy "shows_update" on public.logged_shows for update using (auth.uid() = user_id);
create policy "shows_delete" on public.logged_shows for delete using (auth.uid() = user_id);

-- Matchups: owner only
create policy "matchups_read" on public.matchups for select using (auth.uid() = user_id);
create policy "matchups_insert" on public.matchups for insert with check (auth.uid() = user_id);

-- Follows: anyone can read, owner can write
create policy "follows_read" on public.follows for select using (true);
create policy "follows_insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete using (auth.uid() = follower_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
