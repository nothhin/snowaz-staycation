import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { hashDepositToken, isValidDepositToken } from "@/lib/server/deposit-token";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import qrImage from "@/assets/maribank-deposit-qr.png";
import { submitDepositReference } from "./actions";
import styles from "./deposit.module.css";

export const metadata: Metadata = { title: "Security deposit | SnowAZ Staycation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

export default async function DepositPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ submitted?: string; error?: string }> }) {
  const { token } = await params;
  const query = await searchParams;
  if (!isValidDepositToken(token)) return <InvalidDepositLink />;
  const supabase = createPublicSupabaseClient();
  if (!supabase) throw new Error("Deposit service is unavailable.");
  const { data, error } = await supabase.rpc("get_snowaz_deposit_request", { token_hash: hashDepositToken(token) });
  if (error) throw new Error("Deposit service is unavailable.");
  const row = Array.isArray(data) ? data[0] : null;
  const request = row ? { fullName: row.full_name as string, checkIn: row.check_in as string, checkOut: row.check_out as string, guestCount: row.guest_count as number, depositStatus: row.deposit_status as string, depositAmountMinor: Number(row.deposit_amount_minor), depositTokenExpiresAt: row.deposit_token_expires_at ? new Date(row.deposit_token_expires_at as string) : null } : null;
  if (!request || !request.depositTokenExpiresAt || request.depositTokenExpiresAt <= new Date() && request.depositStatus === "awaiting_payment") return <InvalidDepositLink />;
  const finished = ["submitted", "verified", "refund_pending", "refunded", "partially_withheld", "forfeited"].includes(request.depositStatus);
  return <main className={styles.shell}><header><Link href="/">SnowAZ Staycation</Link><span>Private deposit instructions</span></header><article className={styles.card}>
    <p className={styles.eyebrow}>Approved booking request</p><h1>{finished ? request.depositStatus === "refunded" ? "Deposit refunded." : "Payment details received." : "Secure your stay."}</h1>
    <div className={styles.booking}><strong>{request.fullName}</strong><span>{request.checkIn} → {request.checkOut} · {request.guestCount} guest{request.guestCount === 1 ? "" : "s"}</span></div>
    {finished ? <section className={styles.complete}><span aria-hidden="true">✓</span><h2>{request.depositStatus === "verified" ? "Deposit verified—your booking is confirmed." : request.depositStatus === "refunded" ? "Your refund has been recorded." : "SnowAZ is verifying your transfer."}</h2><p>Keep your bank receipt. SnowAZ will contact you directly if any additional information is needed.</p></section> : <>
      <section className={styles.instructions}><h2>Pay {php.format(request.depositAmountMinor / 100)} through InstaPay</h2><ol><li>Open your bank or e-wallet and scan the MariBank QR.</li><li>Confirm the recipient is <strong>Merry Shien Gepitulan</strong>, MariBank account ending in <strong>5650</strong>.</li><li>Enter exactly <strong>₱1,000</strong> and complete the transfer.</li><li>Return here and submit the sender name and transaction reference.</li></ol><p>Never share your PIN, OTP, password, or full banking credentials with SnowAZ.</p></section>
      <div className={styles.qr}><Image src={qrImage} alt="MariBank InstaPay QR for Merry Shien Gepitulan, account ending 5650" priority sizes="(max-width: 520px) 86vw, 420px" /></div>
      <form action={submitDepositReference} className={styles.form}><input type="hidden" name="token" value={token} /><label><span>Sender/account name</span><input name="senderName" autoComplete="name" required maxLength={120} /></label><label><span>Transaction reference number</span><input name="reference" required minLength={6} maxLength={80} /></label><label className={styles.check}><input name="confirmedAmount" type="checkbox" value="1000" required /><span>I sent exactly ₱1,000 and understand that SnowAZ will verify it in MariBank before confirming the reservation.</span></label>{query.error ? <p className={styles.error} role="alert">We could not save those details. Check the information or request a new private link from SnowAZ.</p> : null}<button type="submit">Submit payment reference</button></form>
    </>}
    <footer><p>This is a refundable security deposit, subject to checkout inspection and documented house-rule charges.</p><a href="https://wa.me/639952606412" target="_blank" rel="noreferrer">Need help? Contact SnowAZ</a></footer>
  </article></main>;
}

function InvalidDepositLink() { return <main className={styles.shell}><article className={styles.card}><p className={styles.eyebrow}>Private link unavailable</p><h1>Request a new deposit link.</h1><p>This link is invalid or expired. Contact SnowAZ through the official number before sending money.</p><Link className={styles.helpLink} href="/">Return to SnowAZ</Link></article></main>; }
