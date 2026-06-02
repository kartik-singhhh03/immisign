-- User signature management for practitioners.

create table if not exists public.user_signatures (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  signature_type text not null check (signature_type in ('upload','draw','type')),
  label text,
  storage_path text,
  typed_name text,
  draw_data text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_signatures_agency_user
  on public.user_signatures(agency_id, user_id);

create unique index if not exists uniq_user_default_signature
  on public.user_signatures(user_id)
  where is_default = true;

alter table public.user_signatures enable row level security;

create policy "users_view_own_agency_signatures"
  on public.user_signatures
  for select
  to authenticated
  using (agency_id = public.get_tenant());

create policy "users_insert_own_signature"
  on public.user_signatures
  for insert
  to authenticated
  with check (agency_id = public.get_tenant() and user_id = auth.uid());

create policy "users_update_own_signature"
  on public.user_signatures
  for update
  to authenticated
  using (agency_id = public.get_tenant() and user_id = auth.uid());

create policy "users_delete_own_signature"
  on public.user_signatures
  for delete
  to authenticated
  using (agency_id = public.get_tenant() and user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do nothing;

create policy "signatures_bucket_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'signatures' and (storage.foldername(name))[1] = public.get_tenant()::text);

create policy "signatures_bucket_write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'signatures'
  and (storage.foldername(name))[1] = public.get_tenant()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "signatures_bucket_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'signatures'
  and (storage.foldername(name))[1] = public.get_tenant()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);
