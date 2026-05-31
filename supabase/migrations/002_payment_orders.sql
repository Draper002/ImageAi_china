create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  provider text not null default 'alipay' check (provider = 'alipay'),
  plan_id text not null check (plan_id in ('starter', 'creator', 'studio')),
  out_trade_no text not null unique,
  trade_no text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'closed', 'failed', 'refunded')),
  amount_cents integer not null check (amount_cents > 0),
  credit_amount integer not null check (credit_amount > 0),
  pay_url text,
  qr_code_url text,
  raw_create_response jsonb,
  raw_query_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_orders enable row level security;

grant select on public.payment_orders to authenticated;

drop policy if exists "payment_orders_select_own" on public.payment_orders;
create policy "payment_orders_select_own" on public.payment_orders
  for select to authenticated using (auth.uid() = user_id);

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
    reason in ('signup_bonus', 'generation_debit', 'generation_refund', 'manual_adjustment', 'future_purchase', 'credit_purchase')
  );

alter table public.credit_ledger
  add column if not exists payment_order_id uuid references public.payment_orders(id) on delete set null;

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

  return true;
end;
$$;

revoke all on function public.apply_paid_payment_order(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_paid_payment_order(uuid, text, jsonb) to service_role;
