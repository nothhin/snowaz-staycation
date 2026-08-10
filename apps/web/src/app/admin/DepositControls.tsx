"use client";

import { useActionState, useState } from "react";
import { markDepositRefunded, startDepositRequest, verifyDeposit, type DepositActionState } from "./actions";

const initialState: DepositActionState = { status: "idle" };

export function DepositControls({ bookingId, depositStatus, canManage }: { bookingId: string; depositStatus: string; canManage: boolean }) {
  const [startState, startAction, startPending] = useActionState(startDepositRequest, initialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyDeposit, initialState);
  const [refundState, refundAction, refundPending] = useActionState(markDepositRefunded, initialState);
  const [copied, setCopied] = useState(false);
  const result = startState.status === "success" ? startState : verifyState.status === "error" ? verifyState : refundState;

  if (!canManage) return <small>Manager verification required</small>;
  if (startState.status === "success" && startState.link) return <div className="deposit-admin-actions"><a href={startState.link} target="_blank" rel="noreferrer">Open guest deposit page</a><button type="button" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${startState.link}`); setCopied(true); }}>{copied ? "Link copied" : "Copy guest link"}</button><small>Send this private link to the guest. Generating a new link invalidates this one.</small></div>;

  return <div className="deposit-admin-actions">
    {depositStatus === "not_requested" || depositStatus === "awaiting_payment" ? <form action={startAction}><input type="hidden" name="bookingId" value={bookingId} /><button disabled={startPending}>{startPending ? "Preparing…" : depositStatus === "awaiting_payment" ? "Generate new deposit link" : "Approve & prepare deposit"}</button></form> : null}
    {depositStatus === "submitted" ? <form action={verifyAction}><input type="hidden" name="bookingId" value={bookingId} /><button disabled={verifyPending}>{verifyPending ? "Verifying…" : "Verify in MariBank & confirm"}</button></form> : null}
    {depositStatus === "verified" || depositStatus === "refund_pending" ? <form action={refundAction}><input type="hidden" name="bookingId" value={bookingId} /><input name="refundReference" placeholder="Refund reference" required minLength={6} maxLength={80} /><button disabled={refundPending}>{refundPending ? "Saving…" : "Mark refunded"}</button></form> : null}
    {result.status === "error" ? <small role="alert">{result.message}</small> : null}
  </div>;
}
