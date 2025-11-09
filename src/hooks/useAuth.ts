import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { checkIfAdmin } from "@/lib/api";

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
  const authInitialized = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    let loadingTimeout: NodeJS.Timeout;

    const checkAdminStatus = async (email: string) => {
      try {
        const adminStatus = await checkIfAdmin(email);
        if (isMounted) {
          setIsAdmin(adminStatus);
        }
      } catch (err) {
        console.error("Failed to check admin status:", err);
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    };

    const handleAuthChange = (_event: string, session: unknown) => {
      if (!isMounted) return;

      const sess = session as { user?: { email?: string } } | null;
      const currentUser = sess?.user;

      setUser((currentUser as User) || null);

      if (currentUser?.email) {
        checkAdminStatus(currentUser.email);
      } else {
        setIsAdmin(false);
      }

      if (!authInitialized.current) {
        authInitialized.current = true;
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthChange);
    unsubscribe = authListener?.subscription?.unsubscribe;

    loadingTimeout = setTimeout(() => {
      if (isMounted && !authInitialized.current) {
        console.warn("Auth initialization timeout");
        authInitialized.current = true;
        setLoading(false);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      unsubscribe?.();
    };
  }, []);

  return { user, isAdmin, loading, error };
}
