import { and, gt, inArray, lt } from "drizzle-orm";
import { bookingRequests, createDatabase, reservations } from "@casa-marga/db";
import { stayDateSchema, stayNights } from "@casa-marga/shared/booking";
import { parseDatabaseEnvironment } from "@/lib/server/env";

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

  const configuration = parseDatabaseEnvironment();
  if (!configuration.success) {
    return Response.json({ requestId, error: { code: "SERVICE_NOT_CONFIGURED", message: "Live availability is not configured yet." } }, { status: 503, headers: noStoreHeaders });
  }

  const database = createDatabase(configuration.data.DATABASE_URL);
  try {
    const confirmed = await database.db.select({ checkIn: reservations.checkIn, checkOut: reservations.checkOut })
      .from(reservations)
      .where(and(inArray(reservations.status, ["confirmed", "checked_in"]), lt(reservations.checkIn, to.data), gt(reservations.checkOut, from.data)));
    const enquiries = await database.db.select({ checkIn: bookingRequests.checkIn, checkOut: bookingRequests.checkOut })
      .from(bookingRequests)
      .where(and(inArray(bookingRequests.status, ["pending", "contacted"]), lt(bookingRequests.checkIn, to.data), gt(bookingRequests.checkOut, from.data)));

    return Response.json({ requestId, data: { from: from.data, to: to.data, ranges: [
      ...confirmed.map((range) => ({ ...range, status: "booked" as const })),
      ...enquiries.map((range) => ({ ...range, status: "pending" as const })),
    ] } }, { headers: noStoreHeaders });
  } catch {
    return Response.json({ requestId, error: { code: "SCHEDULE_UNAVAILABLE", message: "Availability could not be checked right now." } }, { status: 503, headers: noStoreHeaders });
  } finally {
    await database.close();
  }
}
