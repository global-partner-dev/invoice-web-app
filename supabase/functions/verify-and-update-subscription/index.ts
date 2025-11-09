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
  email: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: VerifyRequest = await req.json();
    const { sessionId, email } = body;

    if (!sessionId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId or email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Verifying session ${sessionId} for ${email}`);

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
      .eq("email", email)
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
    if (!customerSession) {
      return new Response(
        JSON.stringify({ error: "No checkout session found for customer" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Session object keys: ${Object.keys(customerSession).join(", ")}`);
    console.log(`Session.subscription: ${customerSession.subscription}`);
    console.log(`Session.payment_status: ${customerSession.payment_status}`);

    let subscription: Record<string, unknown>;
    let productId: string;

    if (customerSession.subscription) {
      console.log(`Payment is a subscription: ${customerSession.subscription}`);
      subscription = await stripe.subscriptions.retrieve(customerSession.subscription as string);
      productId = (subscription.items as Record<string, unknown>).data[0]?.price?.product as string;
    } else {
      console.log(`Payment is one-time, fetching line items for session ${sessionId}`);
      const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
      console.log(`Line items count: ${lineItems.data.length}`);
      
      if (lineItems.data.length === 0) {
        console.error(`No line items found for session ${sessionId}`);
        return new Response(
          JSON.stringify({ error: "No line items found in checkout session" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const lineItem = lineItems.data[0];
      console.log(`Line item: ${JSON.stringify(lineItem)}`);

      if (!lineItem?.price?.product) {
        console.error(`No price or product found in line item`);
        return new Response(
          JSON.stringify({ error: "Could not find product information from payment" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      productId = lineItem.price.product as string;
      console.log(`Found product from line items: ${productId}`);

      subscription = {
        id: `one_time_${sessionId}`,
        status: "active",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 365,
        cancel_at_period_end: false,
      };

      console.log(`Created synthetic subscription for one-time payment, product: ${productId}`);
    }

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

    const stripeSubscriptionId = customerSession.subscription || `one_time_${sessionId}`;

    const subscriptionData = {
      user_id: user.id,
      plan_id: plan.id,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      status: (subscription.status as string) || "active",
      current_period_start: new Date((subscription.current_period_start as number) * 1000).toISOString(),
      current_period_end: new Date((subscription.current_period_end as number) * 1000).toISOString(),
      cancel_at_period_end: (subscription.cancel_at_period_end as boolean) || false,
    };

    const existingSubscriptionResponse = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", stripeSubscriptionId);

    let subscriptionId: string;

    if (existingSubscriptionResponse.data && existingSubscriptionResponse.data.length > 0) {
      const existingSub = existingSubscriptionResponse.data[0];
      const updateResponse = await supabaseAdmin
        .from("subscriptions")
        .update(subscriptionData)
        .eq("id", existingSub.id)
        .select()
        .single();

      if (updateResponse.error) {
        console.error("Subscription update error:", updateResponse.error);
        throw updateResponse.error;
      }
      subscriptionId = existingSub.id;
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
