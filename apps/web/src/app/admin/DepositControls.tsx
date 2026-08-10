"use client";

import { useActionState, useEffect, useState } from "react";
import { markDepositRefunded, recordAndVerifyDeposit, startDepositRequest, updateBookingRequestStatus, verifyDeposit, type DepositActionState } from "./actions";
import { confirmAction, showError, showSuccess } from "@/lib/sweetalert";

const initialState: DepositActionState = { status: "idle" };

export function DepositControls({ bookingId, bookingStatus = "pending", depositStatus, canManage }: { bookingId: string; bookingStatus?: string; depositStatus: string; canManage: boolean }) {
  const [startState, startAction, startPending] = useActionState(startDepositRequest, initialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyDeposit, initialState);
  const [recordState, recordAction, recordPending] = useActionState(recordAndVerifyDeposit, initialState);
  const [refundState, refundAction, refundPending] = useActionState(markDepositRefunded, initialState);
  const [statusState, statusAction, statusPending] = useActionState(updateBookingRequestStatus, initialState);
  const [copied, setCopied] = useState(false);
  const result = [startState, verifyState, recordState, refundState, statusState].findLast((item) => item.status !== "idle") ?? initialState;

  useEffect(() => {
    if (result.status === "success") {
      window.dispatchEvent(new Event("snowaz:admin-changed"));
      if (result.message) void showSuccess(result.message);
    } else if (result.status === "error" && result.message) void showError(result.message);
  }, [result.status, result.message, result.link]);

  const confirmStatusChange = async (event: React.FormEvent<HTMLFormElement>, kind: "decline" | "cancel") => {
    const form = event.currentTarget;
    if (form.dataset.confirmed === "true") return;
    event.preventDefault();
    const confirmed = await confirmAction(
      kind === "decline" ? "Decline this request?" : "Cancel this booking?",
      kind === "decline" ? "The dates will reopen for other guests." : "The confirmed stay will be cancelled and its dates will reopen. If a real deposit was received, it will move to refund pending.",
      kind === "decline" ? "Decline request" : "Cancel booking",
    );
    if (confirmed) { form.dataset.confirmed = "true"; form.requestSubmit(); }
  };

  const confirmPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    if (form.dataset.confirmed === "true") return;
    event.preventDefault();
    const confirmed = await confirmAction("Confirm this ₱1,000 payment?", "Only continue after matching the sender and transaction reference in MariBank. This will confirm the booking and block its dates.", "Confirm payment");
    if (confirmed) { form.dataset.confirmed = "true"; form.requestSubmit(); }
  };

  if (!canManage) return <small>Manager verification required</small>;
  if (startState.status === "success" && startState.link) return <div className="deposit-admin-actions"><a href={startState.link} target="_blank" rel="noreferrer">Open guest deposit page</a><button type="button" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${startState.link}`); setCopied(true); void showSuccess("Private guest link copied."); }}>{copied ? "Link copied" : "Copy guest link"}</button><small>Send this private link to the guest. Generating a new link invalidates this one.</small></div>;

  const active = !["cancelled", "declined"].includes(bookingStatus);
  return <div className="deposit-admin-actions">
    {active && depositStatus === "not_requested" ? <form action={startAction}><input type="hidden" name="bookingId" value={bookingId} /><button disabled={startPending}>{startPending ? "Preparing…" : "Prepare legacy deposit link"}</button></form> : null}
    {active && depositStatus === "awaiting_payment" ? <form action={recordAction} className="deposit-record-form" onSubmit={(event) => { void confirmPayment(event); }}><input type="hidden" name="bookingId" value={bookingId} /><small>For a receipt received through Messenger, verify it in MariBank first.</small><input name="senderName" placeholder="Sender/account name" required minLength={2} maxLength={120} /><input name="paymentReference" placeholder="Transaction reference" required minLength={6} maxLength={80} /><button disabled={recordPending}>{recordPending ? "Recording…" : "Record payment & confirm"}</button></form> : null}
    {active && depositStatus === "submitted" ? <form action={verifyAction} onSubmit={(event) => { void confirmPayment(event); }}><input type="hidden" name="bookingId" value={bookingId} /><button disabled={verifyPending}>{verifyPending ? "Verifying…" : "Verify in MariBank & confirm"}</button></form> : null}
    {depositStatus === "verified" || depositStatus === "refund_pending" ? <form action={refundAction}><input type="hidden" name="bookingId" value={bookingId} /><input name="refundReference" placeholder="Refund reference" required minLength={6} maxLength={80} /><button disabled={refundPending}>{refundPending ? "Saving…" : "Mark refunded"}</button></form> : null}
    {bookingStatus === "pending" || bookingStatus === "contacted" ? <form action={statusAction} onSubmit={(event) => { void confirmStatusChange(event, "decline"); }}><input type="hidden" name="bookingId" value={bookingId} /><input type="hidden" name="status" value="declined" /><button className="deposit-danger" disabled={statusPending}>Decline request</button></form> : null}
    {bookingStatus === "confirmed" ? <form action={statusAction} onSubmit={(event) => { void confirmStatusChange(event, "cancel"); }}><input type="hidden" name="bookingId" value={bookingId} /><input type="hidden" name="status" value="cancelled" /><button className="deposit-danger" disabled={statusPending}>{statusPending ? "Cancelling…" : "Cancel confirmed stay"}</button><small>Use this if the payment is false, invalid, or the confirmed stay must be cancelled.</small></form> : null}
  </div>;
}
