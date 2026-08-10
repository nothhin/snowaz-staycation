"use client";

import { useMemo, useState } from "react";
import { DepositControls } from "./DepositControls";
import styles from "./admin.module.css";
import { formatStayRange } from "@/lib/date-format";

export type AdminEnquiry = {
  id:string; fullName:string; email:string; phone:string; preferredContact:string;
  checkIn:string; checkOut:string; guestCount:number; status:string; depositStatus:string;
  depositSenderName:string|null; depositReference:string|null; depositSubmittedAt:string|null;
  depositRefundReference:string|null; roomTypeName:string|null;
};

export function BookingRequestsPanel({ enquiries, canManage }: { enquiries: AdminEnquiry[]; canManage: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const requests = useMemo(() => enquiries.filter((item) => !["confirmed","cancelled","declined"].includes(item.status)), [enquiries]);
  const filtered = useMemo(() => requests.filter((item) => {
    const matchesQuery = !query || [item.fullName, item.phone, item.email, item.depositReference].some((value) => value?.toLowerCase().includes(query.toLowerCase()));
    const matchesStatus = status === "all" || status === "active" || item.status === status || item.depositStatus === status;
    return matchesQuery && matchesStatus;
  }), [requests, query, status]);

  return <section id="booking-requests" className={styles.panel} aria-labelledby="booking-requests-title">
    <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Guest website</p><h2 id="booking-requests-title">Booking requests</h2></div><span className={styles.countBadge}>{requests.length} awaiting action</span></div>
    <div className={styles.bookingFilters}>
      <label><span>Search bookings</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Guest, phone, email, or transfer reference" /></label>
      <label><span>Show</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">All active requests</option><option value="pending">Pending</option><option value="contacted">Contacted</option><option value="submitted">Deposit submitted</option></select></label>
    </div>
    {filtered.length ? <div className={`${styles.reservationList} ${styles.bookingRequestList}`}>{filtered.map((item) => <article key={item.id}>
      <div><strong>{item.fullName}</strong><small><a href={`tel:${item.phone}`}>{item.phone}</a>{item.email ? <> · <a href={`mailto:${item.email}`}>{item.email}</a></> : null}</small><small>Preferred: {item.preferredContact}</small><details className={styles.bookingDetails}><summary>View booking details</summary><dl><div><dt>Booking ID</dt><dd>{item.id}</dd></div><div><dt>Stay</dt><dd>{formatStayRange(item.checkIn,item.checkOut)}</dd></div><div><dt>Guests</dt><dd>{item.guestCount}</dd></div><div><dt>Bedroom access</dt><dd>{item.guestCount>=4?"2 bedrooms":"1 bedroom"}</dd></div><div><dt>Deposit</dt><dd>{item.depositStatus.replaceAll("_", " ")}</dd></div></dl></details></div>
      <div><span>{formatStayRange(item.checkIn,item.checkOut)}</span><small>{item.guestCount} guest{item.guestCount === 1 ? "" : "s"} · {item.guestCount>=4?"2 bedrooms":"1 bedroom"}</small>{item.depositReference ? <small>Transfer: {item.depositReference} · {item.depositSenderName}{item.depositSubmittedAt ? ` · ${new Date(item.depositSubmittedAt).toLocaleString("en-PH", { dateStyle:"long", timeStyle:"short" })}` : ""}</small> : null}{item.depositRefundReference ? <small>Refund: {item.depositRefundReference}</small> : null}</div>
      <div className={styles.depositColumn}><b data-status={item.status}>{item.status}</b><span className={styles.depositBadge} data-status={item.depositStatus}>{item.depositStatus.replaceAll("_", " ")}</span><DepositControls bookingId={item.id} bookingStatus={item.status} depositStatus={item.depositStatus} canManage={canManage} /></div>
    </article>)}</div> : <div className={styles.emptyState}><span aria-hidden="true">⌁</span><h3>No matching booking requests</h3><p>Try another search or status filter.</p></div>}
  </section>;
}
