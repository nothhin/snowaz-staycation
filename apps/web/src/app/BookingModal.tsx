"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
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
  const [parkingType, setParkingType] = useState<"none" | "car" | "motorcycle">(
    "none",
  );
  const bedroomChoice =
    guests <= 2
      ? ("bedroom_1" as const)
      : guests <= 4
        ? ("bedroom_2" as const)
        : ("both_bedrooms" as const);

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
        "Booking request received. Your dates are held for two hours.",
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
            <p className="eyebrow">Dates held for two hours</p>
            <h2 id={titleId}>Complete your down payment.</h2>
            <p>
              Your booking reference is{" "}
              <strong>{state.bookingReference}</strong>. Pay the required ₱1,000
              down payment below, then submit the bank reference for SnowAZ
              verification. Payment does not confirm the reservation until it is
              verified in MariBank.
            </p>
            <BookingPriceReceipt
              checkIn={selectedCheckIn}
              checkOut={selectedCheckOut}
              guests={guests}
              bedroomChoice={bedroomChoice}
            />
            <div className="booking-success-qr">
              <Image
                src={qrImage}
                alt="MariBank InstaPay QR for Merry Shien Gepitulan, account ending 5650"
                sizes="(max-width: 520px) 82vw, 330px"
              />
              <strong>Merry Shien Gepitulan</strong>
              <small>MariBank · account ending 5650 · exactly ₱1,000</small>
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
                    `Hello SnowAZ! My booking reference is ${state.bookingReference}. I paid the ₱1,000 booking down payment and I am attaching my receipt for verification.`,
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
                    `Hello SnowAZ! My booking reference is ${state.bookingReference}. I paid the ₱1,000 booking down payment and I am attaching my receipt for verification.`,
                  );
                  setCopied(true);
                }}
              >
                Open Messenger and attach receipt
              </a>
              <a href={`tel:${propertyProfile.phoneHref}`}>Call SnowAZ</a>
            </div>
            <small className="booking-deadline">
              Complete the transfer and submit its reference within two hours or
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
              <input type="hidden" name="preferredContact" value="phone" />
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
                  Assigned automatically: 1–2 guests use Bedroom 1, 3–4 use
                  Bedroom 2, and 5–8 use both bedrooms.
                </small>
              </label>
              <BookingPriceReceipt
                checkIn={selectedCheckIn}
                checkOut={selectedCheckOut}
                guests={guests}
                bedroomChoice={bedroomChoice}
                parkingType={parkingType}
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
                    Your dates will be held as pending for two hours while you
                    send the required ₱1,000 down payment.
                  </li>
                  <li>Quiet hours are from 11:00 PM to 7:00 AM.</li>
                  <li>No smoking inside the unit; a ₱5,000 penalty applies.</li>
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
