import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.8.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function updateUserSubscription(event: Record<string, unknown>) {
  try {
    const data = event.data as Record<string, unknown>;
    const object = data.object as Record<string, unknown>;
    const { customer, subscription, metadata } = object;
    const metadataObj = metadata as Record<string, unknown>;
    const phoneNumber = metadataObj?.phoneNumber;

    if (!phoneNumber) {
      console.error("No phone number in metadata");
      return;
    }

    console.log(`Processing subscription for phone: ${phoneNumber}, sub_id: ${subscription}`);

    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?phone_number=eq.${phoneNumber}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey || "",
        },
      }
    ).then((r) => r.json());

    const user = userResponse[0];
    if (!user) {
      console.error("User not found for phone number:", phoneNumber);
      return;
    }

    console.log(`Found user: ${user.id}`);

    const productId = object.items && (object.items as Array<Record<string, unknown>>)[0]?.price?.product;
    
    if (!productId) {
      console.error("No product ID found in subscription items");
      return;
    }

    const planResponse = await fetch(
      `${supabaseUrl}/rest/v1/subscription_plans?stripe_product_id=eq.${productId}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey || "",
        },
      }
    ).then((r) => r.json());

    const plan = planResponse[0];
    if (!plan) {
      console.error("Plan not found for product:", productId);
      return;
    }

    console.log(`Found plan: ${plan.id}`);

    const subscriptionData = {
      user_id: user.id,
      plan_id: plan.id,
      stripe_customer_id: customer,
      stripe_subscription_id: subscription,
      status: object.status,
      current_period_start: new Date((object.current_period_start as number) * 1000).toISOString(),
      current_period_end: new Date((object.current_period_end as number) * 1000).toISOString(),
      cancel_at_period_end: object.cancel_at_period_end as boolean || false,
    };

    const existingResponse = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subscription}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey || "",
        },
      }
    ).then((r) => r.json());

    let subscriptionId: string;

    if (existingResponse.length > 0) {
      console.log(`Updating existing subscription: ${existingResponse[0].id}`);
      const updateResult = await fetch(
        `${supabaseUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subscription}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
            apikey: supabaseServiceRoleKey || "",
            Prefer: "return=representation",
          },
          body: JSON.stringify(subscriptionData),
        }
      ).then((r) => r.json());

      subscriptionId = existingResponse[0].id;
      console.log(`Subscription updated: ${subscriptionId}`);
    } else {
      console.log(`Creating new subscription`);
      const insertResult = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey || "",
          Prefer: "return=representation",
        },
        body: JSON.stringify(subscriptionData),
      }).then((r) => r.json());

      subscriptionId = insertResult[0]?.id;
      console.log(`Subscription created: ${subscriptionId}`);
    }

    const updateUserResult = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey || "",
      },
      body: JSON.stringify({
        subscription_id: subscriptionId,
      }),
    }).then((r) => r.json());

    console.log(`User ${user.id} subscription_id updated to ${subscriptionId}`);
  } catch (error) {
    console.error("updateUserSubscription error:", error);
    throw error;
  }
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature || "",
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await updateUserSubscription(event);
        break;

      case "customer.subscription.deleted": {
        const subscriptionData = event.data as Record<string, unknown>;
        const subscriptionObj = subscriptionData.object as Record<string, unknown>;
        await fetch(
          `${supabaseUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subscriptionObj.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceRoleKey}`,
              apikey: supabaseServiceRoleKey || "",
            },
            body: JSON.stringify({
              status: "canceled",
              canceled_at: new Date().toISOString(),
              ended_at: new Date().toISOString(),
            }),
          }
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook signature verification failed" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
