import supabase from "@/lib/supabase/createClient";

// Consent state stored on the `profiles` row. A single timestamp — the exact
// text a user agreed to is recoverable from git history of src/content/*.md.
export interface ConsentStatus {
  tos_accepted_at: string | null;
}

export function hasAcceptedTos(c: ConsentStatus): boolean {
  return !!c.tos_accepted_at;
}

export async function getConsentStatus(
  userId: string
): Promise<ConsentStatus | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("tos_accepted_at")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as ConsentStatus;
}

// Record acceptance of the Terms of Service and Privacy Policy. Acceptance also
// covers research participation (the public archive and coded data sharing),
// which are conditions of using Prophet, not separate optional choices — see
// Terms of Service Section 6. Used by the signup flow and the consent gate.
export async function recordConsent(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ tos_accepted_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
