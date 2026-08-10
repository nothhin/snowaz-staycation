"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hashDepositToken, isValidDepositToken } from "@/lib/server/deposit-token";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";

export async function submitDepositReference(formData: FormData) {
  const parsed = z.object({ token: z.string().refine(isValidDepositToken), senderName: z.string().trim().min(2).max(120), reference: z.string().trim().min(6).max(80), confirmedAmount: z.literal("1000") }).safeParse({ token: formData.get("token"), senderName: formData.get("senderName"), reference: formData.get("reference"), confirmedAmount: formData.get("confirmedAmount") });
  if (!parsed.success) redirect(`/deposit/${String(formData.get("token") || "invalid")}?error=invalid`);
  const supabase = createPublicSupabaseClient();
  if (!supabase) throw new Error("Deposit service is unavailable.");
  const { data: updated, error } = await supabase.rpc("submit_snowaz_deposit_reference", { token_hash: hashDepositToken(parsed.data.token), sender_name: parsed.data.senderName, payment_reference: parsed.data.reference });
  if (error || !updated) redirect(`/deposit/${parsed.data.token}?error=expired`);
  redirect(`/deposit/${parsed.data.token}?submitted=1`);
}
