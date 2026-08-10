"use server";

import { createDatabase, auditLog, bookingRequests, roomTypes, rooms } from "@casa-marga/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/server/admin-auth";
import { parseDatabaseEnvironment } from "@/lib/server/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDepositToken, hashDepositToken } from "@/lib/server/deposit-token";

export type DepositActionState = { status: "idle" | "success" | "error"; message?: string; link?: string };

const roomTypeSchema = z.object({
  id: z.string().uuid(),
  rate: z.coerce.number().int().min(0).max(1_000_000),
  status: z.enum(["draft", "published", "archived"]),
});

const roomSchema = z.object({
  roomNumber: z.string().trim().min(1).max(30),
  roomTypeId: z.string().uuid(),
  floor: z.string().trim().max(50).optional(),
  status: z.enum(["available", "maintenance", "out_of_service"]),
});

function databaseUrl() {
  const configuration = parseDatabaseEnvironment();
  if (!configuration.success) throw new Error("Database configuration is unavailable.");
  return configuration.data.DATABASE_URL;
}

export async function signIn(_state: { error?: string } | undefined, formData: FormData) {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse({
    email: formData.get("email"), password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "The email or password is incorrect." };
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function updateRoomType(formData: FormData) {
  const staff = await requireStaff(["manager", "admin"]);
  const parsed = roomTypeSchema.safeParse({ id: formData.get("id"), rate: formData.get("rate"), status: formData.get("status") });
  if (!parsed.success) redirect("/admin?error=invalid-room-template#room-templates");
  const database = createDatabase(databaseUrl());
  const requestId = crypto.randomUUID();
  try {
    await database.db.transaction(async (tx) => {
      await tx.update(roomTypes).set({ baseNightlyRateMinor: parsed.data.rate * 100, status: parsed.data.status, updatedAt: new Date() }).where(eq(roomTypes.id, parsed.data.id));
      await tx.insert(auditLog).values({ actorId: staff.id, actorType: "staff", action: "room_type.updated", entityType: "room_type", entityId: parsed.data.id, requestId, redactedMetadata: { status: parsed.data.status } });
    });
  } finally { await database.close(); }
  revalidatePath("/admin"); revalidatePath("/rooms");
  redirect("/admin?saved=room-template#room-templates");
}

export async function addPhysicalRoom(formData: FormData) {
  const staff = await requireStaff(["manager", "admin"]);
  const parsed = roomSchema.safeParse({ roomNumber: formData.get("roomNumber"), roomTypeId: formData.get("roomTypeId"), floor: formData.get("floor") || undefined, status: formData.get("status") });
  if (!parsed.success) redirect("/admin?error=invalid-room#physical-rooms");
  const database = createDatabase(databaseUrl());
  const id = crypto.randomUUID();
  try {
    await database.db.transaction(async (tx) => {
      await tx.insert(rooms).values({ id, ...parsed.data, floor: parsed.data.floor || null });
      await tx.insert(auditLog).values({ actorId: staff.id, actorType: "staff", action: "room.created", entityType: "room", entityId: id, requestId: crypto.randomUUID(), redactedMetadata: { roomNumber: parsed.data.roomNumber } });
    });
  } finally { await database.close(); }
  revalidatePath("/admin"); revalidatePath("/rooms");
  redirect("/admin?saved=room#physical-rooms");
}

export async function updateRoomStatus(formData: FormData) {
  const staff = await requireStaff(["manager", "admin"]);
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["available", "maintenance", "out_of_service"]) }).safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) redirect("/admin?error=invalid-room#physical-rooms");
  const database = createDatabase(databaseUrl());
  try {
    await database.db.transaction(async (tx) => {
      await tx.update(rooms).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(rooms.id, parsed.data.id));
      await tx.insert(auditLog).values({ actorId: staff.id, actorType: "staff", action: "room.status_updated", entityType: "room", entityId: parsed.data.id, requestId: crypto.randomUUID(), redactedMetadata: { status: parsed.data.status } });
    });
  } finally { await database.close(); }
  revalidatePath("/admin"); revalidatePath("/rooms");
}

export async function startDepositRequest(_state: DepositActionState, formData: FormData): Promise<DepositActionState> {
  const staff = await requireStaff(["manager", "admin"]);
  const parsed = z.string().uuid().safeParse(formData.get("bookingId"));
  if (!parsed.success) return { status: "error", message: "Invalid booking request." };
  const token = createDepositToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const database = createDatabase(databaseUrl());
  try {
    const updated = await database.db.transaction(async (tx) => {
      const rows = await tx.update(bookingRequests).set({ status: "contacted", depositStatus: "awaiting_payment", depositAmountMinor: 100000, depositTokenHash: hashDepositToken(token), depositTokenExpiresAt: expiresAt, depositSenderName: null, depositReference: null, depositSubmittedAt: null, depositVerifiedAt: null, depositRefundReference: null, depositRefundedAt: null, updatedAt: new Date() }).where(and(eq(bookingRequests.id, parsed.data), eq(bookingRequests.source, "snowaz_guest_web"))).returning({ id: bookingRequests.id });
      if (!rows.length) return false;
      await tx.insert(auditLog).values({ actorId: staff.id, actorType: "staff", action: "booking.deposit_requested", entityType: "booking_request", entityId: parsed.data, requestId: crypto.randomUUID(), redactedMetadata: { amountMinor: 100000, expiresAt: expiresAt.toISOString() } });
      return true;
    });
    if (!updated) return { status: "error", message: "Booking request was not found." };
  } finally { await database.close(); }
  revalidatePath("/admin");
  return { status: "success", link: `/deposit/${token}` };
}

export async function verifyDeposit(_state: DepositActionState, formData: FormData): Promise<DepositActionState> {
  const staff = await requireStaff(["manager", "admin"]);
  const parsed = z.string().uuid().safeParse(formData.get("bookingId"));
  if (!parsed.success) return { status: "error", message: "Invalid booking request." };
  const database = createDatabase(databaseUrl());
  try {
    const updated = await database.db.transaction(async (tx) => {
      const rows = await tx.update(bookingRequests).set({ status: "confirmed", depositStatus: "verified", depositVerifiedAt: new Date(), depositTokenExpiresAt: null, updatedAt: new Date() }).where(and(eq(bookingRequests.id, parsed.data), eq(bookingRequests.depositStatus, "submitted"))).returning({ id: bookingRequests.id });
      if (!rows.length) return false;
      await tx.insert(auditLog).values({ actorId: staff.id, actorType: "staff", action: "booking.deposit_verified", entityType: "booking_request", entityId: parsed.data, requestId: crypto.randomUUID(), redactedMetadata: { amountMinor: 100000 } });
      return true;
    });
    if (!updated) return { status: "error", message: "A submitted deposit is required before verification." };
  } finally { await database.close(); }
  revalidatePath("/admin"); revalidatePath("/");
  return { status: "success", message: "Deposit verified and booking confirmed." };
}

export async function markDepositRefunded(_state: DepositActionState, formData: FormData): Promise<DepositActionState> {
  const staff = await requireStaff(["manager", "admin"]);
  const parsed = z.object({ bookingId: z.string().uuid(), refundReference: z.string().trim().min(6).max(80) }).safeParse({ bookingId: formData.get("bookingId"), refundReference: formData.get("refundReference") });
  if (!parsed.success) return { status: "error", message: "Enter a valid refund reference." };
  const database = createDatabase(databaseUrl());
  try {
    const updated = await database.db.transaction(async (tx) => {
      const rows = await tx.update(bookingRequests).set({ depositStatus: "refunded", depositRefundReference: parsed.data.refundReference, depositRefundedAt: new Date(), updatedAt: new Date() }).where(and(eq(bookingRequests.id, parsed.data.bookingId), eq(bookingRequests.depositStatus, "verified"))).returning({ id: bookingRequests.id });
      if (!rows.length) return false;
      await tx.insert(auditLog).values({ actorId: staff.id, actorType: "staff", action: "booking.deposit_refunded", entityType: "booking_request", entityId: parsed.data.bookingId, requestId: crypto.randomUUID(), redactedMetadata: { amountMinor: 100000 } });
      return true;
    });
    if (!updated) return { status: "error", message: "Only verified deposits can be marked refunded." };
  } finally { await database.close(); }
  revalidatePath("/admin");
  return { status: "success", message: "Refund recorded." };
}
