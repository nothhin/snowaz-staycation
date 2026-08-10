"use client";

import { useActionState, useEffect } from "react";
import { lookupBooking, type BookingLookupState } from "./actions";
import { showError, showSuccess } from "@/lib/sweetalert";
import { formatStayRange } from "@/lib/date-format";

const initial:BookingLookupState={status:"idle"};
export function BookingLookupForm(){
  const [state,action,pending]=useActionState(lookupBooking,initial);
  useEffect(()=>{ if(state.status==="found") void showSuccess("Booking status found."); else if(state.status==="error"&&state.message) void showError(state.message); },[state]);
  return <><form action={action} className="booking-lookup-form"><label><span>Booking reference</span><input name="reference" placeholder="SNOWAZ-1234ABCD" autoCapitalize="characters" required /><small>Save this reference when you submit your booking request.</small></label><label><span>Contact number used</span><input name="phone" type="tel" autoComplete="tel" placeholder="09xx xxx xxxx" required /></label><button disabled={pending}>{pending?"Checking…":"Check booking status"}</button></form>{state.status==="found"&&state.booking?<section className="booking-status-result"><p className="eyebrow">Current booking status</p><h2>{state.booking.status.replaceAll("_"," ")}</h2><dl><div><dt>Stay</dt><dd>{formatStayRange(state.booking.checkIn,state.booking.checkOut)}</dd></div><div><dt>Guests</dt><dd>{state.booking.guests}</dd></div><div><dt>Deposit</dt><dd>{state.booking.depositStatus.replaceAll("_"," ")}</dd></div></dl><p>For privacy, this lookup only shows booking status. Use the private link saved on your original device to continue payment, or contact SnowAZ through Messenger.</p></section>:null}</>;
}
