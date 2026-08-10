import { stayDateSchema, stayNights } from "@casa-marga/shared/booking";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const from = stayDateSchema.safeParse(url.searchParams.get("from"));
  const to = stayDateSchema.safeParse(url.searchParams.get("to"));

  if (!from.success || !to.success || from.data >= to.data || stayNights(from.data, to.data) > 93) {
    return Response.json({ requestId, error: { code: "INVALID_SCHEDULE_RANGE", message: "Choose a valid calendar range of up to 93 days." } }, { status: 400, headers: noStoreHeaders });
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return Response.json({ requestId, error: { code: "SERVICE_NOT_CONFIGURED", message: "Live availability is not configured yet." } }, { status: 503, headers: noStoreHeaders });
  }

  try {
    const { data, error } = await supabase.from("snowaz_calendar_ranges")
      .select("check_in,check_out,display_status")
      .lt("check_in", to.data).gt("check_out", from.data);
    if (error) throw error;

    return Response.json({ requestId, data: { from: from.data, to: to.data, ranges: [
      ...(data ?? []).map((range) => ({ checkIn: range.check_in, checkOut: range.check_out, status: range.display_status })),
    ] } }, { headers: noStoreHeaders });
  } catch {
    return Response.json({ requestId, error: { code: "SCHEDULE_UNAVAILABLE", message: "Availability could not be checked right now." } }, { status: 503, headers: noStoreHeaders });
  }
}
