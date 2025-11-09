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
export async function loginWithPhoneAndPassword(phoneNumber: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${phoneNumber}@invoice-app.local`,
      password,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function signupWithPhoneAndPassword(
  phoneNumber: string,
  password: string,
  fullName: string,
  email: string
) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone_number: phoneNumber,
          full_name: fullName,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Signup failed");

    await createUserProfile(phoneNumber, fullName, email);

    return { success: true, data: authData };
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

export async function createUserProfile(phoneNumber: string, fullName?: string, email?: string) {
  try {
    const user = await getCurrentUser();
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

export async function createCheckoutSession(phoneNumber: string, planId: string, productId: string) {
  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        phoneNumber,
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
