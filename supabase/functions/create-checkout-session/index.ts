import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.8.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface CheckoutRequest {
  phoneNumber: string;
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
    const { phoneNumber, productId } = body;

    if (!phoneNumber || !productId) {
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
      email: `${phoneNumber}@invoice-app.local`,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: `${phoneNumber}@invoice-app.local`,
        metadata: {
          phoneNumber,
        },
      });
      customerId = customer.id;
    }

    // Get price for the product
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      type: "one_time",
      limit: 1,
    });

    if (prices.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active price found for product" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const priceId = prices.data[0].id;

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:8080";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${frontendUrl}/dashboard/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/subscribe`,
      metadata: {
        phoneNumber,
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
      JSON.stringify({ error: error.message }),
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
