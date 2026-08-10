import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";

const requestSchema = z.object({ reference:z.string().trim().regex(/^SNOWAZ-[A-F0-9]{8}$/i), phone:z.string().trim().min(7).max(30) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error:{ message:"Invalid booking lookup." } }, { status:400, headers:{ "Cache-Control":"no-store" } });
  const supabase = createPublicSupabaseClient();
  if (!supabase) return NextResponse.json({ error:{ message:"Booking lookup is unavailable." } }, { status:503, headers:{ "Cache-Control":"no-store" } });
  const { data, error } = await supabase.rpc("lookup_snowaz_booking_status", { booking_reference:parsed.data.reference, guest_phone:parsed.data.phone });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return NextResponse.json({ error:{ message:"Booking not found." } }, { status:404, headers:{ "Cache-Control":"no-store" } });
  return NextResponse.json({ data:{ checkIn:row.check_in, checkOut:row.check_out, guests:row.guest_count, status:row.booking_status, depositStatus:row.deposit_status, depositExpiresAt:row.deposit_expires_at } }, { headers:{ "Cache-Control":"no-store, max-age=0" } });
}
