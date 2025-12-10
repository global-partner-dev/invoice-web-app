import { supabase } from "./supabase";
import { normalizePhoneNumber } from "./utils";

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain a number" };
  }
  if (!/[!@#$%^&*()_+=[\]{};':"\\|,.<>?-]/.test(password)) {
    return { valid: false, error: "Password must contain a special character" };
  }
  return { valid: true };
}

// Auth API functions - Password based
export async function loginWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function signupWithEmail(
  email: string,
  password: string,
  fullName: string,
  phoneNumber?: string
) {
  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        phoneNumber,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create account");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

// User profile functions
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Get user profile error:", error);
    throw error;
  }
}

export async function createUserProfile(phoneNumber: string, fullName?: string, email?: string, userId?: string) {
  try {
    let user;
    if (userId) {
      user = { id: userId };
    } else {
      user = await getCurrentUser();
    }
    if (!user) throw new Error("No authenticated user");

    // Normalize phone number to format: 5217221015653
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const { data, error } = await supabase
      .from("users")
      .insert({
        id: user.id,
        phone_number: normalizedPhone,
        full_name: fullName,
        email,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Create user profile error:", error);
    throw error;
  }
}

export interface TaxProfile {
  id: string;
  user_id: string;
  rfc: string | null;
  tax_regime: string | null;
  first_name: string | null;
  first_surname: string | null;
  second_surname: string | null;
  postal_code: string | null;
  curp: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  apply_iva: boolean | null;
  apply_isr: boolean | null;
  tax_inclusive: boolean | null;
  iva_rate: number | null;
  isr_rate: number | null;
  certificate_path: string | null;
  certificate_key_path: string | null;
  certificate_passphrase: string | null;
  certificate_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertTaxProfilePayload {
  rfc: string | null;
  tax_regime: string | null;
  first_name: string | null;
  first_surname: string | null;
  second_surname: string | null;
  postal_code: string | null;
  curp: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  apply_iva?: boolean | null;
  apply_isr?: boolean | null;
  tax_inclusive?: boolean | null;
  iva_rate?: number | null;
  isr_rate?: number | null;
}

export async function getUserTaxProfile(userId: string) {
  const { data, error } = await supabase
    .from("tax_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  return data as TaxProfile;
}

export async function upsertUserTaxProfile(userId: string, payload: UpsertTaxProfilePayload) {
  const { data, error } = await supabase
    .from("tax_profiles")
    .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data as TaxProfile;
}

export type TaxProfileExtractionResult = UpsertTaxProfilePayload;

export async function extractTaxProfileFromDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  if (token) {
    headers["x-supabase-auth-token"] = token;
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/extract-tax-profile`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to extract document";
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.error === "string") {
        message = errorBody.error;
      }
    } catch (parseError) {
      console.error("Failed to parse extraction error response", parseError);
    }
    throw new Error(message);
  }

  const result = await response.json();
  return result.data as TaxProfileExtractionResult;
}

export async function uploadCertificate(certificateFile: File, keyFile: File, passphrase: string = "") {
  const formData = new FormData();
  formData.append("certificate", certificateFile);
  formData.append("key", keyFile);
  formData.append("passphrase", passphrase);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error("No authentication token available");
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/upload-certificate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to upload certificate";
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.error === "string") {
        message = errorBody.error;
      }
    } catch (parseError) {
      console.error("Failed to parse upload error response", parseError);
    }
    throw new Error(message);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteCertificate(userId: string) {
  const { error } = await supabase
    .from("tax_profiles")
    .update({
      certificate_path: null,
      certificate_key_path: null,
      certificate_uploaded_at: null,
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function updateUserProfile(userId: string, updates: Record<string, unknown>) {
  try {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Update user profile error:", error);
    throw error;
  }
}

// Subscription functions
export async function getSubscriptionPlans() {
  try {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Get subscription plans error:", error);
    throw error;
  }
}

export async function getUserSubscription(userId: string) {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }
    return data || null;
  } catch (error) {
    console.error("Get user subscription error:", error);
    return null;
  }
}

export async function createCheckoutSession(email: string, planId: string, productId: string) {
  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        planId,
        productId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create checkout session");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Create checkout session error:", error);
    throw error;
  }
}

export async function getSubscriptionStatus(subscriptionId: string) {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, subscription_plans(*)")
      .eq("id", subscriptionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Get subscription status error:", error);
    throw error;
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
      })
      .eq("id", subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Cancel subscription error:", error);
    throw error;
  }
}

export async function verifyAndUpdateSubscription(sessionId: string, email: string) {
  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-and-update-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        sessionId,
        email,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to verify subscription");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Verify subscription error:", error);
    throw error;
  }
}

export async function checkIfAdmin(email: string) {
  try {
    const { data, error } = await supabase
      .from("admins")
      .select("id, is_active")
      .eq("email", email)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }
    return data ? true : false;
  } catch (error) {
    console.error("Check admin error:", error);
    return false;
  }
}

export async function getAllUsers() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error("User is not authenticated");
    }

    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-all-users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch users");
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Get all users error:", error);
    throw error;
  }
}

// Invoice Usage and Subscription Details

export async function getSubscriptionUsage(userId: string) {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(`
        id,
        available_invoices,
        invoice_limit,
        status,
        plan_id,
        subscription_plans (
          id,
          name
        )
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (data) {
      return {
        subscriptionId: data.id,
        availableInvoices: data.available_invoices || data.invoice_limit || 0,
        invoiceLimit: data.invoice_limit || 0,
        planName: data.subscription_plans?.[0]?.name || "Unknown",
        status: data.status,
      };
    }

    return {
      subscriptionId: null,
      availableInvoices: 2,
      invoiceLimit: 2,
      planName: "Free",
      status: "inactive",
    };
  } catch (error) {
    console.error("Get subscription usage error:", error);
    throw error;
  }
}

export async function getInvoiceHistory(userId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from("invoice_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Get invoice history error:", error);
    throw error;
  }
}

export async function getAccountantAccount(userId: string) {
  try {
    const { data, error } = await supabase
      .from("accountant_accounts")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error("Get accountant account error:", error);
    throw error;
  }
}

export async function getAccountantClients(userId: string) {
  try {
    const { data, error } = await supabase
      .from("accountant_clients")
      .select("*")
      .eq("accountant_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Get accountant clients error:", error);
    throw error;
  }
}

export async function addAccountantClient(
  userId: string,
  clientName: string,
  clientRfc?: string,
  clientEmail?: string,
  clientPhone?: string
) {
  try {
    const { data, error } = await supabase
      .from("accountant_clients")
      .insert([
        {
          accountant_id: userId,
          client_name: clientName,
          client_rfc: clientRfc || null,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Add accountant client error:", error);
    throw error;
  }
}

export async function deleteAccountantClient(clientId: string) {
  try {
    const { error } = await supabase
      .from("accountant_clients")
      .delete()
      .eq("id", clientId);

    if (error) throw error;
  } catch (error) {
    console.error("Delete accountant client error:", error);
    throw error;
  }
}

// Top-up Products and Purchases

export async function getTopupProducts() {
  try {
    const { data, error } = await supabase
      .from("topup_products")
      .select("*")
      .eq("is_active", true)
      .order("invoice_count", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Get topup products error:", error);
    throw error;
  }
}

export async function createTopupCheckoutSession(email: string, topupProductId: string) {
  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-topup-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        topupProductId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create topup checkout session");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Create topup checkout session error:", error);
    throw error;
  }
}

export async function getActiveTopups(userId: string) {
  try {
    const { data, error } = await supabase
      .from("topup_purchases")
      .select(`
        id,
        invoice_count,
        used_count,
        expires_at,
        purchased_at,
        topup_products (
          name,
          invoice_count
        )
      `)
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .eq("is_used", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Get active topups error:", error);
    throw error;
  }
}
