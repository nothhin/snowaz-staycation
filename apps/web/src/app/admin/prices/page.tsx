import Link from "next/link";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/server/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminNav, AdminMobileNav } from "../AdminNav";
import { PriceEditor, type PriceRow } from "./PriceEditor";
import { formatPhpMinor, type PriceKey } from "@casa-marga/shared/pricing";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Price Management | SnowAZ Staycation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
type HistoryRow = { key: PriceKey; old_amount_minor: number; new_amount_minor: number; changed_at: string; changed_by_email?: string | null; note?: string | null };

export default async function PriceManagementPage() {
  const staff = await requireStaff(["admin"]);
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("staff_get_snowaz_price_management");
  if (error || !data) throw new Error("Price Management is unavailable.");
  const payload = data as { prices: PriceRow[]; history: HistoryRow[] };
  const mobileClasses = { button: styles.mobileMenu, backdrop: styles.mobileBackdrop, drawer: styles.mobileDrawer, drawerOpen: styles.mobileDrawerOpen, drawerHeader: styles.mobileDrawerHeader, closeButton: styles.mobileCloseButton, active: styles.mobileActiveNav };
  return <main className={styles.dashboardShell}>
    <aside className={styles.sidebar}><Link className={styles.adminBrand} href="/admin"><strong>SnowAZ</strong></Link><AdminNav activeClassName={styles.activeNav} /></aside>
    <section className={styles.workspace}><header className={styles.topbar}><AdminMobileNav classes={mobileClasses} /><div><span>Property admin</span><strong>Price Management</strong></div><div className={styles.adminIdentity}><strong>{staff.email}</strong></div></header>
      <div className={styles.content}><section className={styles.welcome}><div><p className={styles.eyebrow}>Live pricing</p><h1>Price Management.</h1><p>Changes apply to new bookings. Existing booking prices remain as agreed.</p></div><Link href="/admin">Back to dashboard</Link></section>
        <PriceEditor rows={payload.prices} editable={staff.role === "admin"} />
        <section className={styles.priceManageHistory}><h2>Price history</h2><div>{payload.history.map((item, index) => <article key={`${item.key}-${item.changed_at}-${index}`}><strong>{item.key.replaceAll("_", " ")}</strong><span>{formatPhpMinor(item.old_amount_minor)} → {formatPhpMinor(item.new_amount_minor)}</span><small>{new Date(item.changed_at).toLocaleString("en-PH")}{item.changed_by_email ? ` · ${item.changed_by_email}` : ""}{item.note ? ` · ${item.note}` : ""}</small></article>)}</div></section>
      </div></section>
  </main>;
}
