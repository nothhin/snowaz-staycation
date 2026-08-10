"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { lookupBooking, type BookingLookupState } from "./actions";
import { showError, showSuccess } from "@/lib/sweetalert";
import { formatStayRange } from "@/lib/date-format";

const initial:BookingLookupState={status:"idle"};

export function BookingLookupForm(){
  const [state,action,pending]=useActionState(lookupBooking,initial);
  const [liveBooking,setLiveBooking]=useState<BookingLookupState["booking"]>();
  const credentials=useRef<{reference:string;phone:string}|null>(null);

  useEffect(()=>{
    if(state.status==="found"&&state.booking){ setLiveBooking(state.booking); void showSuccess("Booking status found. Live updates are now active."); }
    else if(state.status==="error"&&state.message) void showError(state.message);
  },[state]);

  useEffect(()=>{
    if(state.status!=="found"||!credentials.current) return;
    const controller=new AbortController();
    let inFlight=false;
    const refresh=async()=>{
      if(inFlight||document.visibilityState!=="visible"||!credentials.current)return;
      inFlight=true;
      try{
        const response=await fetch("/api/v1/booking-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(credentials.current),cache:"no-store",signal:controller.signal});
        const body=await response.json() as {data?:BookingLookupState["booking"]};
        if(response.ok&&body.data)setLiveBooking(body.data);
      }catch{ /* The next interval or focus event retries silently. */ }
      finally{inFlight=false;}
    };
    const interval=window.setInterval(()=>{void refresh();},5_000);
    const onFocus=()=>{void refresh();};
    window.addEventListener("focus",onFocus);
    return()=>{controller.abort();window.clearInterval(interval);window.removeEventListener("focus",onFocus);};
  },[state.status]);

  const booking=liveBooking??state.booking;
  return <><form action={action} className="booking-lookup-form" onSubmit={(event)=>{const data=new FormData(event.currentTarget);credentials.current={reference:String(data.get("reference")??""),phone:String(data.get("phone")??"")};setLiveBooking(undefined);}}><label><span>Booking reference</span><input name="reference" placeholder="SNOWAZ-1234ABCD" autoCapitalize="characters" required /><small>Save this reference when you submit your booking request.</small></label><label><span>Contact number used</span><input name="phone" type="tel" autoComplete="tel" placeholder="09xx xxx xxxx" required /></label><button disabled={pending}>{pending?"Checking…":"Check booking status"}</button></form>{state.status==="found"&&booking?<section className="booking-status-result" aria-live="polite"><p className="eyebrow">Live booking status</p><h2>{booking.status.replaceAll("_"," ")}</h2><dl><div><dt>Stay</dt><dd>{formatStayRange(booking.checkIn,booking.checkOut)}</dd></div><div><dt>Guests</dt><dd>{booking.guests}</dd></div><div><dt>Deposit</dt><dd>{booking.depositStatus.replaceAll("_"," ")}</dd></div></dl><p>Status refreshes automatically while this page is open. For privacy, only booking and deposit status are displayed.</p></section>:null}</>;
}
