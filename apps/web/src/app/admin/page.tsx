import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { propertyProfile } from "@/lib/property";
import { requireStaff } from "@/lib/server/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { AdminMobileNav, AdminNav } from "./AdminNav";
import { AdminLiveRefresh } from "./AdminLiveRefresh";
import { AdminFlashAlert } from "./AdminFlashAlert";
import { AdminCalendar } from "./AdminCalendar";
import {
  BookingRequestsPanel,
  type AdminEnquiry,
} from "./BookingRequestsPanel";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Property admin | SnowAZ Staycation",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
type DashboardData = { enquiries: AdminEnquiry[] };
const mobileClasses = (styles: { [key: string]: string }) => ({
  button: styles.mobileMenu,
  backdrop: styles.mobileBackdrop,
  drawer: styles.mobileDrawer,
  drawerOpen: styles.mobileDrawerOpen,
  drawerHeader: styles.mobileDrawerHeader,
  closeButton: styles.mobileCloseButton,
  active: styles.mobileActiveNav,
});

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const staff = await requireStaff();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_snowaz_admin_dashboard");
  if (error || !data) throw new Error("Admin data is unavailable.");
  const { enquiries } = data as DashboardData;
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: propertyProfile.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const active = enquiries.filter(
    (item) => !["cancelled", "declined"].includes(item.status),
  );
  const confirmed = active.filter((item) => item.status === "confirmed");
  const requests = active.filter((item) => item.status !== "confirmed");
  const arrivals = confirmed.filter((item) => item.checkIn === today).length;
  const staying = confirmed.filter(
    (item) => item.checkIn <= today && item.checkOut > today,
  ).length;
  const canManage = ["admin", "manager"].includes(staff.role);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: propertyProfile.timezone,
  }).format(now);
  const fullDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: propertyProfile.timezone,
  }).format(now);
  return (
    <main className={styles.dashboardShell}>
      <aside className={styles.sidebar}>
        <Link className={styles.adminBrand} href="/">
          <Image src="/images/snowaz/logo.jpg" alt="" width={48} height={48} />
          <div>
            <strong>SnowAZ</strong>
            <small>Property admin</small>
          </div>
        </Link>
        <AdminNav activeClassName={styles.activeNav} />
        <div className={styles.sidebarFooter}>
          <span className={styles.statusDot} />
          <div>
            <strong>Live operations</strong>
            <AdminLiveRefresh />
          </div>
        </div>
      </aside>
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <AdminMobileNav classes={mobileClasses(styles)} />
          <div>
            <span>{weekday}</span>
            <strong>{fullDate}</strong>
          </div>
          <div className={styles.adminIdentity}>
            <span>{staff.email.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{staff.email}</strong>
              <small>{staff.role.replace("_", " ")}</small>
            </div>
            <form action={signOut}>
              <button type="submit">Sign out</button>
            </form>
          </div>
        </header>
        <div className={styles.content}>
          <AdminFlashAlert saved={params.saved} error={params.error} />
          <section id="overview" className={styles.welcome}>
            <div>
              <p className={styles.eyebrow}>SnowAZ operations</p>
              <h1>Good day.</h1>
              <p>One condo, one live calendar, and one clear guest workflow.</p>
            </div>
            <div className={styles.liveBadge}>
              <strong>System online</strong>
              <span>
                Changes from guests and staff appear automatically without
                reloading.
              </span>
            </div>
          </section>
      <section className={styles.metricsGrid} aria-label="Property summary">
            {[
              {
                label: "Booking requests",
                value: requests.length,
                note: "Awaiting admin action",
              },
              {
                label: "Confirmed stays",
                value: confirmed.length,
                note: "Verified bookings",
              },
              {
                label: "Arrivals today",
                value: arrivals,
                note: "Confirmed arrivals",
              },
              {
                label: "Currently staying",
                value: staying,
                note: "Guests in the condo",
              },
            ].map((metric) => (
              <article key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.note}</small>
              </article>
            ))}
      </section>
      <Link className={styles.confirmedStaysButton} href="/admin/confirmed">
        Open confirmed stays <span>{confirmed.length}</span>
      </Link>
      <BookingRequestsPanel enquiries={enquiries} canManage={canManage} />
          <AdminCalendar bookings={enquiries} />
          <section
            id="guest-rules"
            className={styles.adminSectionGrid}
            aria-label="SnowAZ operating rules"
          >
            <article className={styles.compactPanel}>
              <p className={styles.eyebrow}>Stay rates</p>
              <h2>1BR or 2BR pricing</h2>
              <p>
                1BR is ₱1,800/night for up to two guests. 2BR is ₱2,300/night
                for up to four guests, plus ₱300 per additional guest/night.
              </p>
              <span>Maximum 8 guests</span>
            </article>
            <article className={styles.compactPanel}>
              <p className={styles.eyebrow}>Deposit policy</p>
              <h2>₱1,000 down payment</h2>
              <p>
                Verify every payment in MariBank. The down payment is deducted
                from the guest’s total accommodation payment.
              </p>
              <span>Manual bank verification</span>
            </article>
            <article className={styles.compactPanel}>
              <p className={styles.eyebrow}>House rules</p>
              <h2>Quiet hours: 11 PM–7 AM</h2>
              <p>
                Commercial photography is allowed. No smoking inside—the stated
                penalty is ₱5,000. At checkout, gather towels, discard trash,
                turn things off, return the keys, and lock up.
              </p>
              <span>Rules must be acknowledged</span>
            </article>
          </section>
          <section id="settings" className={styles.compactPanel}>
            <p className={styles.eyebrow}>Property settings</p>
            <h2>SnowAZ Staycation</h2>
            <p>{propertyProfile.address}</p>
            <span>Single-condo mode · {propertyProfile.timezone}</span>
          </section>
        </div>
      </section>
    </main>
  );
}
