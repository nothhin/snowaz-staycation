"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { submitBookingRequestInline, type BookingActionState } from "./book/actions";
import { propertyProfile } from "@/lib/property";

type BookingModalProps = {
  checkIn: string;
  checkOut: string;
  onClose: () => void;
};

const initialState: BookingActionState = { status: "idle" };

export default function BookingModal({ checkIn, checkOut, onClose }: BookingModalProps) {
  const [state, action, pending] = useActionState(submitBookingRequestInline, initialState);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return <div className="booking-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
      <button className="booking-modal-close" type="button" aria-label="Close booking form" onClick={onClose}>×</button>
      {state.status === "success" ? <div className="booking-modal-success" role="status">
        <span aria-hidden="true">✓</span><p className="eyebrow">Request received</p><h2 id={titleId}>Thank you. We’ll be in touch.</h2>
        <p>Your dates are pending review and are not yet confirmed. SnowAZ will contact you with the final rate, house rules, and offline payment instructions.</p>
        <a href={propertyProfile.whatsappUrl} target="_blank" rel="noreferrer">Follow up on WhatsApp</a>
        <button type="button" onClick={onClose}>Return to availability</button>
      </div> : <>
        <div className="booking-modal-heading"><p className="eyebrow">Request a reservation</p><h2 id={titleId}>Plan your SnowAZ stay.</h2><p>No payment is collected here. This form sends an availability request only.</p></div>
        <form action={action} className="booking-modal-form">
          {state.status === "error" ? <div className="booking-modal-error" role="alert">{state.message}</div> : null}
          <input type="hidden" name="idempotencyKey" value={idempotencyKey.current} /><input type="hidden" name="roomTypeId" value="" />
          <label className="booking-honeypot">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <div className="booking-modal-grid"><label><span>Check-in</span><input name="checkIn" type="date" defaultValue={checkIn} required /></label><label><span>Check-out</span><input name="checkOut" type="date" defaultValue={checkOut} required /></label></div>
          <label><span>Number of guests</span><input name="guests" type="number" min="1" max="8" defaultValue="2" required /><small>2 guests include 1 bedroom; book 4 or more guests for access to both bedrooms.</small></label>
          <label><span>Full name</span><input name="fullName" autoComplete="name" required /></label>
          <div className="booking-modal-grid"><label><span>Email address</span><input name="email" type="email" autoComplete="email" required /></label><label><span>Contact number</span><input name="phone" type="tel" autoComplete="tel" placeholder="09xx xxx xxxx" required /></label></div>
          <label><span>Special requests (optional)</span><textarea name="specialRequests" rows={3} maxLength={1000} placeholder="Arrival time, parking request, celebration, or anything SnowAZ should know" /></label>
          <div className="booking-policy-summary"><strong>Before you send</strong><ul><li>₱1,000 refundable security deposit is collected offline before check-in.</li><li>No smoking inside the unit; a ₱5,000 penalty applies.</li><li>This request does not create a confirmed reservation.</li></ul></div>
          <label className="booking-modal-consent"><input name="consent" type="checkbox" required /><span>I agree that SnowAZ may use my contact and stay details to respond to this request. I have read the booking notes above.</span></label>
          <button className="booking-modal-submit" type="submit" disabled={pending}>{pending ? "Sending request…" : "Send booking request"}</button>
        </form>
      </>}
    </div>
  </div>;
}
