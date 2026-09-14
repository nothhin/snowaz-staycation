"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { calculateSnowazBookingReceipt, validBedroomChoices } from "@casa-marga/shared/booking";
import Image from "next/image";
import Link from "next/link";
import {
  submitBookingRequestInline,
  type BookingActionState,
} from "./book/actions";
import { propertyProfile } from "@/lib/property";
import qrImage from "@/assets/maribank-deposit-qr.png";
import { showError, showSuccess } from "@/lib/sweetalert";
import { RememberBooking, rememberBooking } from "./BookingMemory";
import BookingPriceReceipt from "./BookingPriceReceipt";
import { usePricing } from "./PricingProvider";
import { formatPhpMinor } from "@casa-marga/shared/pricing";

type BookingModalProps = {
  checkIn: string;
  checkOut: string;
  onClose: () => void;
};

const initialState: BookingActionState = { status: "idle" };

export default function BookingModal({
  checkIn,
  checkOut,
  onClose,
}: BookingModalProps) {
  const { prices, version } = usePricing();
  const [state, action, pending] = useActionState(
    submitBookingRequestInline,
    initialState,
  );
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const availabilityNotified = useRef(false);
  const redirectStarted = useRef(false);
  const [copied, setCopied] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState(checkIn);
  const [selectedCheckOut, setSelectedCheckOut] = useState(checkOut);
  const [guests, setGuests] = useState(2);
  const [bedroomChoice, setBedroomChoice] = useState<
    "bedroom_1" | "bedroom_2" | "both_bedrooms"
  >("bedroom_1");
  const [parkingType, setParkingType] = useState<"none" | "car" | "motorcycle">(
    "none",
  );
  const [excessCheckoutHours, setExcessCheckoutHours] = useState(0);
  let quotedTotalMinor = 0;
  try { quotedTotalMinor = calculateSnowazBookingReceipt(selectedCheckIn, selectedCheckOut, guests, bedroomChoice, parkingType, excessCheckoutHours, prices).totalMinor; } catch { /* Dates may still be incomplete. */ }
  const availableBedrooms = validBedroomChoices(guests);
  const chooseGuests = (value: number) => {
    setGuests(value);
    if (!(validBedroomChoices(value) as readonly string[]).includes(bedroomChoice)) {
      setBedroomChoice(validBedroomChoices(value)[0]);
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (
      state.status === "success" &&
      state.depositLink &&
      !redirectStarted.current
    ) {
      redirectStarted.current = true;
      rememberBooking({
        url: state.depositLink,
        reference: state.bookingReference,
        checkIn: selectedCheckIn,
        checkOut: selectedCheckOut,
      });
      window.dispatchEvent(new Event("snowaz:availability-changed"));
      window.location.assign(state.depositLink);
    } else if (state.status === "success" && !availabilityNotified.current) {
      availabilityNotified.current = true;
      window.dispatchEvent(new Event("snowaz:availability-changed"));
      void showSuccess(
        "Booking request received. Your dates are held for 24 hours.",
      );
    }
    if (state.status === "error" && state.message)
      void showError(state.message);
  }, [
    state.status,
    state.message,
    state.depositLink,
    state.bookingReference,
    selectedCheckIn,
    selectedCheckOut,
  ]);

  return (
    <div
      className="booking-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <button
          className="booking-modal-close"
          type="button"
          aria-label="Close booking form"
          onClick={onClose}
        >
          ×
        </button>
        {state.status === "success" ? (
          <div className="booking-modal-success" role="status">
            <RememberBooking
              booking={{
                url: state.depositLink ?? "/booking-status",
                reference: state.bookingReference,
                checkIn: selectedCheckIn,
                checkOut: selectedCheckOut,
              }}
            />
            <span aria-hidden="true">✓</span>
                <p className="eyebrow">Dates held for 24 hours</p>
            <h2 id={titleId}>Complete your security deposit.</h2>
            <p>
              Your booking reference is{" "}
              <strong>{state.bookingReference}</strong>. Pay the required {formatPhpMinor(prices.refundable_security_deposit)}
              refundable security deposit below, then submit the bank reference for SnowAZ
              verification. Payment does not confirm the reservation until it is
              verified in MariBank.
            </p>
            <BookingPriceReceipt
              checkIn={selectedCheckIn}
              checkOut={selectedCheckOut}
              guests={guests}
              bedroomChoice={bedroomChoice}
              excessCheckoutHours={excessCheckoutHours}
            />
            <div className="booking-success-qr">
              <Image
                src={qrImage}
                alt="MariBank InstaPay QR for Merry Shien Gepitulan, account ending 5650"
                sizes="(max-width: 520px) 82vw, 330px"
              />
              <strong>Merry Shien Gepitulan</strong>
              <small>MariBank · account ending 5650 · exactly {formatPhpMinor(prices.refundable_security_deposit)}</small>
            </div>
            <Link
              className="booking-deposit-link"
              href={state.depositLink ?? "/"}
            >
              I’ve paid — submit bank reference
            </Link>
            <div className="booking-contact-actions">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `Hello SnowAZ! My booking reference is ${state.bookingReference}. I paid the ${formatPhpMinor(prices.refundable_security_deposit)} refundable security deposit and I am attaching my receipt for verification.`,
                  );
                  setCopied(true);
                }}
              >
                {copied
                  ? "Message copied—paste in Messenger"
                  : "Copy receipt message"}
              </button>
              <a
                href={propertyProfile.messengerUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `Hello SnowAZ! My booking reference is ${state.bookingReference}. I paid the ${formatPhpMinor(prices.refundable_security_deposit)} refundable security deposit and I am attaching my receipt for verification.`,
                  );
                  setCopied(true);
                }}
              >
                Open Messenger and attach receipt
              </a>
              <a href={`tel:${propertyProfile.phoneHref}`}>Call SnowAZ</a>
            </div>
            <small className="booking-deadline">
                    Complete the transfer and submit its reference within 24 hours or
              the pending dates may reopen.
            </small>
            <button type="button" onClick={onClose}>
              Return to availability
            </button>
          </div>
        ) : (
          <>
            <div className="booking-modal-heading">
              <p className="eyebrow">Request a reservation</p>
              <h2 id={titleId}>Plan your SnowAZ stay.</h2>
              <p>
                No payment is collected here. This form sends an availability
                request only.
              </p>
            </div>
            <form action={action} className="booking-modal-form">
              {state.status === "error" ? (
                <div className="booking-modal-error" role="alert">
                  {state.message}
                </div>
              ) : null}
              <input
                type="hidden"
                name="idempotencyKey"
                value={idempotencyKey}
              />
              <input type="hidden" name="roomTypeId" value="" />
              <input type="hidden" name="priceVersion" value={version} />
              <input type="hidden" name="quotedTotalMinor" value={quotedTotalMinor} />
              <input type="hidden" name="preferredContact" value="phone" />
              <label>
                <span>Excess checkout time (optional)</span>
                <select name="excessCheckoutHours" value={excessCheckoutHours} onChange={(event) => setExcessCheckoutHours(Number(event.target.value))}>
                  {[0, 1, 2, 3].map((hours) => <option key={hours} value={hours}>{hours === 0 ? "No excess time" : `${hours} hour${hours === 1 ? "" : "s"} — ${formatPhpMinor(hours * prices.late_checkout_hourly_rate)}`}</option>)}
                </select>
                <small>Check-out is 11:00 AM. More than 3 hours may be charged as half-day or an additional night, subject to availability.</small>
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
              <label className="booking-honeypot">
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <div className="booking-modal-grid">
                <label>
                  <span>Check-in</span>
                  <input
                    name="checkIn"
                    type="date"
                    value={selectedCheckIn}
                    onChange={(event) => setSelectedCheckIn(event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Check-out</span>
                  <input
                    name="checkOut"
                    type="date"
                    value={selectedCheckOut}
                    onChange={(event) =>
                      setSelectedCheckOut(event.target.value)
                    }
                    required
                  />
                </label>
              </div>
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
                  One bedroom starts at {formatPhpMinor(Math.min(prices.bedroom_1_nightly_rate, prices.bedroom_2_nightly_rate))}/night. Both bedrooms accommodate
                  4–5 guests for {formatPhpMinor(prices.both_bedrooms_nightly_rate)}; the sixth guest is +{formatPhpMinor(prices.additional_guest_nightly_rate)}.
                </small>
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
                  Two guests may choose Bedroom 1 or Bedroom 2. Other guest
                  counts show the bedroom setup that fits their group.
                </small>
              </label>
              <BookingPriceReceipt
                checkIn={selectedCheckIn}
                checkOut={selectedCheckOut}
                guests={guests}
                bedroomChoice={bedroomChoice}
                parkingType={parkingType}
                excessCheckoutHours={excessCheckoutHours}
              />
              <label>
                <span>Full name</span>
                <input name="fullName" autoComplete="name" required />
              </label>
              <div className="booking-modal-grid">
                <label>
                  <span>Email address (optional)</span>
                  <input name="email" type="email" autoComplete="email" />
                </label>
                <label>
                  <span>Contact number (required)</span>
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="09xx xxx xxxx"
                    required
                  />
                  <small>
                    SnowAZ will call this number about your request.
                  </small>
                </label>
              </div>
              <label>
                <span>Special requests (optional)</span>
                <textarea
                  name="specialRequests"
                  rows={3}
                  maxLength={1000}
                  placeholder="Arrival time, parking request, celebration, or anything SnowAZ should know"
                />
              </label>
              <div className="booking-policy-summary">
                <strong>Before you send</strong>
                <ul>
                  <li>
                    Your dates will be held as pending for 24 hours while you
                    send the required {formatPhpMinor(prices.refundable_security_deposit)} refundable security deposit.
                  </li>
                  <li>Quiet hours are from 11:00 PM to 7:00 AM.</li>
                  <li>No smoking inside the unit; a {formatPhpMinor(prices.no_smoking_penalty)} penalty applies.</li>
                  <li>
                    Payment remains pending until SnowAZ verifies it in
                    MariBank.
                  </li>
                </ul>
              </div>
              <label className="booking-modal-consent">
                <input name="consent" type="checkbox" required />
                <span>
                  I agree that SnowAZ may use my contact and stay details to
                  respond to this request. I have read the{" "}
                  <Link href="/privacy">Privacy Notice</Link>,{" "}
                  <Link href="/cookies">Cookie Notice</Link>, and booking notes
                  above.
                </span>
              </label>
              <button
                className="booking-modal-submit"
                type="submit"
                disabled={pending}
              >
                {pending ? "Sending request…" : "Send booking request"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
