import { describe, expect, it } from "vitest";
import {
  availabilitySearchSchema,
  calculateSnowazNightlyRateMinor,
  calculateSnowazBookingReceipt,
  calculateStayTotalMinor,
  normalizeGuestEmail,
  reservationRequestSchema,
  bookingEnquirySchema,
  stayNights,
} from "./booking";

describe("booking contracts", () => {
  it("rejects impossible calendar dates", () => {
    expect(
      availabilitySearchSchema.safeParse({
        checkIn: "2026-02-30",
        checkOut: "2026-03-02",
        guests: 2,
      }).success,
    ).toBe(false);
  });

  it("allows leap day and back-to-back date boundaries", () => {
    expect(stayNights("2028-02-29", "2028-03-01")).toBe(1);
    expect(stayNights("2026-08-10", "2026-08-11")).toBe(1);
  });

  it("normalizes email without changing booking identity semantics", () => {
    expect(normalizeGuestEmail("  Guest@Example.COM ")).toBe(
      "guest@example.com",
    );
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
  const request = {
    checkIn: "2026-09-01",
    checkOut: "2026-09-02",
    guests: "2",
    bedroomChoice: "bedroom_1",
    fullName: "Guest Name",
    email: "",
    phone: "09951234567",
    preferredContact: "phone",
    specialRequests: "",
    consent: "on",
    idempotencyKey: "d87c7965-11f9-4e93-8ff4-fb8a60a21321",
    website: "",
  };
  it("allows an optional email when the required phone number is provided", () =>
    expect(bookingEnquirySchema.safeParse(request).success).toBe(true));
  it("automatically assigns Bedroom 1 for up to two guests", () => {
    expect(
      bookingEnquirySchema.safeParse({ ...request, bedroomChoice: "bedroom_1" })
        .success,
    ).toBe(true);
    expect(
      bookingEnquirySchema.safeParse({ ...request, bedroomChoice: "bedroom_2" })
        .success,
    ).toBe(false);
  });
  it("accepts up to eight guests when both bedrooms are selected", () =>
    expect(
      bookingEnquirySchema.safeParse({
        ...request,
        guests: "8",
        bedroomChoice: "both_bedrooms",
      }).success,
    ).toBe(true));
  it("automatically assigns Bedroom 2 for three or four guests", () =>
    expect(
      bookingEnquirySchema.safeParse({
        ...request,
        guests: "3",
        bedroomChoice: "bedroom_2",
      }).success,
    ).toBe(true));
  it("requires both bedrooms above four guests", () =>
    expect(
      bookingEnquirySchema.safeParse({
        ...request,
        guests: "5",
        bedroomChoice: "bedroom_2",
      }).success,
    ).toBe(false));
  it("rejects more than eight guests", () =>
    expect(
      bookingEnquirySchema.safeParse({ ...request, guests: "9" }).success,
    ).toBe(false));
  it("does not accept an alternate preferred contact method", () =>
    expect(
      bookingEnquirySchema.safeParse({ ...request, preferredContact: "email" })
        .success,
    ).toBe(false));
});

describe("money calculations", () => {
  it("prices one bedroom, two bedrooms, and additional guests", () => {
    expect(calculateSnowazNightlyRateMinor(2)).toBe(180_000);
    expect(calculateSnowazNightlyRateMinor(3)).toBe(230_000);
    expect(calculateSnowazNightlyRateMinor(4)).toBe(230_000);
    expect(calculateSnowazNightlyRateMinor(5)).toBe(260_000);
    expect(calculateSnowazNightlyRateMinor(8)).toBe(350_000);
    expect(() => calculateSnowazNightlyRateMinor(9)).toThrow(RangeError);
  });

  it("builds a receipt with the required down payment and remaining balance", () => {
    expect(
      calculateSnowazBookingReceipt("2026-09-01", "2026-09-04", 5),
    ).toEqual({
      nights: 3,
      guests: 5,
      bedrooms: 2,
      baseNightlyRateMinor: 230_000,
      nightlyRateMinor: 260_000,
      additionalGuests: 1,
      additionalGuestChargeMinor: 90_000,
      parkingType: "none",
      parkingNightlyRateMinor: 0,
      parkingChargeMinor: 0,
      totalMinor: 780_000,
      downPaymentMinor: 100_000,
      remainingBalanceMinor: 680_000,
    });
  });
  it("adds optional parking per night", () => {
    expect(calculateSnowazBookingReceipt("2026-09-01", "2026-09-03", 2, "car").parkingChargeMinor).toBe(70_000);
    expect(calculateSnowazBookingReceipt("2026-09-01", "2026-09-03", 2, "motorcycle").parkingChargeMinor).toBe(30_000);
  });
  it("calculates totals only with integer minor units", () => {
    expect(calculateStayTotalMinor(250_000, 3)).toBe(750_000);
    expect(() => calculateStayTotalMinor(2_500.5, 2)).toThrow(RangeError);
    expect(() => calculateStayTotalMinor(2_500, 0)).toThrow(RangeError);
  });
});
