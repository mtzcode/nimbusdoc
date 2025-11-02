-- Create app_permissions table to manage global feature permissions
create table if not exists public.app_permissions (
  id bigint primary key generated always as identity,
  user_can_view_clients boolean not null default true,
  user_can_edit_clients boolean not null default false,
  user_can_manage_folders boolean not null default true,
  user_can_delete_files boolean not null default false,
  admin_can_manage_users boolean not null default true,
  admin_can_manage_permissions boolean not null default true,
  updated_at timestamp with time zone default now()
);

-- Seed a single row if table is empty
insert into public.app_permissions (
  user_can_view_clients,
  user_can_edit_clients,
  user_can_manage_folders,
  user_can_delete_files,
  admin_can_manage_users,
  admin_can_manage_permissions
)
select true, false, true, false, true, true
where not exists (select 1 from public.app_permissions);

-- Enable Row Level Security
alter table public.app_permissions enable row level security;

-- Allow any authenticated user to read permissions
create policy "read_app_permissions_any_authenticated" on public.app_permissions
for select
to authenticated
using (true);

-- Allow only admins to update permissions
create policy "update_app_permissions_admin_only" on public.app_permissions
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));