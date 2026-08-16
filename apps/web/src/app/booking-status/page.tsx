import type { Metadata } from "next";
import Link from "next/link";
import { propertyProfile } from "@/lib/property";
import { BookingLookupForm } from "./BookingLookupForm";

export const metadata: Metadata = {
  title: "Check booking status | SnowAZ Staycation",
  robots: { index: false, follow: false },
};
export default function BookingStatusPage() {
  return (
    <main className="booking-status-shell">
      <header>
        <Link href="/">SnowAZ Staycation</Link>
        <span>Secure booking lookup</span>
      </header>
      <article className="booking-status-card">
        <div className="booking-status-intro">
          <p className="eyebrow">Check your request</p>
          <h1>Your stay, at a glance.</h1>
          <p>
            Enter your SnowAZ booking reference and the same contact number used
            in your request. Your live status, payment summary, and remaining
            balance will appear below.
          </p>
          <aside>
            <strong>Your details stay private</strong>
            <span>
              We never display your name, email, bank details, or transfer
              reference on this page.
            </span>
          </aside>
        </div>
        <BookingLookupForm />
        <footer className="booking-status-footer">
          <a
            href={propertyProfile.messengerUrl}
            target="_blank"
            rel="noreferrer"
          >
            Need help? Open Messenger
          </a>
          <Link href="/">Return to availability</Link>
        </footer>
      </article>
    </main>
  );
}
