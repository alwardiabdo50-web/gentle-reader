import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PLAN_CONFIG: Record<string, { monthly_credits: number; plan_name: string }> = {
  prod_U75gHF5XUrUy2E: { monthly_credits: 10000, plan_name: "starter" },
  prod_U75gA8gdsRsNaJ: { monthly_credits: 50000, plan_name: "pro" },
  prod_U75h0OkYXcc0mu: { monthly_credits: 250000, plan_name: "scale" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "No signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing event: ${event.type} (${event.id})`);

    // Check if event already processed
    const { data: existingEvent } = await supabaseAdmin
      .from("webhook_events")
      .select("id")
      .eq("event_id", event.id)
      .single();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store webhook event
    await supabaseAdmin.from("webhook_events").insert({
      provider: "stripe",
      event_id: event.id,
      event_type: event.type,
      payload_json: event,
      processed: false,
    });

    // Process event
    try {
      await processStripeEvent(event, supabaseAdmin);

      // Mark as processed
      await supabaseAdmin
        .from("webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("event_id", event.id);

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing event:", error);
      await supabaseAdmin
        .from("webhook_events")
        .update({ error_message: error.message })
        .eq("event_id", event.id);

      throw error;
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processStripeEvent(event: Stripe.Event, supabaseAdmin: any) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChange(event.data.object as Stripe.Subscription, supabaseAdmin);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabaseAdmin);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice, supabaseAdmin);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription, supabaseAdmin: any) {
  const customerId = subscription.customer as string;
  const productId = subscription.items.data[0].price.product as string;
  const priceId = subscription.items.data[0].price.id;

  // Get user by customer ID
  const { data: customer } = await supabaseAdmin
    .rpc("get_user_by_stripe_customer", { stripe_customer_id: customerId })
    .single();

  if (!customer) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  const userId = customer.user_id;

  // Upsert subscription
  await supabaseAdmin.from("subscriptions").upsert({
    user_id: userId,
    provider: "stripe",
    provider_customer_id: customerId,
    provider_subscription_id: subscription.id,
    price_id: priceId,
    product_id: productId,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: "provider_subscription_id",
  });

  // Update profile plan
  const planConfig = PLAN_CONFIG[productId];
  if (planConfig && subscription.status === "active") {
    await supabaseAdmin
      .from("profiles")
      .update({
        plan: planConfig.plan_name,
        monthly_credits: planConfig.monthly_credits,
      })
      .eq("user_id", userId);
  }

  console.log(`Subscription ${subscription.status} for user ${userId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabaseAdmin: any) {
  const customerId = subscription.customer as string;

  // Get user by customer ID
  const { data: customer } = await supabaseAdmin
    .rpc("get_user_by_stripe_customer", { stripe_customer_id: customerId })
    .single();

  if (!customer) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  const userId = customer.user_id;

  // Update subscription status
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("provider_subscription_id", subscription.id);

  // Revert to free plan
  await supabaseAdmin
    .from("profiles")
    .update({
      plan: "free",
      monthly_credits: 500,
    })
    .eq("user_id", userId);

  console.log(`Subscription canceled for user ${userId}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice, supabaseAdmin: any) {
  const customerId = invoice.customer as string;

  // Get user by customer ID
  const { data: customer } = await supabaseAdmin
    .rpc("get_user_by_stripe_customer", { stripe_customer_id: customerId })
    .single();

  if (!customer) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  const userId = customer.user_id;

  // Reset credits used for the new billing period
  await supabaseAdmin
    .from("profiles")
    .update({
      credits_used: 0,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("user_id", userId);

  // Record monthly credit grant in ledger
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("monthly_credits")
    .eq("user_id", userId)
    .single();

  if (profile) {
    await supabaseAdmin.from("usage_ledger").insert({
      user_id: userId,
      action: "monthly_grant",
      credits: 0, // Just recording the event, not changing balance
      balance_after: profile.monthly_credits,
      source_type: "system",
      metadata_json: {
        invoice_id: invoice.id,
        amount_paid: invoice.amount_paid,
      },
    });
  }

  console.log(`Invoice paid for user ${userId}, credits reset`);
}