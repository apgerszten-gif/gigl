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

-- Battle Mode: an optional, purely additive gamified layer. Nothing here
-- ever reads from or writes to performance_rating/venue_rating/vibe_rating
-- or anything computeShowScore() touches.

alter table public.profiles add column shows_logged_count integer not null default 0;

-- Only ever flips false -> true, once, permanently (see the trigger below).
-- Does not re-lock if shows_logged_count later drops below 10 (e.g. after
-- a deletion) since the trigger only ever sets it, never clears it.
alter table public.profiles add column battle_mode_unlocked boolean not null default false;

-- Independent of battle_mode_unlocked - only controls whether the Battle
-- Mode promo card shows on the feed. Sticky once dismissed; never affects
-- unlock status or the entry point on the rankings page.
alter table public.profiles add column battle_card_dismissed boolean not null default false;

-- One row per (user, artist) that's ever been battled - a show accumulates
-- many battle outcomes over time, this is a running tally, not a single
-- field on logged_shows. Completely separate from performance_rating/
-- venue_rating/vibe_rating and everything computeShowScore() touches.
--
-- Publicly readable (like logged_shows/profiles already are) so the Feed
-- can show an artist's all-time battle record aggregated across every
-- user, not just the viewer's own - consistent with how star ratings
-- already aggregate into a public consensus elsewhere in the app.
create table public.battle_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  artist_id text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  updated_at timestamp with time zone default now(),
  unique(user_id, artist_id)
);
alter table public.battle_records enable row level security;
create policy "battle_records_read"   on public.battle_records for select using (true);
create policy "battle_records_insert" on public.battle_records for insert with check (auth.uid() = user_id);
create policy "battle_records_update" on public.battle_records for update using (auth.uid() = user_id);

-- Fires on every genuine new logged_shows row (not on re-rates, which go
-- through the upsert's UPDATE path instead, since this is an AFTER INSERT
-- trigger - see chat history for full rationale). security definer to
-- match the existing handle_new_user() trigger's convention, so this isn't
-- dependent on profiles' RLS policies staying exactly as they are today.
create or replace function public.handle_logged_show_insert()
returns trigger as $$
begin
  update public.profiles
  set shows_logged_count = shows_logged_count + 1
  where id = new.user_id;

  update public.profiles
  set battle_mode_unlocked = true
  where id = new.user_id
    and shows_logged_count >= 10
    and battle_mode_unlocked = false;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_logged_show_insert
  after insert on public.logged_shows
  for each row execute procedure public.handle_logged_show_insert();

-- Tag friends who were at a show with you. tagged_user_id is null for a
-- friend who isn't on Gigl yet (pending_invite = true, invite_contact holds
-- the phone/email they were invited through); otherwise it points at their
-- profile directly. unique() allows any number of pending invites per show
-- (NULLs are never considered equal by a unique constraint) while still
-- preventing the same confirmed friend being tagged twice on one show.
--
-- public.follows already exists above (see "Friend connections") with the
-- exact shape/RLS this feature's follow system needs - anyone can read the
-- graph, only the follower can insert/delete their own edge. No changes
-- needed there.
create table public.show_tags (
  id uuid default gen_random_uuid() primary key,
  logged_show_id uuid references public.logged_shows(id) on delete cascade not null,
  tagged_user_id uuid references public.profiles(id) on delete cascade,
  pending_invite boolean not null default false,
  invite_contact text,
  created_at timestamp with time zone default now(),
  unique(logged_show_id, tagged_user_id)
);
alter table public.show_tags enable row level security;

-- Readable by anyone (matches logged_shows/profiles' public-read model);
-- writes are gated on owning the parent show, not a direct user_id column,
-- since show_tags itself doesn't record who's doing the tagging.
create policy "show_tags_read" on public.show_tags for select using (true);
create policy "show_tags_insert" on public.show_tags for insert with check (
  exists (select 1 from public.logged_shows where id = show_tags.logged_show_id and user_id = auth.uid())
);
create policy "show_tags_delete" on public.show_tags for delete using (
  exists (select 1 from public.logged_shows where id = show_tags.logged_show_id and user_id = auth.uid())
);

-- Usernames are embedded directly into /u/[username] URLs, so any
-- character outside a safe set can end up broken there. This was never
-- enforced anywhere before now - manual signup only substituted whitespace
-- (app/auth, app/choose-username), and the Google OAuth auto-username
-- below used the raw email local-part completely unsanitized (email local-
-- parts are allowed to contain characters like $ + ! that a username
-- shouldn't) - so a profile could end up with e.g. "big$money" and 404 on
-- its own profile link. lib/username.ts now enforces the same [a-z0-9_]
-- pattern client-side before either page ever writes a username.
--
-- Existing rows are normalized first so the constraint below can actually
-- be added. Safe to rerun. If two existing usernames happen to normalize
-- to the same string this update will fail on the unique constraint -
-- resolve that collision by hand (pick a different username for one of
-- them) and rerun.
update public.profiles
set username = regexp_replace(lower(username), '[^a-z0-9_]', '_', 'g')
where username ~ '[^a-z0-9_]';

alter table public.profiles
  add constraint username_format check (username ~ '^[a-z0-9_]+$');

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, username_set)
  values (
    new.id,
    regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '_', 'g'),
    split_part(new.email, '@', 1),
    false
  );
  return new;
end;
$$ language plpgsql security definer;

-- `genre` was part of the very first version of this table and has been
-- dead ever since the star-rating rewrite (58f36e0) - no code anywhere
-- writes it, but it's still `not null` with no default, so every insert
-- (log-show, SMS webhook, pending-log sync) has been failing outright.
-- This is why Rankings/Feed render empty even after people log shows.
alter table public.logged_shows alter column genre drop not null;

-- Rankings now subscribes to postgres_changes on logged_shows so the
-- leaderboard updates live as ratings come in - requires the table to be
-- in the realtime publication (off by default for tables created before
-- Realtime was enabled on the project).
alter publication supabase_realtime add table public.logged_shows;

-- Social interactions on a logged show: like, emoji reaction, and comment.
-- Unrelated to the performance/venue/vibe star ratings and to the legacy
-- `emoji` sentiment column above - this is a plain social layer, one row
-- per interaction. show_likes is one row per (user, show); show_reactions
-- allows a user to react with more than one distinct emoji on the same
-- show but not the same emoji twice; show_comments is a flat list (no
-- threading), oldest first, and comments can only be deleted by their
-- author, never edited.
create table if not exists public.show_likes (
  id uuid default gen_random_uuid() primary key,
  logged_show_id uuid references public.logged_shows(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(logged_show_id, user_id)
);

create table if not exists public.show_reactions (
  id uuid default gen_random_uuid() primary key,
  logged_show_id uuid references public.logged_shows(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamp with time zone default now(),
  unique(logged_show_id, user_id, emoji)
);

create table if not exists public.show_comments (
  id uuid default gen_random_uuid() primary key,
  logged_show_id uuid references public.logged_shows(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamp with time zone default now()
);

alter table public.show_likes enable row level security;
alter table public.show_reactions enable row level security;
alter table public.show_comments enable row level security;

-- Public read (matches logged_shows/follows), owner-only write - same
-- pattern as follows/show_tags above. drop-then-create (rather than plain
-- create) so this whole block is safe to rerun after a partial failure
-- (see chat history - a paste corruption mid-run left this half-applied
-- more than once).
drop policy if exists "show_likes_read" on public.show_likes;
drop policy if exists "show_likes_insert" on public.show_likes;
drop policy if exists "show_likes_delete" on public.show_likes;
create policy "show_likes_read" on public.show_likes for select using (true);
create policy "show_likes_insert" on public.show_likes for insert with check (auth.uid() = user_id);
create policy "show_likes_delete" on public.show_likes for delete using (auth.uid() = user_id);

drop policy if exists "show_reactions_read" on public.show_reactions;
drop policy if exists "show_reactions_insert" on public.show_reactions;
drop policy if exists "show_reactions_delete" on public.show_reactions;
create policy "show_reactions_read" on public.show_reactions for select using (true);
create policy "show_reactions_insert" on public.show_reactions for insert with check (auth.uid() = user_id);
create policy "show_reactions_delete" on public.show_reactions for delete using (auth.uid() = user_id);

drop policy if exists "show_comments_read" on public.show_comments;
drop policy if exists "show_comments_insert" on public.show_comments;
drop policy if exists "show_comments_delete" on public.show_comments;
create policy "show_comments_read" on public.show_comments for select using (true);
create policy "show_comments_insert" on public.show_comments for insert with check (auth.uid() = user_id);
create policy "show_comments_delete" on public.show_comments for delete using (auth.uid() = user_id);

-- Phone-based sign-in (Twilio Verify via Supabase's Phone auth provider,
-- see app/auth/page.tsx) creates auth.users rows with email = null. The
-- handle_new_user() trigger derived username/display_name from
-- split_part(new.email, '@', 1), which is null for these rows - and
-- profiles.username is `not null unique`, so every phone sign-up would
-- fail this trigger and, since it runs on the same insert as the
-- auth.users row, take the whole sign-up down with it. Fall back to the
-- phone number (digits only, so it still matches the ^[a-z0-9_]+$ format
-- constraint) when there's no email.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_handle text;
begin
  base_handle := coalesce(
    nullif(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '_', 'g'), ''),
    nullif(regexp_replace(new.phone, '[^a-z0-9]', '', 'g'), '')
  );

  insert into public.profiles (id, username, display_name, username_set)
  values (
    new.id,
    -- Extremely unlikely fallback (neither email nor phone present) so the
    -- insert never fails outright; username_set stays false either way and
    -- /choose-username makes them pick a real one before they can do
    -- anything with the account.
    coalesce(base_handle, 'user_' || replace(new.id::text, '-', '')),
    split_part(new.email, '@', 1),
    false
  );
  return new;
end;
$$ language plpgsql security definer;
