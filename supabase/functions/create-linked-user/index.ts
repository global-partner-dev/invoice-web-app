import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateLinkedUserRequest {
  accountantId: string;
  email: string;
  phoneNumber: string;
  fullName?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: CreateLinkedUserRequest = await req.json();
    const { accountantId, email, phoneNumber, fullName } = body;

    if (!accountantId || !email || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: accountantId, email, phoneNumber" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl || "", supabaseServiceRoleKey || "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the accountant exists and has a Premium subscription
    const accountantResponse = await supabaseAdmin
      .from("users")
      .select("id, subscription_id")
      .eq("id", accountantId)
      .single();

    if (accountantResponse.error || !accountantResponse.data) {
      console.error("Accountant not found:", accountantResponse.error);
      return new Response(
        JSON.stringify({ error: "Accountant not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if accountant has Premium subscription
    if (accountantResponse.data.subscription_id) {
      const subscriptionResponse = await supabaseAdmin
        .from("subscriptions")
        .select("plan_id, subscription_plans(name)")
        .eq("id", accountantResponse.data.subscription_id)
        .single();

      if (
        subscriptionResponse.error ||
        !subscriptionResponse.data ||
        (subscriptionResponse.data as any).subscription_plans?.name !== "Premium"
      ) {
        console.error("Accountant does not have Premium subscription");
        return new Response(
          JSON.stringify({ error: "Accountant must have Premium subscription to add clients" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Accountant must have Premium subscription to add clients" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if email already exists
    const existingUserResponse = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email);

    if (
      existingUserResponse.error === null &&
      existingUserResponse.data &&
      existingUserResponse.data.length > 0
    ) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use the default password for linked users
    const tempPassword = "zxcQWE123!@#";

    // Create auth user using service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error("Auth user creation error:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create user account" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user profile with related_account set to accountantId
    const normalizePhoneNumber = (phone: string) => {
      return phone.replace(/\D/g, "");
    };

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        phone_number: normalizePhoneNumber(phoneNumber),
        full_name: fullName || null,
        related_account: accountantId,
      })
      .select()
      .single();

    if (profileError || !userProfile) {
      console.error("User profile creation error:", profileError);
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create user profile" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Successfully created and linked user: ${userProfile.id} to accountant: ${accountantId}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: userProfile,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Create linked user error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
