create table if not exists public.website_visits (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  page_path text not null check (char_length(page_path) <= 200),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 200)
);

create index if not exists website_visits_visited_at_idx
  on public.website_visits (visited_at desc);

alter table public.website_visits enable row level security;

grant insert on public.website_visits to anon, authenticated;
grant select on public.website_visits to authenticated;

create policy "Public can record website visits"
  on public.website_visits
  for insert
  to anon, authenticated
  with check (true);

create policy "Authenticated admins can read website visits"
  on public.website_visits
  for select
  to authenticated
  using (true);
