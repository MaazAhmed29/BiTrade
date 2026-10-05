import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requirePublicSupabaseEnv } from "@/lib/env";

export async function createClient() {
  // Read cookies first so Next marks requesting routes as dynamic
  // before any environment validation can fail during prerendering.
  const cookieStore = await cookies();
  const { url, publishableKey } = requirePublicSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The setAll method was called from a Server Component.
          // This can be ignored if a proxy is refreshing user sessions.
        }
      },
    },
  });
}
