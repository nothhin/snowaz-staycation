"use client";

import styles from "./admin.module.css";
import { createManualBooking } from "./actions";
import { usePricing } from "../PricingProvider";
import { formatPhpMinor } from "@casa-marga/shared/pricing";

export function ManualBookingForm() {
  const { prices } = usePricing();
  return <section id="manual-booking" className={styles.compactPanel}>
    <p className={styles.eyebrow}>Front desk</p><h2>Book for a walk-in guest</h2>
    <p>Creates a 24-hour deposit hold. Use the booking controls below to record payment and confirm it.</p>
    <form action={createManualBooking} className={styles.bookingForm}>
      <input name="fullName" placeholder="Guest full name" required minLength={2} maxLength={120}/>
      <input name="phone" placeholder="Phone number" required minLength={7} maxLength={30}/>
      <input name="email" type="email" placeholder="Email (optional)"/>
      <label>Check-in<input name="checkIn" type="date" required/></label>
      <label>Check-out<input name="checkOut" type="date" required/></label>
      <label>Guests<input name="guests" type="number" min="1" max="6" defaultValue="1" required/></label>
      <label>Bedroom<select name="bedroom" defaultValue="bedroom_1">
        <option value="bedroom_1">Bedroom 1 — {formatPhpMinor(prices.bedroom_1_nightly_rate)}/night</option>
        <option value="bedroom_2">Bedroom 2 — {formatPhpMinor(prices.bedroom_2_nightly_rate)}/night for 2</option>
        <option value="both_bedrooms">Both bedrooms — {formatPhpMinor(prices.both_bedrooms_nightly_rate)}/night for 4–5</option>
      </select></label>
      <label>Excess checkout time<select name="excessCheckoutHours" defaultValue="0">
        <option value="0">None</option>{[1,2,3].map(hours => <option key={hours} value={hours}>{hours} hour{hours>1?"s":""} — {formatPhpMinor(hours*prices.late_checkout_hourly_rate)}</option>)}
      </select></label>
      <label>Contact method<select name="contact" defaultValue="phone"><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="messenger">Messenger</option><option value="email">Email</option></select></label>
      <textarea name="requests" placeholder="Notes (optional)" maxLength={1000}/>
      <button type="submit">Create manual booking</button>
    </form>
  </section>;
}
