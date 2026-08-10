"use server";

import { redirect } from "next/navigation";
import { bookingEnquirySchema } from "@casa-marga/shared/booking";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";

export async function submitBookingRequest(formData: FormData) {
  const parsed = bookingEnquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.website) redirect("/book?error=invalid");
  const supabase = createPublicSupabaseClient();
  if (!supabase) redirect("/book?error=unavailable");

  try {
    const { error } = await supabase.from("booking_requests").insert({
      idempotency_key: parsed.data.idempotencyKey,
      room_type_id: null,
      full_name: parsed.data.fullName,
      normalized_email: parsed.data.email,
      phone: parsed.data.phone,
      check_in: parsed.data.checkIn,
      check_out: parsed.data.checkOut,
      guest_count: parsed.data.guests,
      special_requests: parsed.data.specialRequests || null,
      source: "snowaz_guest_web",
      consent_version: "booking-request-v1",
    });
    if (error && error.code !== "23505") throw error;
  } catch (error) {
    console.error("[booking-request] database insert failed", { error: error instanceof Error ? error.name : "unknown" });
    redirect("/book?error=unavailable");
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
