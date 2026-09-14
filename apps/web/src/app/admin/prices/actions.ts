"use server";

import { revalidatePath } from "next/cache";
import { priceKeys, type PriceKey } from "@casa-marga/shared/pricing";
import { requireStaff } from "@/lib/server/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PriceActionState = { status: "idle" | "success" | "error"; message: string };

export async function updatePrice(_previous: PriceActionState, formData: FormData): Promise<PriceActionState> {
  await requireStaff(["admin"]);
  const key = String(formData.get("key") ?? "");
  const raw = String(formData.get("amount") ?? "").trim();
  const expectedVersion = Number(formData.get("version"));
  const note = String(formData.get("note") ?? "").trim();
  if (!(priceKeys as readonly string[]).includes(key) || !/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(raw) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || note.length > 300) {
    console.warn("Price update rejected: invalid input", { key });
    return { status: "error", message: "Enter a valid PHP amount (0–999,999.99), then try again." };
  }
  const amountMinor = Math.round(Number(raw) * 100);
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("staff_update_snowaz_price", {
    price_key: key as PriceKey, new_amount_minor: amountMinor,
    expected_version: expectedVersion, change_note: note,
  });
  if (error || !data) {
    console.warn("Price update rejected by database", { key, code: error?.code });
    return { status: "error", message: error?.message?.includes("stale") ? "Another admin changed pricing. Refresh and review the current value." : "The price could not be saved. Please refresh and try again." };
  }
  revalidatePath("/"); revalidatePath("/book"); revalidatePath("/admin"); revalidatePath("/admin/prices");
  return { status: "success", message: "Price saved. New booking quotes now use the updated amount." };
}
