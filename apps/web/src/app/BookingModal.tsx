"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { submitBookingRequestInline, type BookingActionState } from "./book/actions";
import { propertyProfile } from "@/lib/property";
import qrImage from "@/assets/maribank-deposit-qr.png";
import { showError, showSuccess } from "@/lib/sweetalert";

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
  const availabilityNotified = useRef(false);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    if (state.status === "success" && !availabilityNotified.current) {
      availabilityNotified.current = true;
      window.dispatchEvent(new Event("snowaz:availability-changed"));
      void showSuccess("Booking request received. Your dates are held for two hours.");
    }
    if (state.status === "error" && state.message) void showError(state.message);
  }, [state.status, state.message]);

  return <div className="booking-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
      <button className="booking-modal-close" type="button" aria-label="Close booking form" onClick={onClose}>×</button>
      {state.status === "success" ? <div className="booking-modal-success" role="status">
        <span aria-hidden="true">✓</span><p className="eyebrow">Dates held for two hours</p><h2 id={titleId}>Complete your deposit.</h2>
        <p>Your booking reference is <strong>{state.bookingReference}</strong>. Pay the refundable ₱1,000 security deposit below, then submit the bank reference for SnowAZ verification. Payment does not confirm the reservation until it is verified in MariBank.</p>
        <div className="booking-success-qr"><Image src={qrImage} alt="MariBank InstaPay QR for Merry Shien Gepitulan, account ending 5650" sizes="(max-width: 520px) 82vw, 330px" /><strong>Merry Shien Gepitulan</strong><small>MariBank · account ending 5650 · exactly ₱1,000</small></div>
        <Link className="booking-deposit-link" href={state.depositLink ?? "/"}>I’ve paid — submit bank reference</Link>
        <div className="booking-contact-actions"><button type="button" onClick={async () => { await navigator.clipboard.writeText(`Hello SnowAZ! My booking reference is ${state.bookingReference}. I paid the ₱1,000 security deposit and I am attaching my receipt for verification.`); setCopied(true); }}>{copied ? "Message copied—paste in Messenger" : "Copy receipt message"}</button><a href={propertyProfile.messengerUrl} target="_blank" rel="noreferrer" onClick={() => { void navigator.clipboard.writeText(`Hello SnowAZ! My booking reference is ${state.bookingReference}. I paid the ₱1,000 security deposit and I am attaching my receipt for verification.`); setCopied(true); }}>Open Messenger and attach receipt</a><a href={`tel:${propertyProfile.phoneHref}`}>Call SnowAZ</a></div>
        <small className="booking-deadline">Complete the transfer and submit its reference within two hours or the pending dates may reopen.</small>
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
          <div className="booking-modal-grid"><label><span>Email address (optional)</span><input name="email" type="email" autoComplete="email" /></label><label><span>Contact number</span><input name="phone" type="tel" autoComplete="tel" placeholder="09xx xxx xxxx" required /></label></div>
          <label><span>Preferred contact</span><select name="preferredContact" defaultValue="messenger"><option value="messenger">Facebook Messenger</option><option value="whatsapp">WhatsApp</option><option value="phone">Phone call</option><option value="email">Email (email address required)</option></select></label>
          <label><span>Special requests (optional)</span><textarea name="specialRequests" rows={3} maxLength={1000} placeholder="Arrival time, parking request, celebration, or anything SnowAZ should know" /></label>
          <div className="booking-policy-summary"><strong>Before you send</strong><ul><li>Your dates will be held as pending for two hours while you send the refundable ₱1,000 deposit.</li><li>No smoking inside the unit; a ₱5,000 penalty applies.</li><li>Payment remains pending until SnowAZ verifies it in MariBank.</li></ul></div>
          <label className="booking-modal-consent"><input name="consent" type="checkbox" required /><span>I agree that SnowAZ may use my contact and stay details to respond to this request. I have read the <Link href="/privacy">Privacy Notice</Link>, <Link href="/cookies">Cookie Notice</Link>, and booking notes above.</span></label>
          <button className="booking-modal-submit" type="submit" disabled={pending}>{pending ? "Sending request…" : "Send booking request"}</button>
        </form>
      </>}
    </div>
  </div>;
}
