"use server";

import { and, eq, gt } from "drizzle-orm";
import { auditLog, bookingRequests, createDatabase } from "@casa-marga/db";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashDepositToken, isValidDepositToken } from "@/lib/server/deposit-token";
import { parseDatabaseEnvironment } from "@/lib/server/env";

export async function submitDepositReference(formData: FormData) {
  const parsed = z.object({ token: z.string().refine(isValidDepositToken), senderName: z.string().trim().min(2).max(120), reference: z.string().trim().min(6).max(80), confirmedAmount: z.literal("1000") }).safeParse({ token: formData.get("token"), senderName: formData.get("senderName"), reference: formData.get("reference"), confirmedAmount: formData.get("confirmedAmount") });
  if (!parsed.success) redirect(`/deposit/${String(formData.get("token") || "invalid")}?error=invalid`);
  const configuration = parseDatabaseEnvironment();
  if (!configuration.success) throw new Error("Database configuration is unavailable.");
  const database = createDatabase(configuration.data.DATABASE_URL);
  try {
    const updated = await database.db.transaction(async (tx) => {
      const rows = await tx.update(bookingRequests).set({ depositStatus: "submitted", depositSenderName: parsed.data.senderName, depositReference: parsed.data.reference, depositSubmittedAt: new Date(), updatedAt: new Date() }).where(and(eq(bookingRequests.depositTokenHash, hashDepositToken(parsed.data.token)), eq(bookingRequests.depositStatus, "awaiting_payment"), gt(bookingRequests.depositTokenExpiresAt, new Date()))).returning({ id: bookingRequests.id });
      if (!rows.length) return false;
      await tx.insert(auditLog).values({ actorType: "guest", action: "booking.deposit_reference_submitted", entityType: "booking_request", entityId: rows[0].id, requestId: crypto.randomUUID(), redactedMetadata: { amountMinor: 100000 } });
      return true;
    });
    if (!updated) redirect(`/deposit/${parsed.data.token}?error=expired`);
  } finally { await database.close(); }
  redirect(`/deposit/${parsed.data.token}?submitted=1`);
}
