import { NextResponse } from "next/server";
import { createAlipayAgentPayment } from "@/lib/alipay";
import { getPaymentPlan } from "@/lib/payment-plans";
import { buildOutTradeNo, paymentOrderTitle } from "@/lib/payments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreatePaymentBody = {
  planId?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePaymentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const plan = getPaymentPlan(body.planId ?? "");
  if (!plan) {
    return NextResponse.json({ error: "Unknown payment plan" }, { status: 400 });
  }

  const outTradeNo = buildOutTradeNo(user.id);
  const { data: order, error: insertError } = await admin
    .from("payment_orders")
    .insert({
      user_id: user.id,
      provider: "alipay",
      plan_id: plan.id,
      out_trade_no: outTradeNo,
      status: "pending",
      amount_cents: plan.amountCents,
      credit_amount: plan.credits
    })
    .select("id")
    .single();

  if (insertError || !order) {
    return NextResponse.json({ error: "Unable to create payment order" }, { status: 500 });
  }

  try {
    const payment = await createAlipayAgentPayment({
      outTradeNo,
      totalAmount: plan.amountYuan,
      agentName: paymentOrderTitle(plan)
    });

    const { error: updateError } = await admin
      .from("payment_orders")
      .update({
        pay_url: payment.payUrl,
        qr_code_url: payment.qrCodeUrl,
        raw_create_response: payment.raw,
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    if (updateError) {
      return NextResponse.json({ error: "Unable to save payment link" }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      outTradeNo,
      status: "pending",
      plan: {
        id: plan.id,
        credits: plan.credits,
        amountCents: plan.amountCents,
        amountYuan: plan.amountYuan
      },
      payUrl: payment.payUrl,
      qrCodeUrl: payment.qrCodeUrl
    });
  } catch (error) {
    await admin
      .from("payment_orders")
      .update({
        status: "failed",
        raw_create_response: {
          error: error instanceof Error ? error.message : "Unknown Alipay error"
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    return NextResponse.json({ error: "Unable to start Alipay payment" }, { status: 502 });
  }
}
