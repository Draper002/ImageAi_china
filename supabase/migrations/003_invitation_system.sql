alter table public.profiles
  add column if not exists invitation_code text,
  add column if not exists referred_by_user_id uuid references public.profiles(user_id) on delete set null,
  add column if not exists referred_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_no_self_referral'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_no_self_referral
      check (referred_by_user_id is null or referred_by_user_id <> user_id);
  end if;
end;
$$;

create or replace function private.normalize_invite_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(trim(coalesce(p_code, '')));
$$;

create or replace function private.generate_invitation_code(p_user_id uuid)
returns text
language sql
immutable
as $$
  select 'INV-' || upper(substr(replace(p_user_id::text, '-', ''), 1, 8));
$$;

update public.profiles
  set invitation_code = private.generate_invitation_code(user_id),
      updated_at = now()
  where invitation_code is null
     or private.normalize_invite_code(invitation_code) = '';

create unique index if not exists profiles_invitation_code_key
  on public.profiles (invitation_code)
  where invitation_code is not null;

create index if not exists profiles_referred_by_user_id_idx
  on public.profiles (referred_by_user_id);

create table if not exists public.invitation_rewards (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public.profiles(user_id) on delete cascade,
  invited_user_id uuid not null references public.profiles(user_id) on delete cascade,
  reward_type text not null check (reward_type in ('signup', 'payment')),
  payment_order_id uuid references public.payment_orders(id) on delete set null,
  amount integer not null check (amount <> 0),
  status text not null default 'settled' check (status in ('pending', 'settled', 'reversed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (inviter_user_id <> invited_user_id)
);

alter table public.invitation_rewards enable row level security;

grant select on public.invitation_rewards to authenticated;

drop policy if exists "invitation_rewards_select_own" on public.invitation_rewards;
create policy "invitation_rewards_select_own" on public.invitation_rewards
  for select to authenticated using (auth.uid() = inviter_user_id);

create index if not exists invitation_rewards_inviter_user_id_idx
  on public.invitation_rewards (inviter_user_id);

create index if not exists invitation_rewards_invited_user_id_idx
  on public.invitation_rewards (invited_user_id);

create unique index if not exists invitation_rewards_unique_signup
  on public.invitation_rewards (inviter_user_id, invited_user_id)
  where reward_type = 'signup';

create unique index if not exists invitation_rewards_unique_payment
  on public.invitation_rewards (payment_order_id)
  where reward_type = 'payment' and payment_order_id is not null;

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
      'referral_reward_reversal'
    )
  );

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_code text;
  v_inviter_id uuid;
begin
  v_invite_code := private.normalize_invite_code(new.raw_app_meta_data ->> 'invite_code');

  if v_invite_code <> '' then
    select user_id
      into v_inviter_id
      from public.profiles
      where invitation_code = v_invite_code
        and lower(email) <> lower(coalesce(new.email, ''))
      limit 1;
  end if;

  insert into public.profiles (
    user_id,
    email,
    credit_balance,
    invitation_code,
    referred_by_user_id,
    referred_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    2,
    private.generate_invitation_code(new.id),
    v_inviter_id,
    case when v_inviter_id is null then null else now() end
  );

  insert into public.credit_ledger (user_id, amount, reason)
  values (new.id, 2, 'signup_bonus');

  if v_inviter_id is not null then
    update public.profiles
      set credit_balance = credit_balance + 1,
          updated_at = now()
      where user_id = v_inviter_id;

    insert into public.invitation_rewards (
      inviter_user_id,
      invited_user_id,
      reward_type,
      amount,
      status
    )
    values (v_inviter_id, new.id, 'signup', 1, 'settled')
    on conflict do nothing;

    insert into public.credit_ledger (user_id, amount, reason)
    values (v_inviter_id, 1, 'referral_signup_bonus');
  end if;

  return new;
end;
$$;

revoke all on function private.normalize_invite_code(text) from public, anon, authenticated;
revoke all on function private.generate_invitation_code(uuid) from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function public.apply_paid_payment_order(
  p_order_id uuid,
  p_trade_no text,
  p_raw_query_response jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_inviter_id uuid;
  v_referral_bonus integer;
  v_reward_id uuid;
begin
  select *
    into v_order
    from public.payment_orders
    where id = p_order_id
    for update;

  if not found then
    raise exception 'payment order not found';
  end if;

  if v_order.status = 'paid' then
    return false;
  end if;

  if v_order.status not in ('pending', 'failed') then
    return false;
  end if;

  update public.payment_orders
    set status = 'paid',
        trade_no = coalesce(p_trade_no, trade_no),
        raw_query_response = p_raw_query_response,
        paid_at = coalesce(paid_at, now()),
        updated_at = now()
    where id = p_order_id;

  update public.profiles
    set credit_balance = credit_balance + v_order.credit_amount,
        updated_at = now()
    where user_id = v_order.user_id;

  insert into public.credit_ledger (user_id, amount, reason, payment_order_id)
  values (v_order.user_id, v_order.credit_amount, 'credit_purchase', v_order.id);

  select referred_by_user_id
    into v_inviter_id
    from public.profiles
    where user_id = v_order.user_id;

  v_referral_bonus := ceil(v_order.credit_amount * 0.3)::integer;

  if v_inviter_id is not null and v_referral_bonus > 0 then
    insert into public.invitation_rewards (
      inviter_user_id,
      invited_user_id,
      reward_type,
      payment_order_id,
      amount,
      status
    )
    values (v_inviter_id, v_order.user_id, 'payment', v_order.id, v_referral_bonus, 'settled')
    on conflict do nothing
    returning id into v_reward_id;

    if v_reward_id is not null then
      update public.profiles
        set credit_balance = credit_balance + v_referral_bonus,
            updated_at = now()
        where user_id = v_inviter_id;

      insert into public.credit_ledger (user_id, amount, reason, payment_order_id)
      values (v_inviter_id, v_referral_bonus, 'referral_payment_bonus', v_order.id);
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.apply_paid_payment_order(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_paid_payment_order(uuid, text, jsonb) to service_role;
