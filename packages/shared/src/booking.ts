import { z } from "zod";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 86_400_000;
export const bedroomChoiceSchema = z.enum([
  "bedroom_1",
  "bedroom_2",
  "both_bedrooms",
]);
export const parkingTypeSchema = z.enum(["none", "car", "motorcycle"]);

function isCalendarDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export const stayDateSchema = z
  .string()
  .refine(isCalendarDate, "Choose a valid calendar date.");

export const staySchema = z
  .object({
    checkIn: stayDateSchema,
    checkOut: stayDateSchema,
  })
  .refine(({ checkIn, checkOut }) => checkOut > checkIn, {
    message: "Check-out must be after check-in.",
    path: ["checkOut"],
  });

export const availabilitySearchSchema = staySchema.extend({
  guests: z.coerce.number().int().min(1).max(8),
});

export const guestDetailsSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
});

export const reservationRequestSchema = staySchema.extend({
  roomTypeId: z.string().uuid(),
  guests: z.coerce.number().int().min(1).max(8),
  guest: guestDetailsSchema,
  specialRequests: z.string().trim().max(1_000).optional().or(z.literal("")),
  consent: z.literal(true, {
    error: "Accept the booking terms and privacy notice.",
  }),
  consentVersion: z.string().trim().min(1).max(50),
  idempotencyKey: z.string().uuid(),
});

export const bookingEnquirySchema = staySchema
  .extend({
    roomTypeId: z.string().uuid().optional().or(z.literal("")),
    guests: z.coerce.number().int().min(1).max(8),
    bedroomChoice: bedroomChoiceSchema,
    parkingType: parkingTypeSchema.default("none"),
    fullName: z.string().trim().min(2).max(120),
    email: z.union([
      z.literal(""),
      z.string().trim().toLowerCase().email().max(254),
    ]),
    phone: z.string().trim().min(7).max(30),
    preferredContact: z.literal("phone"),
    specialRequests: z.string().trim().max(1_000).optional().or(z.literal("")),
    consent: z.literal("on", {
      error: "Accept the privacy notice before submitting.",
    }),
    idempotencyKey: z.string().uuid(),
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .refine(
    ({ guests, bedroomChoice }) =>
      guests < 1 ||
      guests > 8 ||
      bedroomChoice === automaticBedroomChoice(guests),
    {
      message: "The bedroom is assigned automatically from the guest count.",
      path: ["bedroomChoice"],
    },
  );

export function stayNights(checkIn: string, checkOut: string) {
  const parsed = staySchema.parse({ checkIn, checkOut });
  const start = Date.parse(`${parsed.checkIn}T00:00:00.000Z`);
  const end = Date.parse(`${parsed.checkOut}T00:00:00.000Z`);
  return (end - start) / MILLISECONDS_PER_DAY;
}

export function calculateStayTotalMinor(
  nightlyRateMinor: number,
  nights: number,
) {
  if (!Number.isSafeInteger(nightlyRateMinor) || nightlyRateMinor < 0) {
    throw new RangeError(
      "Nightly rate must be a non-negative integer in minor units.",
    );
  }
  if (!Number.isSafeInteger(nights) || nights < 1) {
    throw new RangeError(
      "Stay length must be a positive whole number of nights.",
    );
  }

  const total = nightlyRateMinor * nights;
  if (!Number.isSafeInteger(total))
    throw new RangeError("Stay total exceeds the safe integer range.");
  return total;
}

export function calculateSnowazNightlyRateMinor(guests: number) {
  if (!Number.isSafeInteger(guests) || guests < 1 || guests > 8) {
    throw new RangeError("Guest count must be a whole number from 1 to 8.");
  }

  if (guests <= 2) return 180_000;
  return 230_000 + Math.max(0, guests - 4) * 30_000;
}

export function automaticBedroomChoice(guests: number) {
  if (!Number.isSafeInteger(guests) || guests < 1 || guests > 8)
    throw new RangeError("Guest count must be a whole number from 1 to 8.");
  return guests <= 2
    ? ("bedroom_1" as const)
    : guests <= 4
      ? ("bedroom_2" as const)
      : ("both_bedrooms" as const);
}

export function calculateSnowazBookingReceipt(
  checkIn: string,
  checkOut: string,
  guests: number,
  parkingType: "none" | "car" | "motorcycle" = "none",
) {
  const nights = stayNights(checkIn, checkOut);
  const nightlyRateMinor = calculateSnowazNightlyRateMinor(guests);
  const baseNightlyRateMinor = guests <= 2 ? 180_000 : 230_000;
  const parkingNightlyRateMinor =
    parkingType === "car" ? 35_000 : parkingType === "motorcycle" ? 15_000 : 0;
  const parkingChargeMinor = parkingNightlyRateMinor * nights;
  const totalMinor =
    calculateStayTotalMinor(nightlyRateMinor, nights) + parkingChargeMinor;
  const downPaymentMinor = Math.min(100_000, totalMinor);
  const additionalGuests = Math.max(0, guests - 4);
  const additionalGuestChargeMinor = additionalGuests * 30_000 * nights;

  return {
    nights,
    guests,
    bedrooms: guests <= 2 ? 1 : 2,
    baseNightlyRateMinor,
    nightlyRateMinor,
    additionalGuests,
    additionalGuestChargeMinor,
    parkingType,
    parkingNightlyRateMinor,
    parkingChargeMinor,
    totalMinor,
    downPaymentMinor,
    remainingBalanceMinor: totalMinor - downPaymentMinor,
  } as const;
}

export function normalizeGuestEmail(email: string) {
  return guestDetailsSchema.shape.email.parse(email);
}

export type AvailabilitySearch = z.infer<typeof availabilitySearchSchema>;
export type ReservationRequest = z.infer<typeof reservationRequestSchema>;
export type BookingEnquiry = z.infer<typeof bookingEnquirySchema>;
