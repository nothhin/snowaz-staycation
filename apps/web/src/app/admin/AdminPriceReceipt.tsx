import type { AdminEnquiry } from "./BookingRequestsPanel";
import styles from "./admin.module.css";

const php = new Intl.NumberFormat("en-PH", { style:"currency", currency:"PHP", maximumFractionDigits:0 });
const bedroomLabels = { bedroom_1:"Bedroom 1", bedroom_2:"Bedroom 2", both_bedrooms:"Both bedrooms" } as const;

export function AdminPriceReceipt({ booking }: { booking:AdminEnquiry }) {
  return <section className={styles.adminReceipt} aria-label="Booking payment receipt"><header><strong>Payment summary</strong><span>{booking.remainingBalanceMinor === 0 ? "Fully paid" : "Balance due"}</span></header><dl>
    <div><dt>Stay</dt><dd>{booking.stayNights} night{booking.stayNights===1?"":"s"}</dd></div>
    <div><dt>Pax</dt><dd>{booking.guestCount}</dd></div>
    <div><dt>Bedroom</dt><dd>{bedroomLabels[booking.bedroomChoice]}</dd></div>
    <div><dt>Base nightly rate</dt><dd>{php.format(booking.baseNightlyRateMinor/100)}</dd></div>
    {booking.additionalGuestCount>0?<div><dt>Additional pax<br/><small>{booking.additionalGuestCount} × {php.format(booking.additionalGuestChargeMinor/booking.additionalGuestCount/booking.stayNights/100)} × {booking.stayNights} night{booking.stayNights===1?"":"s"}</small></dt><dd>+{php.format(booking.additionalGuestChargeMinor/100)}</dd></div>:null}
    {(booking.parkingChargeMinor??0)>0?<div><dt>{booking.parkingType==="car"?"Car":"Motorcycle"} parking<br/><small>{php.format((booking.parkingNightlyRateMinor??0)/100)} × {booking.stayNights} night{booking.stayNights===1?"":"s"}</small></dt><dd>+{php.format((booking.parkingChargeMinor??0)/100)}</dd></div>:null}
    {(booking.excessCheckoutChargeMinor??0)>0?<div><dt>Excess checkout time<br/><small>{booking.excessCheckoutHours} hour{booking.excessCheckoutHours===1?"":"s"} × {php.format((booking.excessCheckoutChargeMinor??0)/(booking.excessCheckoutHours||1)/100)}</small></dt><dd>+{php.format((booking.excessCheckoutChargeMinor??0)/100)}</dd></div>:null}
    <div><dt>Total accommodation</dt><dd>{php.format(booking.totalMinor/100)}</dd></div>
    <div><dt>Refundable security deposit</dt><dd>{php.format(booking.depositAmountMinor/100)}</dd></div>
    <div><dt>Balance paid</dt><dd>−{php.format(booking.balancePaidMinor/100)}</dd></div>
    <div className={styles.adminReceiptBalance}><dt>Remaining balance</dt><dd>{php.format(booking.remainingBalanceMinor/100)}</dd></div>
  </dl></section>;
}
