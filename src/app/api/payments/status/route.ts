import { NextResponse } from "next/server";
import { isPaidAlipayTradeStatus, queryAlipayPayment } from "@/lib/alipay";
import { normalizePaymentStatus } from "@/lib/payments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PaymentOrder = {
  id: string;
  user_id: string;
  out_trade_no: string;
  status: string;
  credit_amount: number;
  amount_cents: number;
  trade_no: string | null;
};

async function readCredits(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data } = await admin
    .from("profiles")
    .select("credit_balance")
    .eq("user_id", userId)
    .single();

  return data?.credit_balance ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: order, error } = await admin
    .from("payment_orders")
    .select("id,user_id,out_trade_no,status,credit_amount,amount_cents,trade_no")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single<PaymentOrder>();

  if (error || !order) {
    return NextResponse.json({ error: "Payment order not found" }, { status: 404 });
  }

  if (order.status === "paid") {
    return NextResponse.json({
      orderId: order.id,
      status: "paid",
      tradeStatus: "TRADE_SUCCESS",
      credits: await readCredits(admin, user.id)
    });
  }

  try {
    const payment = await queryAlipayPayment(order.out_trade_no);
    const paid = isPaidAlipayTradeStatus(payment.tradeStatus);
    let status = normalizePaymentStatus(order.status);

    if (paid) {
      await admin.rpc("apply_paid_payment_order", {
        p_order_id: order.id,
        p_trade_no: payment.tradeNo,
        p_raw_query_response: payment.raw
      });
      status = "paid";
    } else if (payment.tradeStatus === "TRADE_CLOSED") {
      await admin
        .from("payment_orders")
        .update({
          status: "closed",
          raw_query_response: payment.raw,
          updated_at: new Date().toISOString()
        })
        .eq("id", order.id);
      status = "closed";
    } else {
      await admin
        .from("payment_orders")
        .update({
          raw_query_response: payment.raw,
          updated_at: new Date().toISOString()
        })
        .eq("id", order.id);
    }

    return NextResponse.json({
      orderId: order.id,
      status,
      tradeStatus: payment.tradeStatus,
      tradeNo: payment.tradeNo,
      credits: status === "paid" ? await readCredits(admin, user.id) : null
    });
  } catch {
    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      tradeStatus: null,
      credits: null,
      error: "Unable to query Alipay payment yet"
    });
  }
}
