export const priceKeys = [
  "bedroom_1_nightly_rate", "bedroom_2_nightly_rate", "both_bedrooms_nightly_rate",
  "additional_guest_nightly_rate", "car_parking_nightly_rate", "motorcycle_parking_nightly_rate",
  "early_checkin_hourly_rate", "late_checkout_hourly_rate", "refundable_security_deposit",
  "no_smoking_penalty",
] as const;

export type PriceKey = (typeof priceKeys)[number];
export type SnowazPrices = Record<PriceKey, number>;

export function parseSnowazPrices(value: unknown): SnowazPrices {
  if (!value || typeof value !== "object") throw new Error("Pricing is unavailable.");
  const source = value as Record<string, unknown>;
  const prices = {} as SnowazPrices;
  for (const key of priceKeys) {
    const amount = Number(source[key]);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100_000_000)
      throw new Error(`Invalid price: ${key}`);
    prices[key] = amount;
  }
  return prices;
}

export function formatPhpMinor(amountMinor: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(amountMinor / 100);
}
