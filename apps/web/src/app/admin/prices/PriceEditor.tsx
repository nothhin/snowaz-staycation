"use client";

import { useActionState, useEffect, useState } from "react";
import { formatPhpMinor, type PriceKey } from "@casa-marga/shared/pricing";
import { confirmAction, showError, showSuccess } from "@/lib/sweetalert";
import { updatePrice, type PriceActionState } from "./actions";
import styles from "../admin.module.css";

export type PriceRow = { key: PriceKey; amount_minor: number; version: number; updated_at: string; updated_by_email?: string | null };
const descriptors: Record<PriceKey, [string, string, string]> = {
  bedroom_1_nightly_rate: ["Bedroom 1", "1–2 guests", "per night"],
  bedroom_2_nightly_rate: ["Bedroom 2", "2 guests; third guest fee applies", "per night"],
  both_bedrooms_nightly_rate: ["Both bedrooms", "4–5 guests", "per night"],
  additional_guest_nightly_rate: ["Additional guest", "Bedroom 2 third guest or both bedrooms sixth guest", "per guest/night"],
  car_parking_nightly_rate: ["Car parking", "Optional overnight parking", "per night"],
  motorcycle_parking_nightly_rate: ["Motorcycle parking", "Optional overnight parking", "per night"],
  early_checkin_hourly_rate: ["Early check-in", "Subject to availability", "per hour"],
  late_checkout_hourly_rate: ["Late checkout", "Up to three hours, subject to availability", "per hour"],
  refundable_security_deposit: ["Refundable security deposit", "Held separately from accommodation", "per booking"],
  no_smoking_penalty: ["No-smoking penalty", "House-rule penalty", "per violation"],
};

function PriceCard({ row, editable }: { row: PriceRow; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState((row.amount_minor / 100).toFixed(2));
  const [state, action, pending] = useActionState(updatePrice, { status: "idle", message: "" } satisfies PriceActionState);
  useEffect(() => {
    if (state.status === "success") { void showSuccess(state.message); window.location.reload(); }
    if (state.status === "error") void showError(state.message);
  }, [state]);
  const [name, description, unit] = descriptors[row.key];
  return <article className={styles.priceManageCard}>
    <div><small>{unit} · PHP</small><h2>{name}</h2><p>{description}</p></div>
    <strong>{formatPhpMinor(row.amount_minor)}</strong>
    <small>Updated {new Date(row.updated_at).toLocaleString("en-PH")}{row.updated_by_email ? ` · ${row.updated_by_email}` : ""}</small>
    {editable && !editing ? <button type="button" onClick={() => setEditing(true)}>Edit price</button> : null}
    {editing ? <form action={action} onSubmit={async event => {
      const form = event.currentTarget;
      if (form.dataset.confirmed === "yes") return;
      event.preventDefault();
      const confirmed = await confirmAction(`Change ${name}?`, `${formatPhpMinor(row.amount_minor)} → ${formatPhpMinor(Math.round(Number(amount) * 100))}. This applies to new bookings only.`, "Save new price");
      if (confirmed) { form.dataset.confirmed = "yes"; form.requestSubmit(); }
    }}>
      <input type="hidden" name="key" value={row.key} /><input type="hidden" name="version" value={row.version} />
      <label>New price (PHP)<input name="amount" type="number" min="0" max="999999.99" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <p>Preview: {Number.isFinite(Number(amount)) ? formatPhpMinor(Math.round(Number(amount) * 100)) : "Enter an amount"} {unit}</p>
      <label>Reason (optional)<input name="note" maxLength={300} placeholder="Reason for this change" /></label>
      <div><button type="button" disabled={pending} onClick={() => setEditing(false)}>Cancel</button><button type="submit" disabled={pending || amount.trim() === ""}>{pending ? "Saving…" : "Review and save"}</button></div>
    </form> : null}
  </article>;
}

export function PriceEditor({ rows, editable }: { rows: PriceRow[]; editable: boolean }) {
  return <div className={styles.priceManageGrid}>{rows.map(row => <PriceCard key={row.key} row={row} editable={editable} />)}</div>;
}
