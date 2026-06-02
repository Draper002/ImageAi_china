alter table public.generations
  add column if not exists deleted_at timestamptz,
  add column if not exists case_submission_status text not null default 'none',
  add column if not exists case_submitted_at timestamptz,
  add column if not exists case_featured_at timestamptz,
  add column if not exists case_rewarded_at timestamptz,
  add column if not exists admin_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generations_case_submission_status_check'
      and conrelid = 'public.generations'::regclass
  ) then
    alter table public.generations
      add constraint generations_case_submission_status_check
      check (case_submission_status in ('none', 'submitted', 'approved', 'rejected'));
  end if;
end;
$$;

create index if not exists generations_user_deleted_at_idx
  on public.generations (user_id, deleted_at, created_at desc);

create index if not exists generations_case_submission_status_idx
  on public.generations (case_submission_status, created_at desc);

create table if not exists public.case_examples (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null unique references public.generations(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  subject text not null,
  tags text[] not null default '{}',
  image_type text,
  aspect_ratio text,
  style text,
  prompt_preview_zh text,
  prompt_preview_en text,
  submitted_prompt text not null,
  generated_image_path text not null,
  visibility text not null default 'public' check (visibility in ('public', 'hidden')),
  featured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.case_examples enable row level security;

grant select on public.case_examples to anon, authenticated;

drop policy if exists "case_examples_public_select" on public.case_examples;
create policy "case_examples_public_select" on public.case_examples
  for select to anon, authenticated using (visibility = 'public');

create index if not exists case_examples_featured_at_idx
  on public.case_examples (visibility, featured_at desc);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'credit_ledger_reason_check'
      and conrelid = 'public.credit_ledger'::regclass
  ) then
    alter table public.credit_ledger drop constraint credit_ledger_reason_check;
  end if;
end;
$$;

alter table public.credit_ledger
  add constraint credit_ledger_reason_check check (
    reason in (
      'signup_bonus',
      'generation_debit',
      'generation_refund',
      'manual_adjustment',
      'future_purchase',
      'credit_purchase',
      'referral_signup_bonus',
      'referral_payment_bonus',
      'referral_reward_reversal',
      'admin_bonus',
      'case_reward'
    )
  );

create or replace function public.apply_admin_credit_bonus(
  p_user_id uuid,
  p_amount integer,
  p_note text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'admin credit bonus must be positive';
  end if;

  update public.profiles
    set credit_balance = credit_balance + p_amount,
        updated_at = now()
    where user_id = p_user_id;

  if not found then
    raise exception 'profile not found';
  end if;

  insert into public.credit_ledger (user_id, amount, reason)
  values (p_user_id, p_amount, 'admin_bonus');

  return true;
end;
$$;

revoke all on function public.apply_admin_credit_bonus(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.apply_admin_credit_bonus(uuid, integer, text) to service_role;

create or replace function public.apply_case_reward(
  p_generation_id uuid,
  p_amount integer
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_generation public.generations%rowtype;
begin
  if p_amount <= 0 then
    raise exception 'case reward must be positive';
  end if;

  select *
    into v_generation
    from public.generations
    where id = p_generation_id
    for update;

  if not found then
    raise exception 'generation not found';
  end if;

  if v_generation.case_rewarded_at is not null then
    return false;
  end if;

  update public.profiles
    set credit_balance = credit_balance + p_amount,
        updated_at = now()
    where user_id = v_generation.user_id;

  insert into public.credit_ledger (user_id, amount, reason, generation_id)
  values (v_generation.user_id, p_amount, 'case_reward', p_generation_id);

  update public.generations
    set case_rewarded_at = now(),
        updated_at = now()
    where id = p_generation_id;

  return true;
end;
$$;

revoke all on function public.apply_case_reward(uuid, integer) from public, anon, authenticated;
grant execute on function public.apply_case_reward(uuid, integer) to service_role;
