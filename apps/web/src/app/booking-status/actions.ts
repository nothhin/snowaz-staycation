"use server";

import { z } from "zod";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";

export type BookingLookupState = { status:"idle"|"found"|"error"; message?:string; booking?:{ checkIn:string; checkOut:string; guests:number; status:string; stayStatus:string; depositStatus:string; depositExpiresAt:string|null; bedroomChoice:string; totalMinor:number; paidMinor:number; remainingMinor:number } };
export async function lookupBooking(_previous: BookingLookupState, formData: FormData): Promise<BookingLookupState> {
  const parsed = z.object({ reference:z.string().trim().regex(/^SNOWAZ-[A-F0-9]{8}$/i), phone:z.string().trim().min(7).max(30) }).safeParse({ reference:formData.get("reference"), phone:formData.get("phone") });
  if (!parsed.success) return { status:"error", message:"Enter a valid SnowAZ reference and the contact number used during booking." };
  const supabase = createPublicSupabaseClient();
  if (!supabase) return { status:"error", message:"Booking lookup is temporarily unavailable." };
  const { data, error } = await supabase.rpc("lookup_snowaz_booking_status", { booking_reference:parsed.data.reference, guest_phone:parsed.data.phone });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return { status:"error", message:"No matching booking was found. Check the reference and contact number." };
  return { status:"found", booking:{ checkIn:row.check_in as string, checkOut:row.check_out as string, guests:row.guest_count as number, status:row.booking_status as string, stayStatus:row.stay_status as string, depositStatus:row.deposit_status as string, depositExpiresAt:row.deposit_expires_at as string|null, bedroomChoice:row.bedroom_choice as string, totalMinor:Number(row.total_minor), paidMinor:Number(row.paid_minor), remainingMinor:Number(row.remaining_minor) } };
}
