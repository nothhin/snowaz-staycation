"use client";

import { createContext, useContext } from "react";
import type { ActivePricing } from "@/lib/server/pricing";

const PricingContext = createContext<ActivePricing | null>(null);

export function PricingProvider({ initial, children }: { initial: ActivePricing; children: React.ReactNode }) {
  // An open booking form keeps its displayed quote; the server rejects any stale
  // version and requires a fresh page load before the guest can submit again.
  return <PricingContext.Provider value={initial}>{children}</PricingContext.Provider>;
}

export function usePricing() {
  const value = useContext(PricingContext);
  if (!value) throw new Error("PricingProvider is missing.");
  return value;
}
