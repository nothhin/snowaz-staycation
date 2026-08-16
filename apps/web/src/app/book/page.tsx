import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { submitBookingRequest } from "./actions";
import { propertyProfile } from "@/lib/property";
import styles from "./book.module.css";
import BookingPriceFields from "./BookingPriceFields";

export const metadata: Metadata = { title: "Request a booking" };

export default async function BookingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  if (params.submitted === "1") return <main className={styles.shell}><section className={styles.success}><Image src="/images/snowaz/logo.jpg" alt="SnowAZ Staycation" width={110} height={110} /><p>Booking request received</p><h1>Thank you. We’ll be in touch.</h1><p>Your dates are pending review—not yet confirmed. SnowAZ Staycation will contact you with availability, the final rate, stay rules, and payment instructions.</p><a href={propertyProfile.messengerUrl} target="_blank" rel="noreferrer">Follow up on Messenger</a><Link href="/">Return to SnowAZ</Link></section></main>;

  return <main className={styles.shell}>
    <header><Link href="/">SnowAZ Staycation</Link><Link href="/#availability">Back to availability</Link></header>
    <div className={styles.layout}>
      <section className={styles.intro}><Image src="/images/snowaz/logo.jpg" alt="SnowAZ Staycation logo" width={100} height={100} /><p>Request a reservation</p><h1>Let’s plan your city escape.</h1><p>Send your preferred dates and contact details. SnowAZ will confirm availability, the final price, payment instructions, and house rules directly with you.</p><aside><strong>Need an immediate answer?</strong><a href={propertyProfile.messengerUrl} target="_blank" rel="noreferrer">Open Facebook Messenger</a><a href={`tel:${propertyProfile.phoneHref}`}>Call {propertyProfile.phoneDisplay}</a></aside></section>
      <form action={submitBookingRequest} className={styles.form}>
        {params.error ? <div className={styles.error} role="alert">We couldn’t submit those details. Check every field or contact us directly.</div> : null}
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} /><input type="hidden" name="roomTypeId" value="" /><input type="hidden" name="preferredContact" value="phone" />
        <label className={styles.honeypot}>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <BookingPriceFields initialCheckIn={params.checkIn} initialCheckOut={params.checkOut} initialGuests={params.guests} />
        <label><span>Full name</span><input name="fullName" autoComplete="name" required /></label>
        <label><span>Email address (optional)</span><input name="email" type="email" autoComplete="email" /></label>
        <label><span>Contact number (required)</span><input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="09xx xxx xxxx" required /><small>SnowAZ will call this number about your request.</small></label>
        <label><span>Special requests (optional)</span><textarea name="specialRequests" rows={4} maxLength={1000} placeholder="Arrival time, celebration, or anything SnowAZ should know" /></label>
        <label className={styles.consent}><input name="consent" type="checkbox" required /><span>I agree that SnowAZ may use my contact and stay details to respond to this request. I have read the <Link href="/privacy">Privacy Notice</Link> and <Link href="/cookies">Cookie Notice</Link>. This does not confirm a reservation, and payment instructions are handled offline.</span></label>
        <button type="submit">Continue to down payment</button><small>Your dates will be held for two hours. The required ₱1,000 down payment is verified manually in MariBank.</small>
      </form>
    </div>
  </main>;
}
