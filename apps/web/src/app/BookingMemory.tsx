"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const storageKey = "snowaz:last-booking:v1";
type SavedBooking = { url:string; reference?:string; checkIn?:string; checkOut?:string };

export function RememberBooking({ booking }: { booking: SavedBooking }) {
  const { url, reference, checkIn, checkOut } = booking;
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ url, reference, checkIn, checkOut }));
    window.dispatchEvent(new Event("snowaz:booking-saved"));
  }, [url, reference, checkIn, checkOut]);
  return null;
}

export function SavedBookingLink() {
  const [booking, setBooking] = useState<SavedBooking | null>(null);
  useEffect(() => {
    const load = () => { try { const value = JSON.parse(localStorage.getItem(storageKey) || "null") as SavedBooking|null; setBooking(value?.url?.startsWith("/deposit/") ? value : null); } catch { setBooking(null); } };
    load(); window.addEventListener("snowaz:booking-saved", load); return () => window.removeEventListener("snowaz:booking-saved", load);
  }, []);
  if (!booking) return <Link href="/booking-status">Look up booking status</Link>;
  return <><Link href={booking.url}>Continue or check my booking</Link><Link href="/booking-status">Use booking reference instead</Link></>;
}
