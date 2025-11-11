import { supabase } from "./supabase";

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

    const { data, error } = await supabase
      .from("users")
      .insert({
        id: user.id,
        phone_number: phoneNumber,
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
