"use client";

import { useActionState, useEffect, useState } from "react";
import { validBedroomChoices } from "@casa-marga/shared/booking";
import BookingPriceReceipt from "../../BookingPriceReceipt";
import { showError, showSuccess } from "@/lib/sweetalert";
import { updatePendingGuestCount, type GuestCountState } from "./actions";
import styles from "./deposit.module.css";
import { usePricing } from "../../PricingProvider";
import { formatPhpMinor } from "@casa-marga/shared/pricing";

const initialState: GuestCountState = { status: "idle", message: "" };

export function GuestCountEditor({
  token,
  checkIn,
  checkOut,
  initialGuests,
  initialBedroom,
  initialParking,
  initialExcessCheckoutHours,
  snapshot,
}: {
  token: string;
  checkIn: string;
  checkOut: string;
  initialGuests: number;
  initialBedroom: string;
  initialParking: "none" | "car" | "motorcycle";
  initialExcessCheckoutHours: number;
  snapshot: React.ComponentProps<typeof BookingPriceReceipt>["snapshot"];
}) {
  const { prices } = usePricing();
  const [guests, setGuests] = useState(initialGuests);
  const [bedroom, setBedroom] = useState<
    "bedroom_1" | "bedroom_2" | "both_bedrooms"
  >(
    initialBedroom === "bedroom_2" || initialBedroom === "both_bedrooms"
      ? initialBedroom
      : "bedroom_1",
  );
  const [parkingType, setParkingType] = useState(initialParking);
  const [excessCheckoutHours, setExcessCheckoutHours] = useState(initialExcessCheckoutHours);
  const [state, action, pending] = useActionState(
    updatePendingGuestCount,
    initialState,
  );
  useEffect(() => {
    if (state.status === "success") { void showSuccess(state.message); window.location.reload(); }
    if (state.status === "error") void showError(state.message);
  }, [state]);
  const chooseGuests = (value: number) => {
    setGuests(value);
    const choices = validBedroomChoices(value);
    if (!(choices as readonly string[]).includes(bedroom)) {
      setBedroom(choices[0]);
    }
  };
  const availableBedrooms =
    guests > 6 ? (["both_bedrooms"] as const) : validBedroomChoices(guests);
  const guestOptions = [1, 2, 3, 4, 5, 6];
  if (initialGuests > 6) guestOptions.push(initialGuests);
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
          <span>Excess checkout time (optional)</span>
          <select name="excessCheckoutHours" value={excessCheckoutHours} onChange={(event) => setExcessCheckoutHours(Number(event.target.value))}>
            <option value="0">No excess time</option>
            {[1,2,3].map(hours => <option key={hours} value={hours}>{hours} hour{hours>1?"s":""} — {formatPhpMinor(hours*prices.late_checkout_hourly_rate)}</option>)}
          </select>
          <small>Regular checkout is 11:00 AM. More than 3 hours may require a half-day or additional night, subject to availability.</small>
        </label>
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
            <option value="car">Car — {formatPhpMinor(prices.car_parking_nightly_rate)}/night</option>
            <option value="motorcycle">Motorcycle — {formatPhpMinor(prices.motorcycle_parking_nightly_rate)}/night</option>
          </select>
        </label>
        <label>
          <span>Number of guests</span>
          <select
            name="guests"
            value={guests}
            onChange={(event) => chooseGuests(Number(event.target.value))}
          >
            {guestOptions.map((count) => (
              <option key={count} value={count}>
                {count} guest{count === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Bedroom selection</span>
          <select
            name="bedroom"
            value={bedroom}
            onChange={(event) =>
              setBedroom(event.target.value as typeof bedroom)
            }
          >
            {availableBedrooms.map((choice) => (
              <option key={choice} value={choice}>
                {choice === "bedroom_1"
                  ? "Bedroom 1"
                  : choice === "bedroom_2"
                    ? "Bedroom 2"
                    : "Both bedrooms"}
              </option>
            ))}
          </select>
          <small>Two guests may choose Bedroom 1 or Bedroom 2.</small>
        </label>
        <button disabled={pending}>
          {pending ? "Updating…" : "Update guests and total"}
        </button>
      </form>
      <BookingPriceReceipt
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        bedroomChoice={bedroom}
        parkingType={parkingType}
        excessCheckoutHours={excessCheckoutHours}
        snapshot={guests===initialGuests && bedroom===initialBedroom && parkingType===initialParking && excessCheckoutHours===initialExcessCheckoutHours ? snapshot : undefined}
      />
      <small>
        Changes are allowed only before payment details or a receipt are
        submitted.
      </small>
    </section>
  );
}
