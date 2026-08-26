"use client";

import { useActionState, useEffect, useState } from "react";
import BookingPriceReceipt from "../../BookingPriceReceipt";
import { showError, showSuccess } from "@/lib/sweetalert";
import { updatePendingGuestCount, type GuestCountState } from "./actions";
import styles from "./deposit.module.css";

const initialState: GuestCountState = { status: "idle", message: "" };

export function GuestCountEditor({
  token,
  checkIn,
  checkOut,
  initialGuests,
  initialBedroom,
  initialParking,
}: {
  token: string;
  checkIn: string;
  checkOut: string;
  initialGuests: number;
  initialBedroom: string;
  initialParking: "none" | "car" | "motorcycle";
}) {
  const assignedBedroom = (value: number) =>
    value <= 2 ? "bedroom_1" : value <= 4 ? "bedroom_2" : "both_bedrooms";
  const [guests, setGuests] = useState(initialGuests);
  const [bedroom, setBedroom] = useState(initialBedroom);
  const [parkingType, setParkingType] = useState(initialParking);
  const [state, action, pending] = useActionState(
    updatePendingGuestCount,
    initialState,
  );
  useEffect(() => {
    if (state.status === "success") void showSuccess(state.message);
    if (state.status === "error") void showError(state.message);
  }, [state]);
  const chooseGuests = (value: number) => {
    setGuests(value);
    setBedroom(assignedBedroom(value));
  };
  return (
    <section className={styles.guestEditor}>
      <div>
        <p className={styles.eyebrow}>Review before paying</p>
        <h2>Need to correct the number of guests?</h2>
        <p>Update it now and your total will recalculate automatically.</p>
      </div>
      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <label>
          <span>Overnight parking</span>
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
          <span>Number of guests</span>
          <select
            name="guests"
            value={guests}
            onChange={(event) => chooseGuests(Number(event.target.value))}
          >
            {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count} guest{count === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Assigned bedroom</span>
          <select value={bedroom} disabled>
            <option value={bedroom}>
              {bedroom === "bedroom_1"
                ? "Bedroom 1"
                : bedroom === "bedroom_2"
                  ? "Bedroom 2"
                  : "Both bedrooms"}
            </option>
          </select>
          <input type="hidden" name="bedroom" value={bedroom} />
        </label>
        <button disabled={pending}>
          {pending ? "Updating…" : "Update guests and total"}
        </button>
      </form>
      <BookingPriceReceipt
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        bedroomChoice={bedroom as "bedroom_1" | "bedroom_2" | "both_bedrooms"}
        parkingType={parkingType}
      />
      <small>
        Changes are allowed only before payment details or a receipt are
        submitted.
      </small>
    </section>
  );
}
