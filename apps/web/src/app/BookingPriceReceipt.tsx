"use client";

import { calculateSnowazBookingReceipt } from "@casa-marga/shared/booking";

const php = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

type BookingPriceReceiptProps = {
  checkIn: string;
  checkOut: string;
  guests: number;
  bedroomChoice?: "bedroom_1" | "bedroom_2" | "both_bedrooms";
  parkingType?: "none" | "car" | "motorcycle";
};

const bedroomLabels = {
  bedroom_1: "Bedroom 1",
  bedroom_2: "Bedroom 2",
  both_bedrooms: "Both bedrooms",
} as const;

export default function BookingPriceReceipt({
  checkIn,
  checkOut,
  guests,
  bedroomChoice,
  parkingType = "none",
}: BookingPriceReceiptProps) {
  let receipt: ReturnType<typeof calculateSnowazBookingReceipt> | null = null;
  try {
    receipt = calculateSnowazBookingReceipt(
      checkIn,
      checkOut,
      guests,
      parkingType,
    );
  } catch {
    // The form fields provide their own validation while the receipt waits for valid values.
  }

  if (!receipt)
    return (
      <aside
        className="booking-receipt booking-receipt-empty"
        aria-live="polite"
      >
        <strong>Digital booking receipt</strong>
        <p>
          Choose valid stay dates and a guest count to calculate your payment.
        </p>
      </aside>
    );

  return (
    <aside
      className="booking-receipt"
      aria-live="polite"
      aria-label="Calculated booking payment"
    >
      <header>
        <div>
          <small>SnowAZ Staycation</small>
          <strong>Digital booking receipt</strong>
        </div>
        <span>Estimate</span>
      </header>
      <dl>
        <div>
          <dt>Stay</dt>
          <dd>
            {receipt.nights} night{receipt.nights === 1 ? "" : "s"}
          </dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>{receipt.guests} pax</dd>
        </div>
        <div>
          <dt>Bedroom selection</dt>
          <dd>
            {bedroomChoice
              ? bedroomLabels[bedroomChoice]
              : `${receipt.bedrooms} bedroom${receipt.bedrooms === 1 ? "" : "s"}`}
          </dd>
        </div>
        <div>
          <dt>Base nightly rate</dt>
          <dd>{php.format(receipt.baseNightlyRateMinor / 100)}</dd>
        </div>
        {receipt.additionalGuests > 0 ? (
          <div className="booking-receipt-additional">
            <dt>
              Additional pax
              <br />
              <small>
                {receipt.additionalGuests} pax × ₱300 × {receipt.nights} night
                {receipt.nights === 1 ? "" : "s"}
              </small>
            </dt>
            <dd>+{php.format(receipt.additionalGuestChargeMinor / 100)}</dd>
          </div>
        ) : null}
        {receipt.parkingChargeMinor > 0 ? (
          <div className="booking-receipt-additional">
            <dt>
              {receipt.parkingType === "car" ? "Car" : "Motorcycle"} parking
              <br />
              <small>
                {php.format(receipt.parkingNightlyRateMinor / 100)} ×{" "}
                {receipt.nights} night{receipt.nights === 1 ? "" : "s"}
              </small>
            </dt>
            <dd>+{php.format(receipt.parkingChargeMinor / 100)}</dd>
          </div>
        ) : null}
        <div className="booking-receipt-total">
          <dt>Total accommodation</dt>
          <dd>{php.format(receipt.totalMinor / 100)}</dd>
        </div>
        <div className="booking-receipt-down">
          <dt>Required down payment</dt>
          <dd>{php.format(receipt.downPaymentMinor / 100)}</dd>
        </div>
        <div>
          <dt>Remaining balance</dt>
          <dd>{php.format(receipt.remainingBalanceMinor / 100)}</dd>
        </div>
      </dl>
      <p>
        The ₱1,000 down payment is deducted from the total accommodation payment
        and is verified manually.
      </p>
    </aside>
  );
}
