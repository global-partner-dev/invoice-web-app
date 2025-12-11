import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "npm:stripe@^14.8.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface TopupCheckoutRequest {
  email: string;
  topupProductId: string;
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
    const body: TopupCheckoutRequest = await req.json();
    const { email, topupProductId } = body;

    if (!email || !topupProductId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Get topup product details from Supabase
    const { data: topupProduct, error: topupError } = await supabase
      .from("topup_products")
      .select("*")
      .eq("id", topupProductId)
      .single();

    if (topupError || !topupProduct) {
      console.error("Topup product fetch error:", topupError);
      return new Response(
        JSON.stringify({ error: "Topup product not found" }),
        {
          status: 404,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    const stripeProductId = topupProduct.stripe_product_id;

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

    // Get price for topup product (should be one-time payment)
    const prices = await stripe.prices.list({
      product: stripeProductId,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No active price found for topup product. Please set up a price in Stripe." 
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const priceId = prices.data[0].id;

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${frontendUrl}/dashboard/subscriptions?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/subscriptions`,
      metadata: {
        email,
        topupProductId,
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
