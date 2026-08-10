"use client";

import { useMemo, useState } from "react";
import { formatStayRange } from "@/lib/date-format";
import { DepositControls } from "./DepositControls";
import type { AdminEnquiry } from "./BookingRequestsPanel";
import styles from "./admin.module.css";

export function ConfirmedBookingsPanel({bookings,canManage}:{bookings:AdminEnquiry[];canManage:boolean}){
  const [query,setQuery]=useState("");
  const confirmed=useMemo(()=>bookings.filter(item=>item.status==="confirmed"&&[item.fullName,item.phone,item.email,item.depositReference].some(value=>value?.toLowerCase().includes(query.toLowerCase()))),[bookings,query]);
  return <section className={styles.panel}><div className={styles.panelHeading}><div><p className={styles.eyebrow}>Confirmed stays</p><h2>Confirmed bookings</h2></div><span className={styles.countBadge}>{confirmed.length} confirmed</span></div><div className={styles.bookingFilters}><label><span>Search confirmed bookings</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Guest, phone, email, or transfer reference" /></label></div>{confirmed.length?<div className={`${styles.reservationList} ${styles.bookingRequestList}`}>{confirmed.map(item=><article key={item.id}><div><strong>{item.fullName}</strong><small>{item.phone}{item.email?<> · <a href={`mailto:${item.email}`}>{item.email}</a></>:null}</small><a className={styles.callGuestButton} href={`tel:${item.phone}`} aria-label={`Call ${item.fullName}`}>Call guest</a><small>{item.guestCount>=4?"2-bedroom access":"1-bedroom access"}</small></div><div><span>{formatStayRange(item.checkIn,item.checkOut)}</span><small>{item.guestCount} guest{item.guestCount===1?"":"s"}</small>{item.depositReference?<small>Transfer: {item.depositReference} · {item.depositSenderName}</small>:null}</div><div className={styles.depositColumn}><b data-status="confirmed">confirmed</b><span className={styles.depositBadge} data-status={item.depositStatus}>{item.depositStatus.replaceAll("_"," ")}</span><DepositControls bookingId={item.id} bookingStatus={item.status} depositStatus={item.depositStatus} canManage={canManage}/></div></article>)}</div>:<div className={styles.emptyState}><span aria-hidden="true">✓</span><h3>No confirmed bookings found</h3><p>Verified bookings automatically move here from the request queue.</p></div>}</section>;
}
