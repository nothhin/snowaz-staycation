"use client";

import { useActionState, useEffect, useState } from "react";
import { markDepositRefunded, startDepositRequest, updateBookingRequestStatus, verifyDeposit, type DepositActionState } from "./actions";

const initialState: DepositActionState = { status: "idle" };

export function DepositControls({ bookingId, bookingStatus = "pending", depositStatus, canManage }: { bookingId: string; bookingStatus?: string; depositStatus: string; canManage: boolean }) {
  const [startState, startAction, startPending] = useActionState(startDepositRequest, initialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyDeposit, initialState);
  const [refundState, refundAction, refundPending] = useActionState(markDepositRefunded, initialState);
  const [statusState, statusAction, statusPending] = useActionState(updateBookingRequestStatus, initialState);
  const [copied, setCopied] = useState(false);
  const result = [startState, verifyState, refundState, statusState].findLast((item) => item.status !== "idle") ?? initialState;

  useEffect(() => {
    if (result.status === "success") window.dispatchEvent(new Event("snowaz:admin-changed"));
  }, [result.status, result.message, result.link]);

  if (!canManage) return <small>Manager verification required</small>;
  if (startState.status === "success" && startState.link) return <div className="deposit-admin-actions"><a href={startState.link} target="_blank" rel="noreferrer">Open guest deposit page</a><button type="button" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${startState.link}`); setCopied(true); }}>{copied ? "Link copied" : "Copy guest link"}</button><small>Send this private link to the guest. Generating a new link invalidates this one.</small></div>;

  const active = !["cancelled", "declined"].includes(bookingStatus);
  return <div className="deposit-admin-actions">
    {active && (depositStatus === "not_requested" || depositStatus === "awaiting_payment") ? <form action={startAction}><input type="hidden" name="bookingId" value={bookingId} /><button disabled={startPending}>{startPending ? "Preparing…" : depositStatus === "awaiting_payment" ? "Generate new deposit link" : "Approve & prepare deposit"}</button></form> : null}
    {active && depositStatus === "submitted" ? <form action={verifyAction}><input type="hidden" name="bookingId" value={bookingId} /><button disabled={verifyPending}>{verifyPending ? "Verifying…" : "Verify in MariBank & confirm"}</button></form> : null}
    {depositStatus === "verified" || depositStatus === "refund_pending" ? <form action={refundAction}><input type="hidden" name="bookingId" value={bookingId} /><input name="refundReference" placeholder="Refund reference" required minLength={6} maxLength={80} /><button disabled={refundPending}>{refundPending ? "Saving…" : "Mark refunded"}</button></form> : null}
    {bookingStatus === "pending" || bookingStatus === "contacted" ? <form action={statusAction} onSubmit={(event) => { if (!window.confirm("Decline this booking request and reopen its dates?")) event.preventDefault(); }}><input type="hidden" name="bookingId" value={bookingId} /><input type="hidden" name="status" value="declined" /><button className="deposit-danger" disabled={statusPending}>Decline request</button></form> : null}
    {bookingStatus === "confirmed" ? <form action={statusAction} onSubmit={(event) => { if (!window.confirm("Cancel this confirmed booking? A verified deposit will be marked for refund.")) event.preventDefault(); }}><input type="hidden" name="bookingId" value={bookingId} /><input type="hidden" name="status" value="cancelled" /><button className="deposit-danger" disabled={statusPending}>Cancel booking</button></form> : null}
    {result.status === "error" || (result.status === "success" && result.message) ? <small role={result.status === "error" ? "alert" : "status"}>{result.message}</small> : null}
  </div>;
}
