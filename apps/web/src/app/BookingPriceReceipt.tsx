"use client";

import { calculateSnowazBookingReceipt } from "@casa-marga/shared/booking";
import { formatPhpMinor } from "@casa-marga/shared/pricing";
import { usePricing } from "./PricingProvider";

const php = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

type BookingPriceReceiptProps = {
  checkIn: string;
  checkOut: string;
  guests: number;
  bedroomChoice: "bedroom_1" | "bedroom_2" | "both_bedrooms";
  parkingType?: "none" | "car" | "motorcycle";
  excessCheckoutHours?: number;
  snapshot?: {
    stayNights: number; baseNightlyRateMinor: number; additionalGuestCount: number;
    additionalGuestChargeMinor: number; parkingNightlyRateMinor: number;
    parkingChargeMinor: number; excessCheckoutChargeMinor: number;
    totalMinor: number; depositAmountMinor: number;
  };
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
  excessCheckoutHours = 0,
  snapshot,
}: BookingPriceReceiptProps) {
  const { prices } = usePricing();
  let receipt: ReturnType<typeof calculateSnowazBookingReceipt> | null = null;
  try {
    receipt = calculateSnowazBookingReceipt(
      checkIn,
      checkOut,
      guests,
      bedroomChoice,
      parkingType,
      excessCheckoutHours,
      prices,
    );
    if (snapshot) receipt = {
      ...receipt, nights: snapshot.stayNights, baseNightlyRateMinor: snapshot.baseNightlyRateMinor,
      additionalGuests: snapshot.additionalGuestCount,
      additionalGuestChargeMinor: snapshot.additionalGuestChargeMinor,
      additionalGuestNightlyRateMinor: snapshot.additionalGuestCount && snapshot.stayNights
        ? snapshot.additionalGuestChargeMinor / (snapshot.additionalGuestCount * snapshot.stayNights) : 0,
      parkingNightlyRateMinor: snapshot.parkingNightlyRateMinor,
      parkingChargeMinor: snapshot.parkingChargeMinor,
      excessCheckoutChargeMinor: snapshot.excessCheckoutChargeMinor,
      lateCheckoutHourlyRateMinor: excessCheckoutHours ? snapshot.excessCheckoutChargeMinor / excessCheckoutHours : 0,
      totalMinor: snapshot.totalMinor, securityDepositMinor: snapshot.depositAmountMinor,
      remainingBalanceMinor: snapshot.totalMinor,
    };
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
        <span>{snapshot ? "Agreed amount" : "Estimate"}</span>
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
            {bedroomLabels[bedroomChoice]}
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
                {receipt.additionalGuests} pax × {formatPhpMinor(receipt.additionalGuestNightlyRateMinor)} × {receipt.nights} night
                {receipt.nights === 1 ? "" : "s"}
              </small>
            </dt>
            <dd>+{php.format(receipt.additionalGuestChargeMinor / 100)}</dd>
          </div>
        ) : null}
        {receipt.excessCheckoutChargeMinor > 0 ? (
          <div className="booking-receipt-additional">
            <dt>Excess checkout time<br /><small>{receipt.excessCheckoutHours} hour{receipt.excessCheckoutHours === 1 ? "" : "s"} × {formatPhpMinor(receipt.lateCheckoutHourlyRateMinor)}</small></dt>
            <dd>+{php.format(receipt.excessCheckoutChargeMinor / 100)}</dd>
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
          <dt>Refundable security deposit</dt>
          <dd>{php.format(receipt.securityDepositMinor / 100)}</dd>
        </div>
        <div>
          <dt>Remaining balance</dt>
          <dd>{php.format(receipt.remainingBalanceMinor / 100)}</dd>
        </div>
      </dl>
      <p>
        The {formatPhpMinor(receipt.securityDepositMinor)} security deposit is separate from the accommodation payment,
        verified manually, and refundable after checkout subject to the house
        rules and property inspection.
      </p>
    </aside>
  );
}
