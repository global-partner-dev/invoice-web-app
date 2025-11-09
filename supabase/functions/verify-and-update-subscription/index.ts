import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.8.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  sessionId: string;
  phoneNumber: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: VerifyRequest = await req.json();
    const { sessionId, phoneNumber } = body;

    if (!sessionId || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId or phoneNumber" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Verifying session ${sessionId} for ${phoneNumber}`);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Session status: ${session.payment_status}`);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not completed", status: session.payment_status }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl || "", supabaseServiceRoleKey || "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userResponse = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    if (userResponse.error || !userResponse.data) {
      console.error("User not found:", userResponse.error);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = userResponse.data;
    const stripeCustomerId = session.customer as string;

    if (!stripeCustomerId) {
      return new Response(
        JSON.stringify({ error: "No customer associated with session" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const customerSessions = await stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      limit: 1,
    });

    const customerSession = customerSessions.data[0];
    if (!customerSession?.subscription) {
      return new Response(
        JSON.stringify({ error: "No subscription created for this payment" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(customerSession.subscription as string);

    const productId = subscription.items.data[0]?.price.product as string;

    const planResponse = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("stripe_product_id", productId)
      .single();

    if (planResponse.error || !planResponse.data) {
      console.error("Plan not found:", planResponse.error);
      return new Response(
        JSON.stringify({ error: "Subscription plan not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const plan = planResponse.data;

    const subscriptionData = {
      user_id: user.id,
      plan_id: plan.id,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    const existingSubscriptionResponse = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    let subscriptionId: string;

    if (existingSubscriptionResponse.data) {
      const updateResponse = await supabaseAdmin
        .from("subscriptions")
        .update(subscriptionData)
        .eq("id", existingSubscriptionResponse.data.id)
        .select()
        .single();

      if (updateResponse.error) {
        console.error("Subscription update error:", updateResponse.error);
        throw updateResponse.error;
      }
      subscriptionId = updateResponse.data.id;
    } else {
      const insertResponse = await supabaseAdmin
        .from("subscriptions")
        .insert(subscriptionData)
        .select()
        .single();

      if (insertResponse.error) {
        console.error("Subscription insert error:", insertResponse.error);
        throw insertResponse.error;
      }
      subscriptionId = insertResponse.data.id;
    }

    const userUpdateResponse = await supabaseAdmin
      .from("users")
      .update({ subscription_id: subscriptionId })
      .eq("id", user.id)
      .select()
      .single();

    if (userUpdateResponse.error) {
      console.error("User update error:", userUpdateResponse.error);
      throw userUpdateResponse.error;
    }

    console.log(`Successfully synced subscription for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscriptionId,
          status: subscription.status,
          plan: plan.name,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
