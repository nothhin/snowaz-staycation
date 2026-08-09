"use server";

import { redirect } from "next/navigation";
import { bookingRequests, createDatabase } from "@casa-marga/db";
import { bookingEnquirySchema } from "@casa-marga/shared/booking";
import { parseDatabaseEnvironment } from "@/lib/server/env";

export async function submitBookingRequest(formData: FormData) {
  const parsed = bookingEnquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.website) redirect("/book?error=invalid");
  const config = parseDatabaseEnvironment();
  if (!config.success) redirect("/book?error=unavailable");

  const database = createDatabase(config.data.DATABASE_URL);
  try {
    await database.db.insert(bookingRequests).values({
      idempotencyKey: parsed.data.idempotencyKey,
      roomTypeId: parsed.data.roomTypeId || null,
      fullName: parsed.data.fullName,
      normalizedEmail: parsed.data.email,
      phone: parsed.data.phone,
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
      guestCount: parsed.data.guests,
      specialRequests: parsed.data.specialRequests || null,
      consentVersion: "booking-request-v1",
    }).onConflictDoNothing({ target: bookingRequests.idempotencyKey });
  } catch (error) {
    console.error("[booking-request] database insert failed", { error: error instanceof Error ? error.name : "unknown" });
    redirect("/book?error=unavailable");
  } finally {
    await database.close();
  }

  const notificationEmail = process.env.BOOKING_NOTIFICATION_EMAIL;
  if (notificationEmail) {
    try {
      const notificationResponse = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(notificationEmail)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ _subject: `New SnowAZ booking request - ${parsed.data.fullName}`, name: parsed.data.fullName, email: parsed.data.email, phone: parsed.data.phone, check_in: parsed.data.checkIn, check_out: parsed.data.checkOut, guests: parsed.data.guests, special_requests: parsed.data.specialRequests || "None" }),
      });
      if (!notificationResponse.ok) console.warn("[booking-request] FormSubmit rejected the notification", { status: notificationResponse.status });
    } catch { console.warn("[booking-request] email notification failed; request remains saved in admin"); }
  }
  redirect("/book?submitted=1");
}
