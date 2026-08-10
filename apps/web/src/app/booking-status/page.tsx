import type { Metadata } from "next";
import Link from "next/link";
import { propertyProfile } from "@/lib/property";
import { BookingLookupForm } from "./BookingLookupForm";

export const metadata:Metadata={title:"Check booking status | SnowAZ Staycation",robots:{index:false,follow:false}};
export default function BookingStatusPage(){return <main className="booking-status-shell"><header><Link href="/">SnowAZ Staycation</Link><span>Private booking lookup</span></header><article><p className="eyebrow">Check your request</p><h1>Welcome back.</h1><p>Use the reference shown after booking and the same contact number you entered. We never display your name, email, payment reference, or bank details here.</p><BookingLookupForm/><footer><a href={propertyProfile.messengerUrl} target="_blank" rel="noreferrer">Need help? Open Messenger</a><Link href="/">Return to availability</Link></footer></article></main>}
