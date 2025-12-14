import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = decodeJWT(token);

    if (!payload || !payload.email) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl || "", supabaseServiceRoleKey || "", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: adminData, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("id, is_active")
      .eq("email", payload.email as string)
      .eq("is_active", true)
      .single();

    if (adminError && adminError.code !== "PGRST116") {
      console.error("Admin check error:", adminError);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin status" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!adminData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from("subscriptions")
      .select(`
        id,
        user_id,
        plan_id,
        status,
        current_period_end,
        invoice_limit,
        available_invoices,
        cancel_at_period_end,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (subscriptionsError) {
      console.error("Get subscriptions error:", subscriptionsError);
      return new Response(
        JSON.stringify({ error: subscriptionsError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const userIds = [...new Set(subscriptions.map((sub: unknown) => (sub as Record<string, unknown>).user_id))];
    const planIds = [...new Set(subscriptions.map((sub: unknown) => (sub as Record<string, unknown>).plan_id))];

    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email, phone_number, related_account")
      .in("id", userIds);

    if (usersError) {
      console.error("Get users error:", usersError);
      return new Response(
        JSON.stringify({ error: usersError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { data: plans, error: plansError } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, name, stripe_product_id")
      .in("id", planIds);

    if (plansError) {
      console.error("Get plans error:", plansError);
      return new Response(
        JSON.stringify({ error: plansError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const usersMap = new Map((users || []).map((u: unknown) => {
      const user = u as Record<string, unknown>;
      return [user.id, user];
    }));

    const plansMap = new Map((plans || []).map((p: unknown) => {
      const plan = p as Record<string, unknown>;
      return [plan.id, plan];
    }));

    const formattedSubscriptions = (subscriptions || []).map((sub: unknown) => {
      const subscription = sub as Record<string, unknown>;
      return {
        id: subscription.id,
        user_id: subscription.user_id,
        subscription_plan: plansMap.get(subscription.plan_id as string),
        user: usersMap.get(subscription.user_id as string),
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        invoice_limit: subscription.invoice_limit,
        available_invoices: subscription.available_invoices,
        cancel_at_period_end: subscription.cancel_at_period_end,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: formattedSubscriptions,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
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
          ...corsHeaders,
        },
      }
    );
  }
});
