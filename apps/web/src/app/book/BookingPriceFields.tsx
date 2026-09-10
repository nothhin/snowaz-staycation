"use client";

import { useState } from "react";
import { validBedroomChoices } from "@casa-marga/shared/booking";
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
  const availableBedrooms = validBedroomChoices(guests);
  const chooseGuests = (value: number) => {
    setGuests(value);
    if (!(validBedroomChoices(value) as readonly string[]).includes(bedroomChoice)) {
      setBedroomChoice(validBedroomChoices(value)[0]);
    }
  };

  return (
    <>
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
          <option value="0">No excess time</option><option value="1">1 hour — ₱200</option><option value="2">2 hours — ₱400</option><option value="3">3 hours — ₱600</option>
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
          Bedroom 1 or Bedroom 2 for 1–2 guests starts at ₱1,800/night.
          Bedroom 2 for 3 guests is ₱2,100. Both bedrooms accommodate 4–5
          guests for ₱2,300, with the sixth guest at +₱300.
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
          <option value="car">Car — ₱350/night</option>
          <option value="motorcycle">Motorcycle — ₱150/night</option>
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
