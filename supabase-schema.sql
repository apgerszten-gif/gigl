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
  insert into public.profiles (id, username, display_name, username_set)
  values (
    new.id,
    split_part(new.email, '@', 1),
    split_part(new.email, '@', 1),
    false
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tracks whether a user has confirmed/chosen their own username, vs still
-- carrying the placeholder the trigger above auto-fills from their email
-- prefix. Defaults to true so existing rows aren't retroactively forced
-- through the username step; handle_new_user() explicitly sets it false
-- for every new signup going forward. Email/password signup flips it to
-- true immediately (username is typed before submit); Google sign-in
-- flips it to true only after the user passes through /choose-username.
alter table public.profiles add column username_set boolean not null default true;

-- Replaces the emoji-reaction + head-to-head ELO battle system with three
-- direct 1-5 star sub-ratings per show, averaged into the display score
-- (see lib/rating.ts). Nullable since existing rows predate this and the
-- old system (app/battle, app/rank, lib/elo.ts) is left in the codebase
-- rather than deleted, in case it's ever needed again.
alter table public.logged_shows add column performance_rating smallint;
alter table public.logged_shows add column venue_rating smallint;
alter table public.logged_shows add column vibe_rating smallint;

-- Supports attaching multiple media items per log (max 1 video + 2 photos,
-- enforced client-side in app/log-show). photo_url is kept in sync as
-- media_urls[0] for any old code path that still reads the single column;
-- reads should prefer media_urls via lib/media.ts's resolveMediaUrls().
alter table public.logged_shows add column media_urls text[];

-- Tracks whether this account has ever been shown the first-visit tooltip
-- pointing at the Log button on the feed page. Keyed to the account (not a
-- browser-local flag) so it stays "seen" across devices/browsers once shown.
alter table public.profiles add column has_seen_log_tip boolean not null default false;

-- SMS-based show scoring (see /api/sms/*). Lets a user link a phone number
-- to their account for SMS-based show scoring. Unique so a phone number
-- can only ever be linked to one account, since the inbound webhook looks
-- up the sender's account by this number alone. Store in E.164 format
-- (e.g. +15551234567) to match Twilio's `From` field exactly.
--
-- profiles.phone_number/phone_verified are readable by anyone via the
-- existing "profiles_read ... using (true)" policy, same as
-- username/display_name already are - RLS is row-level, not column-level,
-- so restricting just these two columns would need a view or a second
-- policy layer. Decided against that for now; app code must never
-- select('*') on profiles for another user's row, only explicit column
-- lists, to avoid leaking these two fields through the client.
alter table public.profiles add column phone_number text unique;
alter table public.profiles add column phone_verified boolean not null default false;

-- Persists which festival a user has selected server-side. localStorage
-- (LOCAL_STORAGE_KEY in lib/festivals) stays the source of truth for the
-- in-app UI, but the SMS webhook runs server-side with no access to a
-- browser's localStorage, so it reads this column instead to know which
-- festival's lineup to match an incoming artist name against. Written
-- alongside localStorage wherever festival selection happens
-- (app/select-festival/page.tsx).
alter table public.profiles add column active_festival_id text;

-- Distinguishes ratings logged via SMS from the normal in-app flow, for any
-- future UI treatment (e.g. a small SMS badge on the feed).
alter table public.logged_shows add column sms_logged boolean not null default false;

-- Short-lived phone verification codes. No RLS policies at all (RLS stays
-- enabled with zero grants) - this table is only ever touched by
-- server-side API routes using the Supabase service role key
-- (SUPABASE_SERVICE_ROLE_KEY env var), never the client-side anon key,
-- since it briefly links a raw phone number to a code before that number
-- is confirmed to belong to any account.
create table public.sms_verification_codes (
  id uuid default gen_random_uuid() primary key,
  phone_number text not null,
  code text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);
alter table public.sms_verification_codes enable row level security;
