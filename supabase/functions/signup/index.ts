import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const body: SignupRequest = await req.json();
    let { email, password, fullName, phoneNumber } = body;

    if (!email || !password || !fullName || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Normalize phone number to format: 5217221015653
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    
    // If it already starts with 52, use it as is
    // Otherwise, add country code 52 (assuming Mexican numbers)
    if (digitsOnly.startsWith("52")) {
      phoneNumber = digitsOnly;
    } else if (digitsOnly.startsWith("1")) {
      // Mexican mobile numbers starting with 1
      phoneNumber = `52${digitsOnly}`;
    } else if (digitsOnly.length >= 10) {
      // Other valid length numbers, add country code
      phoneNumber = `52${digitsOnly}`;
    } else {
      // Too short, but still normalize
      phoneNumber = `52${digitsOnly}`;
    }

    const supabaseAdmin = createClient(supabaseUrl || "", supabaseServiceRoleKey || "", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone_number: phoneNumber,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authData.user.id,
        phone_number: phoneNumber,
        full_name: fullName,
        email,
        free_tier_invoice_count: 2,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
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
      JSON.stringify({ error: error.message || "Internal server error" }),
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
