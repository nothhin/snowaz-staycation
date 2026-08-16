"use client";

import { useEffect, useMemo, useState } from "react";
import { formatStayRange } from "@/lib/date-format";
import type { AdminEnquiry } from "./BookingRequestsPanel";
import styles from "./admin.module.css";

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminCalendar({ bookings }: { bookings: AdminEnquiry[] }) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState<{
    date: string;
    bookings: AdminEnquiry[];
  } | null>(null);
  const active = useMemo(
    () =>
      bookings.filter(
        (item) => !["cancelled", "declined"].includes(item.status),
      ),
    [bookings],
  );
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: first.getDay() + days }, (_, index) =>
    index < first.getDay()
      ? null
      : new Date(
          month.getFullYear(),
          month.getMonth(),
          index - first.getDay() + 1,
        ),
  );
  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", close);
    };
  }, [selected]);
  return (
    <section
      id="calendar"
      className={`${styles.panel} ${styles.calendarPanel}`}
    >
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.eyebrow}>Live occupancy</p>
          <h2>
            {month.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>
        <div className={styles.calendarControls}>
          <button
            type="button"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            ←
          </button>
          <button
            type="button"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            →
          </button>
        </div>
      </div>
      <div className={styles.adminCalendarGrid}>
        {weekdays.map((day) => (
          <span className={styles.calendarWeekday} key={day}>
            {day}
          </span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const value = iso(date);
          const matches = active.filter(
            (item) => item.checkIn <= value && item.checkOut > value,
          );
          const confirmed = matches.some((item) => item.status === "confirmed");
          return (
            <button
              type="button"
              key={value}
              data-status={
                confirmed ? "confirmed" : matches.length ? "pending" : "open"
              }
              onClick={() =>
                matches.length &&
                setSelected({ date: value, bookings: matches })
              }
              disabled={!matches.length}
            >
              <strong>{date.getDate()}</strong>
              {matches.length ? (
                <small>
                  {matches.length} guest{matches.length === 1 ? "" : "s"}
                </small>
              ) : (
                <small>Open</small>
              )}
            </button>
          );
        })}
      </div>
      <div className={styles.calendarLegend}>
        <span data-status="open">Open</span>
        <span data-status="pending">Request</span>
        <span data-status="confirmed">Confirmed</span>
      </div>
      {selected ? (
        <div
          className={styles.calendarModalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div
            className={styles.calendarModal}
            role="dialog"
            aria-modal="true"
            aria-label="Bookings for selected date"
          >
            <header>
              <div>
                <p className={styles.eyebrow}>Guest information</p>
                <h2>
                  {new Date(`${selected.date}T00:00:00Z`).toLocaleDateString(
                    "en-US",
                    { dateStyle: "long", timeZone: "UTC" },
                  )}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </header>
            {selected.bookings.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.fullName}</strong>
                  <span>
                    {item.status.replaceAll("_", " ")} ·{" "}
                    {item.depositStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Stay</dt>
                    <dd>{formatStayRange(item.checkIn, item.checkOut)}</dd>
                  </div>
                  <div>
                    <dt>Guests</dt>
                    <dd>
                      {item.guestCount} ·{" "}
                      {item.guestCount > 2 ? "2 bedrooms" : "1 bedroom"}
                    </dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      {item.phone}
                      <br />
                      <a
                        className={styles.callGuestButton}
                        href={`tel:${item.phone}`}
                        aria-label={`Call ${item.fullName}`}
                      >
                        Call guest
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>
                      {item.email ? (
                        <a href={`mailto:${item.email}`}>{item.email}</a>
                      ) : (
                        "Not provided"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Payment reference</dt>
                    <dd>{item.depositReference || "Not submitted"}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
