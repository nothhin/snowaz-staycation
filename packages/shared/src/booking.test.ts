import { describe, expect, it } from "vitest";
import {
  availabilitySearchSchema,
  calculateStayTotalMinor,
  normalizeGuestEmail,
  reservationRequestSchema,
  bookingEnquirySchema,
  stayNights,
} from "./booking";

describe("booking contracts", () => {
  it("rejects impossible calendar dates", () => {
    expect(availabilitySearchSchema.safeParse({ checkIn: "2026-02-30", checkOut: "2026-03-02", guests: 2 }).success).toBe(false);
  });

  it("allows leap day and back-to-back date boundaries", () => {
    expect(stayNights("2028-02-29", "2028-03-01")).toBe(1);
    expect(stayNights("2026-08-10", "2026-08-11")).toBe(1);
  });

  it("normalizes email without changing booking identity semantics", () => {
    expect(normalizeGuestEmail("  Guest@Example.COM ")).toBe("guest@example.com");
  });

  it("requires explicit consent and a retry-safe idempotency key", () => {
    const result = reservationRequestSchema.safeParse({
      roomTypeId: "aa9d92d3-38cc-43f1-a32a-0b2b21d05c90",
      checkIn: "2026-08-10",
      checkOut: "2026-08-12",
      guests: 2,
      guest: { fullName: "Guest Name", email: "guest@example.com" },
      consent: false,
      consentVersion: "2026-08-01",
      idempotencyKey: "d87c7965-11f9-4e93-8ff4-fb8a60a21321",
    });
    expect(result.success).toBe(false);
  });
});

describe("booking enquiries", () => {
  const request = { checkIn:"2026-09-01", checkOut:"2026-09-02", guests:"2", fullName:"Guest Name", email:"", phone:"09951234567", preferredContact:"messenger", specialRequests:"", consent:"on", idempotencyKey:"d87c7965-11f9-4e93-8ff4-fb8a60a21321", website:"" };
  it("allows optional email for Messenger, WhatsApp, or phone contact", () => expect(bookingEnquirySchema.safeParse(request).success).toBe(true));
  it("requires email when email is selected", () => expect(bookingEnquirySchema.safeParse({ ...request, preferredContact:"email" }).success).toBe(false));
});

describe("money calculations", () => {
  it("calculates totals only with integer minor units", () => {
    expect(calculateStayTotalMinor(250_000, 3)).toBe(750_000);
    expect(() => calculateStayTotalMinor(2_500.5, 2)).toThrow(RangeError);
    expect(() => calculateStayTotalMinor(2_500, 0)).toThrow(RangeError);
  });
});
