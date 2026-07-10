"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
};

type AuthContextValue = AuthState & {
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  useEffect(() => {
    console.info("Auth bootstrap", {
      configured,
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    });
  }, [configured]);

  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    configured,
  });

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      // No credentials — run in local-only mode.
      return;
    }

    // Restore existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
        configured: true,
      });
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }));
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const email = state.user?.email?.trim().toLowerCase();

    if (!supabase || !state.user?.id || !email) {
      return;
    }

    const acceptedAt = new Date().toISOString();
    void supabase
      .from("programme_access")
      .update({ grantee_id: state.user.id, accepted_at: acceptedAt })
      .is("grantee_id", null)
      .ilike("grantee_email", email);
  }, [state.user?.email, state.user?.id]);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: "Supabase is not configured. Running in local-only mode." };
    }

    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error("Magic link sign-in failed", error.message);
    } else {
      console.info("Magic link requested", { email });
    }

    return { error: error?.message ?? null };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: "Supabase is not configured. Running in local-only mode." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Password sign-in failed", error.message);
    } else {
      console.info("Password sign-in succeeded", { email });
    }

    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      console.info("Signed out");
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("ai-literacy-planner:public-token");
    }

    setState((prev) => ({ ...prev, session: null, user: null }));

    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, signInWithMagicLink, signInWithPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
