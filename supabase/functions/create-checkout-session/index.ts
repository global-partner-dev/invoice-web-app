import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import Stripe from "npm:stripe@^14.8.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface CheckoutRequest {
  email: string;
  planId: string;
  productId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body: CheckoutRequest = await req.json();
    const { email, productId } = body;

    if (!email || !productId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get or create Stripe customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          email,
        },
      });
      customerId = customer.id;
    }

    let recurringPrices = await stripe.prices.list({
      product: productId,
      active: true,
      type: "recurring",
      limit: 1,
    });

    let mode: "subscription" | "payment" = "subscription";
    let priceId: string;

    if (recurringPrices.data.length > 0) {
      priceId = recurringPrices.data[0].id;
      console.log(`Using recurring price: ${priceId}`);
    } else {
      console.log(`No recurring price found, trying one-time price for product ${productId}`);
      const oneTimePrices = await stripe.prices.list({
        product: productId,
        active: true,
        type: "one_time",
        limit: 1,
      });

      if (oneTimePrices.data.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: "No active price found for product. Please set up a recurring or one-time price in Stripe." 
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      priceId = oneTimePrices.data[0].id;
      mode = "payment";
      console.log(`Using one-time price: ${priceId}`);
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${frontendUrl}/dashboard/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/subscribe`,
      metadata: {
        email,
        productId,
      },
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
