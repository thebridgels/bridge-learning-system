import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client using the service-role key. Server-only, and
 * deliberately isolated in this one file — the only code allowed to import
 * it is trusted server-side account-deletion logic. Never expose this
 * client, its key, or anything derived from it to the browser.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
