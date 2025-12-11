import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.8.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function getPlanInvoiceLimit(stripeProductId: string): number {
  const PLAN_LIMITS: Record<string, number> = {
    'prod_TNzwfr5LsNLC9b': 50,
    'prod_TO00dJw423j5fk': 100,
    'prod_TO01G6FwP0mI9R': 250,
  };
  
  return PLAN_LIMITS[stripeProductId] || 0;
}

async function updateUserSubscription(event: Record<string, unknown>) {
  try {
    const data = event.data as Record<string, unknown>;
    const object = data.object as Record<string, unknown>;
    const { customer, subscription, metadata } = object;
    const metadataObj = metadata as Record<string, unknown>;
    const email = metadataObj?.email;

    if (!email) {
      console.error("No email in metadata");
      return;
    }

    console.log(`Processing subscription for email: ${email}, sub_id: ${subscription}`);

    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?email=eq.${email}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey || "",
        },
      }
    ).then((r) => r.json());

    const user = userResponse[0];
    if (!user) {
      console.error("User not found for email:", email);
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

    const invoiceLimit = getPlanInvoiceLimit(plan.stripe_product_id);

    const currentPeriodStart = new Date((object.current_period_start as number) * 1000).toISOString();
    const currentPeriodEnd = new Date((object.current_period_end as number) * 1000).toISOString();

    const subscriptionData = {
      user_id: user.id,
      plan_id: plan.id,
      stripe_customer_id: customer,
      stripe_subscription_id: subscription,
      status: object.status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: object.cancel_at_period_end as boolean || false,
      billing_cycle_start: currentPeriodStart,
      billing_cycle_end: currentPeriodEnd,
      invoice_limit: invoiceLimit,
      available_invoices: invoiceLimit,
      invoice_count: 0,
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
      
      const updatePayload = {
        status: object.status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        billing_cycle_start: currentPeriodStart,
        billing_cycle_end: currentPeriodEnd,
        cancel_at_period_end: object.cancel_at_period_end as boolean || false,
        invoice_limit: invoiceLimit,
        available_invoices: invoiceLimit,
        invoice_count: 0,
      };

      console.log(`Update payload:`, updatePayload);
      
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/subscriptions?stripe_subscription_id=eq.${subscription}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
            apikey: supabaseServiceRoleKey || "",
            Prefer: "return=representation",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`Failed to update subscription: ${updateResponse.status}`, errorText);
        throw new Error(`Failed to update subscription: ${errorText}`);
      } else {
        const updateResult = await updateResponse.json();
        console.log(`Subscription updated successfully:`, {
          id: updateResult[0]?.id,
          invoice_limit: updateResult[0]?.invoice_limit,
          available_invoices: updateResult[0]?.available_invoices,
          status: updateResult[0]?.status,
        });
      }

      subscriptionId = existingResponse[0].id;
    } else {
      console.log(`Creating new subscription`);
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey || "",
          Prefer: "return=representation",
        },
        body: JSON.stringify(subscriptionData),
      });

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        console.error(`Failed to create subscription: ${insertResponse.status}`, errorText);
        throw new Error(`Failed to create subscription: ${errorText}`);
      }

      const insertResult = await insertResponse.json();
      subscriptionId = insertResult[0]?.id;
      console.log(`Subscription created with data:`, {
        id: subscriptionId,
        invoice_limit: insertResult[0]?.invoice_limit,
        available_invoices: insertResult[0]?.available_invoices,
      });
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

    if (productId === 'prod_TO01G6FwP0mI9R') {
      console.log(`Creating accountant account for Premium plan subscriber: ${user.id}`);
      
      const accountNumber = `ACC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const accountantCheckResponse = await fetch(
        `${supabaseUrl}/rest/v1/accountant_accounts?user_id=eq.${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
            apikey: supabaseServiceRoleKey || "",
          },
        }
      ).then((r) => r.json());

      if (!accountantCheckResponse[0]) {
        const createAccountantResponse = await fetch(
          `${supabaseUrl}/rest/v1/accountant_accounts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceRoleKey}`,
              apikey: supabaseServiceRoleKey || "",
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              user_id: user.id,
              accountant_account_number: accountNumber,
              client_invoice_count: 0,
              max_client_invoices: 500,
            }),
          }
        );

        if (createAccountantResponse.ok) {
          const accountantData = await createAccountantResponse.json();
          console.log(`Accountant account created: ${accountantData[0]?.id}`);
          
          await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceRoleKey}`,
              apikey: supabaseServiceRoleKey || "",
            },
            body: JSON.stringify({
              accountant_account_id: accountantData[0]?.id,
            }),
          });
        } else {
          const errorText = await createAccountantResponse.text();
          console.error(`Failed to create accountant account: ${createAccountantResponse.status}`, errorText);
        }
      } else {
        console.log(`User already has accountant account: ${accountantCheckResponse[0].id}`);
      }
    }
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
