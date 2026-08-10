import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { propertyProfile } from "@/lib/property";
import { requireStaff } from "@/lib/server/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addPhysicalRoom, signOut, updateRoomStatus, updateRoomType } from "./actions";
import { AdminMobileNav, AdminNav } from "./AdminNav";
import { AdminLiveRefresh } from "./AdminLiveRefresh";
import { BookingRequestsPanel, type AdminEnquiry } from "./BookingRequestsPanel";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Property admin | SnowAZ Staycation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type DashboardData = {
  templates: Array<{ id:string; name:string; slug:string; maxAdults:number; maxChildren:number; baseNightlyRateMinor:number; displayOrder:number; status:"draft"|"published"|"archived" }>;
  inventory: Array<{ id:string; roomNumber:string; floor:string|null; status:"available"|"maintenance"|"out_of_service"; roomTypeName:string }>;
  upcoming: Array<{ id:string; checkIn:string; checkOut:string; status:"confirmed"|"checked_in"; guestCount:number; totalMinor:number; currency:string; guestName:string; roomNumber:string; roomTypeName:string }>;
  enquiries: AdminEnquiry[];
};

const roomImages: Record<string, string> = {
  "deluxe-queen-room": "/images/snowaz/dining.jpg",
  "superior-queen-room": "/images/snowaz/dining-wide.jpg",
  "deluxe-double-or-twin-room": "/images/snowaz/hero.jpg",
  "king-room-with-balcony": "/images/snowaz/detail.jpg",
};

const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const staff = await requireStaff();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: propertyProfile.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

  const { data, error } = await supabase.rpc("get_snowaz_admin_dashboard");
  if (error || !data) throw new Error("Admin data is unavailable.");
  const dashboard = data as DashboardData;
  const { templates, inventory, upcoming, enquiries } = dashboard;
  const summary = [{ totalRooms: inventory.length, availableRooms: inventory.filter((room) => room.status === "available").length }];
    console.info("[admin-dashboard] operational data loaded", { templates: templates.length, rooms: inventory.length, reservations: upcoming.length });

    const arrivals = upcoming.filter((item) => item.checkIn === today).length;
    const staying = upcoming.filter((item) => item.status === "checked_in" || (item.checkIn <= today && item.checkOut > today)).length;
    const available = Math.max(0, summary[0].availableRooms - staying);
    const occupancy = summary[0].availableRooms ? Math.round((staying / summary[0].availableRooms) * 100) : 0;
    const canManage = staff.role === "admin" || staff.role === "manager";
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: propertyProfile.timezone }).format(now);
    const fullDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: propertyProfile.timezone }).format(now);

    return <main className={styles.dashboardShell}>
      <aside className={styles.sidebar}>
        <Link className={styles.adminBrand} href="/"><span>AZ</span><div><strong>SnowAZ</strong><small>Property admin</small></div></Link>
        <AdminNav activeClassName={styles.activeNav} />
        <div className={styles.sidebarFooter}><span className={styles.statusDot} /><div><strong>Live operations</strong><AdminLiveRefresh /></div></div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <AdminMobileNav classes={{ button: styles.mobileMenu, backdrop: styles.mobileBackdrop, drawer: styles.mobileDrawer, drawerOpen: styles.mobileDrawerOpen, drawerHeader: styles.mobileDrawerHeader, closeButton: styles.mobileCloseButton, active: styles.mobileActiveNav }} />
          <div><span>{weekday}</span><strong>{fullDate}</strong></div>
          <div className={styles.adminIdentity}><span>{staff.email.slice(0, 2).toUpperCase()}</span><div><strong>{staff.email}</strong><small>{staff.role.replace("_", " ")}</small></div><form action={signOut}><button type="submit">Sign out</button></form></div>
        </header>

        <div className={styles.content}>
          {params.saved ? <div className={styles.successNotice} role="status">Changes saved successfully.</div> : null}
          {params.error ? <div className={styles.errorNotice} role="alert">The requested change could not be completed. Check the values and your access level.</div> : null}
          <section id="overview" className={styles.welcome}><div><p className={styles.eyebrow}>Operations overview</p><h1>Good day.</h1><p>Live property activity for SnowAZ Staycation, Mandaue City.</p></div><div className={styles.liveBadge}><strong>System online</strong><span>Guest availability and admin inventory share one source of truth.</span></div></section>

          <section className={styles.metricsGrid} aria-label="Property summary">
            {[{ label: "Arrivals today", value: arrivals, note: "Confirmed arrivals" }, { label: "Currently staying", value: staying, note: "In-house guests" }, { label: "Available rooms", value: available, note: `${summary[0].totalRooms} physical rooms configured` }, { label: "Occupancy", value: `${occupancy}%`, note: "Based on active inventory" }].map((metric) => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></article>)}
          </section>

          <BookingRequestsPanel enquiries={enquiries} canManage={canManage} />

          <div className={styles.twoColumn}>
            <section id="reservations" className={styles.panel}>
              <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Front desk</p><h2>Upcoming stays</h2></div><span className={styles.countBadge}>{upcoming.length} active</span></div>
              {upcoming.length ? <div className={styles.reservationList}>{upcoming.slice(0, 8).map((item) => <article key={item.id}><div><strong>{item.guestName}</strong><small>{item.roomNumber} · {item.roomTypeName}</small></div><div><span>{item.checkIn} → {item.checkOut}</span><small>{item.guestCount} guest{item.guestCount === 1 ? "" : "s"} · {php.format(item.totalMinor / 100)}</small></div><b data-status={item.status}>{item.status.replace("_", " ")}</b></article>)}</div> : <div className={styles.emptyState}><span aria-hidden="true">⌁</span><h3>No active reservations</h3><p>New guest and staff reservations will appear here automatically.</p></div>}
            </section>
            <section id="calendar" className={`${styles.panel} ${styles.activityPanel}`}>
              <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Readiness</p><h2>Owner approvals</h2></div></div>
              <ul className={styles.checklist}>
                <li><span>1</span><div><strong>Approve nightly prices</strong><small>Publish only after owner confirmation</small></div><b>{templates.filter((room) => room.status !== "published").length} open</b></li>
                <li><span>2</span><div><strong>Confirm physical rooms</strong><small>Replace provisional inventory labels</small></div><b>{inventory.filter((room) => room.roomNumber.startsWith("PROVISIONAL-")).length} open</b></li>
                <li><span>3</span><div><strong>Confirm cancellation policy</strong><small>Required before direct reservations launch</small></div><b>Required</b></li>
                <li><span>4</span><div><strong>Enable MFA for staff</strong><small>Recommended before owner handover</small></div><b>Security</b></li>
              </ul>
            </section>
          </div>

          <section id="room-templates" className={styles.ratesSection}>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Room templates</p><h2>Room types and base rates</h2></div><p>Rates are stored in Philippine pesos. Only published templates with active physical rooms are visible to guests.</p></div><span id="rates" className={styles.anchorTarget} aria-hidden="true" />
            <div className={styles.rateGrid}>{templates.map((room) => <article className={styles.rateCard} key={room.id}>
              <div className={styles.rateImage}><Image src={roomImages[room.slug] || "/images/snowaz/hero.jpg"} alt="" fill sizes="(max-width: 900px) 100vw, 25vw" /></div>
              <form action={updateRoomType} className={styles.rateContent}><input type="hidden" name="id" value={room.id} /><span>Up to {room.maxAdults + room.maxChildren} guests · {room.status}</span><h3>{room.name}</h3>
                <label><span>Base nightly rate</span><div className={styles.priceInput}><b>₱</b><input name="rate" type="number" min="0" step="1" defaultValue={room.baseNightlyRateMinor / 100} required disabled={!canManage} /></div></label>
                <label><span>Guest visibility</span><select name="status" defaultValue={room.status} disabled={!canManage}><option value="draft">Draft — hidden</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
                <button type="submit" disabled={!canManage}>{canManage ? "Save room template" : "Manager access required"}</button>
              </form>
            </article>)}</div>
          </section>

          <section id="physical-rooms" className={styles.inventorySection}>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Inventory</p><h2>Physical rooms</h2></div><p>Each sellable room must belong to one reusable room template.</p></div>
            {canManage ? <form action={addPhysicalRoom} className={styles.addRoomForm}><label><span>Room number</span><input name="roomNumber" placeholder="e.g. 101" required /></label><label><span>Room template</span><select name="roomTypeId" required>{templates.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label><span>Floor / area</span><input name="floor" placeholder="Ground floor" /></label><label><span>Initial status</span><select name="status" defaultValue="out_of_service"><option value="available">Available</option><option value="maintenance">Maintenance</option><option value="out_of_service">Out of service</option></select></label><button type="submit">Add physical room</button></form> : null}
            <div className={styles.tableWrap}><table><thead><tr><th>Room number</th><th>Room template</th><th>Floor/area</th><th>Status</th><th>Action</th></tr></thead><tbody>{inventory.length ? inventory.map((room) => <tr key={room.id}><td><strong>{room.roomNumber}</strong></td><td>{room.roomTypeName}</td><td>{room.floor || "—"}</td><td><span className={styles.roomStatus} data-status={room.status}>{room.status.replaceAll("_", " ")}</span></td><td>{canManage ? <form action={updateRoomStatus} className={styles.inlineForm}><input type="hidden" name="id" value={room.id} /><select name="status" defaultValue={room.status}><option value="available">Available</option><option value="maintenance">Maintenance</option><option value="out_of_service">Out of service</option></select><button type="submit">Update</button></form> : "View only"}</td></tr>) : <tr><td colSpan={5}><div className={styles.tableEmpty}><strong>No physical rooms configured</strong><span>Add room numbers after management confirms the inventory.</span></div></td></tr>}</tbody></table></div>
          </section>

          <section className={styles.adminSectionGrid} aria-label="Additional administration sections">
            <article id="guests" className={styles.compactPanel}><p className={styles.eyebrow}>Guest directory</p><h2>Guests</h2><p>Guest records are created with reservations and remain protected on the server.</p><span>{upcoming.length} upcoming stay records</span></article>
            <article id="staff-access" className={styles.compactPanel}><p className={styles.eyebrow}>Security</p><h2>Staff &amp; access</h2><p>Signed in as {staff.email}. Permissions are enforced again on every server action.</p><span>Role: {staff.role.replace("_", " ")}</span></article>
            <article id="settings" className={styles.compactPanel}><p className={styles.eyebrow}>Property setup</p><h2>Settings</h2><p>{propertyProfile.address}. Operating timezone: {propertyProfile.timezone}.</p><span>Single-property mode</span></article>
          </section>
        </div>
      </section>
    </main>;
}
