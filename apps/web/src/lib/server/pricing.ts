import "server-only";
import { parseSnowazPrices, type SnowazPrices } from "@casa-marga/shared/pricing";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";

export type ActivePricing = { prices: SnowazPrices; version: number };

export async function getActivePricing(): Promise<ActivePricing> {
  const client = createPublicSupabaseClient();
  if (!client) throw new Error("Pricing service is unavailable.");
  const { data, error } = await client.rpc("get_snowaz_active_pricing");
  if (error || !data) throw new Error("Pricing service is unavailable.");
  const value = data as { prices?: unknown; version?: unknown };
  const version = Number(value.version);
  if (!Number.isSafeInteger(version) || version < 1) throw new Error("Pricing version is invalid.");
  return { prices: parseSnowazPrices(value.prices), version };
}
