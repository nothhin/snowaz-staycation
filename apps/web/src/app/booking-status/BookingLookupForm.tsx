"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { lookupBooking, type BookingLookupState } from "./actions";
import { showError, showSuccess } from "@/lib/sweetalert";
import { formatStayRange } from "@/lib/date-format";
import { propertyProfile } from "@/lib/property";
const initial: BookingLookupState = { status: "idle" };
const php = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
export function BookingLookupForm() {
  const [state, action, pending] = useActionState(lookupBooking, initial);
  const [liveBooking, setLiveBooking] =
    useState<BookingLookupState["booking"]>();
  const credentials = useRef<{ reference: string; phone: string } | null>(null);
  useEffect(() => {
    if (state.status === "found" && state.booking) {
      void showSuccess("Booking status found. Live updates are now active.");
    } else if (state.status === "error" && state.message)
      void showError(state.message);
  }, [state]);
  useEffect(() => {
    if (state.status !== "found" || !credentials.current) return;
    const controller = new AbortController();
    let inFlight = false;
    const refresh = async () => {
      if (
        inFlight ||
        document.visibilityState !== "visible" ||
        !credentials.current
      )
        return;
      inFlight = true;
      try {
        const response = await fetch("/api/v1/booking-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials.current),
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          data?: BookingLookupState["booking"];
        };
        if (response.ok && body.data) setLiveBooking(body.data);
      } catch {
      } finally {
        inFlight = false;
      }
    };
    const interval = window.setInterval(() => void refresh(), 5000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [state.status]);
  const booking = liveBooking ?? state.booking;
  return (
    <>
      <form
        action={action}
        className="booking-lookup-form"
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          credentials.current = {
            reference: String(data.get("reference") ?? ""),
            phone: String(data.get("phone") ?? ""),
          };
          setLiveBooking(undefined);
        }}
      >
        <div className="booking-lookup-fields">
          <label>
            <span>Booking reference</span>
            <input
              name="reference"
              placeholder="SNOWAZ-1234ABCD"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <small>Shown after you sent your booking request.</small>
          </label>
          <label>
            <span>Contact number used</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09xx xxx xxxx"
              required
            />
            <small>Use the same number entered during booking.</small>
          </label>
        </div>
        <button disabled={pending}>
          {pending ? "Checking your booking…" : "View my booking status"}
        </button>
      </form>
      {state.status === "found" && booking ? (
        <section className="booking-status-result" aria-live="polite">
          <header>
            <div>
              <p className="eyebrow">Digital booking receipt</p>
              <h2>{booking.status.replaceAll("_", " ")}</h2>
            </div>
            <span className="booking-status-badge" data-status={booking.status}>
              {booking.remainingMinor === 0
                ? "Fully paid"
                : booking.status === "confirmed"
                  ? "Confirmed · balance due"
                  : "Request in progress"}
            </span>
          </header>
          <div className="booking-status-stay">
            <span>Your stay</span>
            <strong>
              {formatStayRange(booking.checkIn, booking.checkOut)}
            </strong>
            <small>
              {booking.guests} guest{booking.guests === 1 ? "" : "s"} ·{" "}
              {booking.bedroomChoice.replaceAll("_", " ")}
            </small>
          </div>
          <div className="booking-status-location" aria-label="Pickup and return location">
            <span>Pickup & return location</span>
            <strong>{propertyProfile.pickupReturnLocation.label}</strong>
            <a href={propertyProfile.pickupReturnLocation.mapsUrl} target="_blank" rel="noreferrer">
              Open location in Google Maps ↗
            </a>
          </div>
          <dl>
            <div>
              <dt>Stay progress</dt>
              <dd>{booking.stayStatus.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Booking status</dt>
              <dd>{booking.status.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Total payment</dt>
              <dd>{php.format(booking.totalMinor / 100)}</dd>
            </div>
            <div>
              <dt>Total paid</dt>
              <dd>{php.format(booking.paidMinor / 100)}</dd>
            </div>
            <div
              className="booking-balance"
              data-paid={booking.remainingMinor === 0}
            >
              <dt>Remaining balance</dt>
              <dd>{php.format(booking.remainingMinor / 100)}</dd>
            </div>
            <div>
              <dt>Payment status</dt>
              <dd>
                {booking.remainingMinor === 0 ? "Fully paid" : "Balance due"}
              </dd>
            </div>
          </dl>
          <div className="booking-status-result-actions">
            <button type="button" onClick={() => window.print()}>
              Print digital receipt
            </button>
            <span>
              Live updates are checked automatically every few seconds.
            </span>
          </div>
          <p>
            To request a reschedule or cancellation, contact SnowAZ. Approved
            changes, repricing, payments, and refunds will appear here
            automatically.
          </p>
        </section>
      ) : null}
    </>
  );
}
