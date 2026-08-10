"use client";

import { useState } from "react";
import { propertyProfile } from "@/lib/property";

export function MessengerReceiptLink({ message, className }: { message: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return <div className={className}>
    <a href={propertyProfile.messengerUrl} target="_blank" rel="noreferrer" onClick={() => { void navigator.clipboard.writeText(message).then(() => setCopied(true)); }}>Open Messenger and send receipt</a>
    <small>{copied ? "Message copied—paste it in Messenger, then attach your receipt screenshot." : "This copies your booking message. Paste it in Messenger and attach the receipt screenshot."}</small>
  </div>;
}
