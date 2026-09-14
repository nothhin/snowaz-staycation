import { z } from "zod";
import { type SnowazPrices } from "./pricing";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 86_400_000;
export const bedroomChoiceSchema = z.enum([
  "bedroom_1",
  "bedroom_2",
  "both_bedrooms",
]);
export const parkingTypeSchema = z.enum(["none", "car", "motorcycle"]);
export const excessCheckoutHoursSchema = z.coerce.number().int().min(0).max(3).default(0);

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
  guests: z.coerce.number().int().min(1).max(6),
});

export const guestDetailsSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
});

export const reservationRequestSchema = staySchema.extend({
  roomTypeId: z.string().uuid(),
  guests: z.coerce.number().int().min(1).max(6),
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
    guests: z.coerce.number().int().min(1).max(6),
    bedroomChoice: bedroomChoiceSchema,
    parkingType: parkingTypeSchema.default("none"),
    excessCheckoutHours: excessCheckoutHoursSchema,
    priceVersion: z.coerce.number().int().positive(),
    quotedTotalMinor: z.coerce.number().int().nonnegative(),
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
      guests > 6 ||
      isValidBedroomChoice(guests, bedroomChoice),
    {
      message: "Choose a bedroom setup that fits the number of guests.",
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

export function validBedroomChoices(guests: number) {
  if (!Number.isSafeInteger(guests) || guests < 1 || guests > 6) {
    throw new RangeError("Guest count must be a whole number from 1 to 6.");
  }
  if (guests === 1) return ["bedroom_1"] as const;
  if (guests === 2) return ["bedroom_1", "bedroom_2"] as const;
  if (guests === 3) return ["bedroom_2"] as const;
  return ["both_bedrooms"] as const;
}

export function isValidBedroomChoice(
  guests: number,
  bedroomChoice: z.infer<typeof bedroomChoiceSchema>,
) {
  return (validBedroomChoices(guests) as readonly string[]).includes(
    bedroomChoice,
  );
}

export function calculateSnowazNightlyRateMinor(
  guests: number,
  bedroomChoice: z.infer<typeof bedroomChoiceSchema>,
  prices: SnowazPrices,
) {
  if (!isValidBedroomChoice(guests, bedroomChoice)) {
    throw new RangeError("The bedroom setup does not fit the guest count.");
  }
  if (bedroomChoice === "bedroom_1") return prices.bedroom_1_nightly_rate;
  if (bedroomChoice === "bedroom_2") {
    return prices.bedroom_2_nightly_rate + Math.max(0, guests - 2) * prices.additional_guest_nightly_rate;
  }
  return prices.both_bedrooms_nightly_rate + Math.max(0, guests - 5) * prices.additional_guest_nightly_rate;
}

export function calculateSnowazBookingReceipt(
  checkIn: string,
  checkOut: string,
  guests: number,
  bedroomChoice: z.infer<typeof bedroomChoiceSchema>,
  parkingType: "none" | "car" | "motorcycle",
  excessCheckoutHours: number,
  prices: SnowazPrices,
) {
  if (!Number.isSafeInteger(excessCheckoutHours) || excessCheckoutHours < 0 || excessCheckoutHours > 3) {
    throw new RangeError("Excess checkout time must be between 0 and 3 hours.");
  }
  const nights = stayNights(checkIn, checkOut);
  const nightlyRateMinor = calculateSnowazNightlyRateMinor(
    guests,
    bedroomChoice,
    prices,
  );
  const baseNightlyRateMinor =
    prices[bedroomChoice === "both_bedrooms" ? "both_bedrooms_nightly_rate" : bedroomChoice === "bedroom_2" ? "bedroom_2_nightly_rate" : "bedroom_1_nightly_rate"];
  const parkingNightlyRateMinor =
    parkingType === "car" ? prices.car_parking_nightly_rate : parkingType === "motorcycle" ? prices.motorcycle_parking_nightly_rate : 0;
  const parkingChargeMinor = parkingNightlyRateMinor * nights;
  const excessCheckoutChargeMinor = excessCheckoutHours * prices.late_checkout_hourly_rate;
  const totalMinor =
    calculateStayTotalMinor(nightlyRateMinor, nights) + parkingChargeMinor + excessCheckoutChargeMinor;
  const securityDepositMinor = prices.refundable_security_deposit;
  const additionalGuests =
    bedroomChoice === "bedroom_2"
      ? Math.max(0, guests - 2)
      : bedroomChoice === "both_bedrooms"
        ? Math.max(0, guests - 5)
        : 0;
  const additionalGuestChargeMinor = additionalGuests * prices.additional_guest_nightly_rate * nights;

  return {
    nights,
    guests,
    bedrooms: bedroomChoice === "both_bedrooms" ? 2 : 1,
    baseNightlyRateMinor,
    nightlyRateMinor,
    additionalGuests,
    additionalGuestChargeMinor,
    additionalGuestNightlyRateMinor: prices.additional_guest_nightly_rate,
    lateCheckoutHourlyRateMinor: prices.late_checkout_hourly_rate,
    parkingType,
    parkingNightlyRateMinor,
    parkingChargeMinor,
    excessCheckoutHours,
    excessCheckoutChargeMinor,
    totalMinor,
    securityDepositMinor,
    remainingBalanceMinor: totalMinor,
  } as const;
}

export function normalizeGuestEmail(email: string) {
  return guestDetailsSchema.shape.email.parse(email);
}

export type AvailabilitySearch = z.infer<typeof availabilitySearchSchema>;
export type ReservationRequest = z.infer<typeof reservationRequestSchema>;
export type BookingEnquiry = z.infer<typeof bookingEnquirySchema>;
