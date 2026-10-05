import { createBrowserClient } from "@supabase/ssr";
import { requirePublicSupabaseEnv } from "@/lib/env";

export function createClient() {
  const { url, publishableKey } = requirePublicSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
