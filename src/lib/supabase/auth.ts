import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser(): Promise<{
  userId: string;
  email: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const claims = data.claims;
  return {
    userId: String(claims.sub),
    email: typeof claims.email === "string" ? claims.email : null,
  };
}

export async function getApiUser(): Promise<{
  userId: string;
  email: string | null;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return null;

  const claims = data.claims;
  return {
    userId: String(claims.sub),
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
