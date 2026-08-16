"use client";

import { useState } from "react";
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
  const [parkingType, setParkingType] = useState<"none" | "car" | "motorcycle">(
    "none",
  );
  const bedroomChoice =
    guests <= 2
      ? ("bedroom_1" as const)
      : guests <= 4
        ? ("bedroom_2" as const)
        : ("both_bedrooms" as const);

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
        <span>Number of guests (maximum 8)</span>
        <select
          name="guests"
          value={guests}
          onChange={(event) => setGuests(Number(event.target.value))}
          required
        >
          {Array.from({ length: 8 }, (_, index) => index + 1).map(
            (guestCount) => (
              <option key={guestCount} value={guestCount}>
                {guestCount} guest{guestCount === 1 ? "" : "s"}
              </option>
            ),
          )}
        </select>
        <small>
          1BR for up to 2 guests: ₱1,800/night. 2BR for up to 4 guests:
          ₱2,300/night. Additional guests: ₱300 per guest/night.
        </small>
      </label>
      <input type="hidden" name="bedroomChoice" value={bedroomChoice} />
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
        <select value={bedroomChoice} disabled>
          <option value={bedroomChoice}>
            {bedroomChoice === "bedroom_1"
              ? "Bedroom 1 — standard single bunk bed"
              : bedroomChoice === "bedroom_2"
                ? "Bedroom 2 — Twin-over-double bunk bed"
                : "Both bedrooms"}
          </option>
        </select>
        <small>
          Assigned automatically: 1–2 guests use Bedroom 1, 3–4 use Bedroom 2,
          and 5–8 use both bedrooms.
        </small>
      </label>
      <BookingPriceReceipt
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        bedroomChoice={bedroomChoice}
        parkingType={parkingType}
      />
    </>
  );
}
