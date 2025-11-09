import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, checkIfAdmin } from "@/lib/api";

interface User {
  id: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser || null);
        if (currentUser?.email) {
          const adminStatus = await checkIfAdmin(currentUser.email);
          setIsAdmin(adminStatus);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to get user"));
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null);
        if (session?.user?.email) {
          const adminStatus = await checkIfAdmin(session.user.email);
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return { user, isAdmin, loading, error };
}
