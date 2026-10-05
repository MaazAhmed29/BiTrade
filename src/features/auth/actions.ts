"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeEmail,
  normalizeUsername,
  safeNextPath,
  validateLogin,
  validateSignup,
} from "@/features/auth/validation";

export type AuthFormState = {
  error?: string;
  message?: string;
} | null;

function mapLoginError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Invalid email or password.";
  if (lower.includes("email not confirmed")) {
    return "Confirm your email address before signing in. Check your inbox.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return "Could not sign in right now. Try again.";
}

function mapSignupError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (lower.includes("username")) return message;
  if (lower.includes("password")) return message;
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return "Could not create the account right now. Try again.";
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  const validationError = validateLogin({ email, password });
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: mapLoginError(error.message) };

  redirect(next);
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = normalizeUsername(formData.get("username"));
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  const validationError = validateSignup({ username, email, password });
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) return { error: mapSignupError(error.message) };

  if (data.session) {
    redirect("/dashboard");
  }

  return { message: "Account created. Confirm your email address, then sign in." };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
