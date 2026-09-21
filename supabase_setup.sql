-- CƠ SỞ DỮ LIỆU DÙNG CHUNG CHO BẢNG TĂNG CA
create table if not exists public.cv_overtime_months (
  month_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.cv_overtime_months enable row level security;
revoke all on table public.cv_overtime_months from anon, authenticated;
grant select, insert, update, delete on table public.cv_overtime_months to anon, authenticated;

drop policy if exists "cv_ot_read" on public.cv_overtime_months;
drop policy if exists "cv_ot_insert" on public.cv_overtime_months;
drop policy if exists "cv_ot_update" on public.cv_overtime_months;
drop policy if exists "cv_ot_delete" on public.cv_overtime_months;

create policy "cv_ot_read" on public.cv_overtime_months for select to anon, authenticated using (true);
create policy "cv_ot_insert" on public.cv_overtime_months for insert to anon, authenticated with check (true);
create policy "cv_ot_update" on public.cv_overtime_months for update to anon, authenticated using (true) with check (true);
create policy "cv_ot_delete" on public.cv_overtime_months for delete to anon, authenticated using (true);

alter publication supabase_realtime add table public.cv_overtime_months;
