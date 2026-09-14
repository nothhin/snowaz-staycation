"use client";

import { useState } from "react";
import { calculateSnowazBookingReceipt, validBedroomChoices } from "@casa-marga/shared/booking";
import { formatPhpMinor } from "@casa-marga/shared/pricing";
import { usePricing } from "../PricingProvider";
import BookingPriceReceipt from "../BookingPriceReceipt";
import styles from "./book.module.css";

type BookingPriceFieldsProps = {
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
};

export default function BookingPriceFields({
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = "2",
}: BookingPriceFieldsProps) {
  const { prices, version } = usePricing();
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(() => Number(initialGuests) || 2);
  const [bedroomChoice, setBedroomChoice] = useState<
    "bedroom_1" | "bedroom_2" | "both_bedrooms"
  >("bedroom_1");
  const [parkingType, setParkingType] = useState<"none" | "car" | "motorcycle">(
    "none",
  );
  const [excessCheckoutHours, setExcessCheckoutHours] = useState(0);
  let quotedTotalMinor = 0;
  try { quotedTotalMinor = calculateSnowazBookingReceipt(checkIn, checkOut, guests, bedroomChoice, parkingType, excessCheckoutHours, prices).totalMinor; } catch { /* Dates may still be incomplete. */ }
  const availableBedrooms = validBedroomChoices(guests);
  const chooseGuests = (value: number) => {
    setGuests(value);
    if (!(validBedroomChoices(value) as readonly string[]).includes(bedroomChoice)) {
      setBedroomChoice(validBedroomChoices(value)[0]);
    }
  };

  return (
    <>
      <input type="hidden" name="priceVersion" value={version} />
      <input type="hidden" name="quotedTotalMinor" value={quotedTotalMinor} />
      <div className={styles.grid}>
        <label>
          <span>Check-in</span>
          <input
            name="checkIn"
            type="date"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Check-out</span>
          <input
            name="checkOut"
            type="date"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            required
          />
        </label>
      </div>
      <label>
        <span>Excess checkout time (optional)</span>
        <select name="excessCheckoutHours" value={excessCheckoutHours} onChange={(event) => setExcessCheckoutHours(Number(event.target.value))}>
          {[0, 1, 2, 3].map((hours) => <option key={hours} value={hours}>{hours === 0 ? "No excess time" : `${hours} hour${hours === 1 ? "" : "s"} — ${formatPhpMinor(hours * prices.late_checkout_hourly_rate)}`}</option>)}
        </select>
        <small>Check-out is 11:00 AM. More than 3 hours may be charged as half-day or an additional night, subject to availability.</small>
      </label>
      <label>
        <span>Number of guests (maximum 6)</span>
        <select
          name="guests"
          value={guests}
          onChange={(event) => chooseGuests(Number(event.target.value))}
          required
        >
          {Array.from({ length: 6 }, (_, index) => index + 1).map(
            (guestCount) => (
              <option key={guestCount} value={guestCount}>
                {guestCount} guest{guestCount === 1 ? "" : "s"}
              </option>
            ),
          )}
        </select>
        <small>
          Bedroom 1 starts at {formatPhpMinor(prices.bedroom_1_nightly_rate)}/night.
          Bedroom 2 is {formatPhpMinor(prices.bedroom_2_nightly_rate)} for 2 guests or {formatPhpMinor(prices.bedroom_2_nightly_rate + prices.additional_guest_nightly_rate)} for 3. Both bedrooms accommodate 4–5
          guests for {formatPhpMinor(prices.both_bedrooms_nightly_rate)}, with the sixth guest at +{formatPhpMinor(prices.additional_guest_nightly_rate)}.
        </small>
      </label>
      <label>
        <span>Overnight parking (optional)</span>
        <select
          name="parkingType"
          value={parkingType}
          onChange={(event) =>
            setParkingType(event.target.value as typeof parkingType)
          }
        >
          <option value="none">No parking</option>
          <option value="car">Car — {formatPhpMinor(prices.car_parking_nightly_rate)}/night</option>
          <option value="motorcycle">Motorcycle — {formatPhpMinor(prices.motorcycle_parking_nightly_rate)}/night</option>
        </select>
      </label>
      <label>
        <span>Bedroom selection</span>
        <select
          name="bedroomChoice"
          value={bedroomChoice}
          onChange={(event) =>
            setBedroomChoice(event.target.value as typeof bedroomChoice)
          }
        >
          {availableBedrooms.map((choice) => (
            <option key={choice} value={choice}>
              {choice === "bedroom_1"
                ? "Bedroom 1 — standard single bunk bed"
                : choice === "bedroom_2"
                  ? "Bedroom 2 — Twin-over-double bunk bed"
                  : "Both bedrooms"}
            </option>
          ))}
        </select>
        <small>
          Choose your preferred available bedroom setup. Two guests may select
          either Bedroom 1 or Bedroom 2.
        </small>
      </label>
      <BookingPriceReceipt
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        bedroomChoice={bedroomChoice}
        parkingType={parkingType}
        excessCheckoutHours={excessCheckoutHours}
      />
    </>
  );
}
