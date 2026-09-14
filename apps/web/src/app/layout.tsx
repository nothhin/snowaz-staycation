import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import "sweetalert2/dist/sweetalert2.min.css";
import GuestMenu from "./GuestMenu";
import BrowserViewPrompt from "./BrowserViewPrompt";
import { PricingProvider } from "./PricingProvider";
import { getActivePricing } from "@/lib/server/pricing";

const bodyFont = Montserrat({ variable: "--font-body", subsets: ["latin"] });
const displayFont = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "SnowAZ Staycation | Condo Rental in Mandaue City", template: "%s | SnowAZ Staycation" },
  description: "Book a fully furnished two-bedroom SnowAZ Staycation condo for up to 6 guests at Urban Deca Homes Banilad, Mandaue City.",
  applicationName: "SnowAZ Staycation",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SnowAZ",
  },
};
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pricing = await getActivePricing();
  return <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}><body><PricingProvider initial={pricing}>{children}<GuestMenu /><BrowserViewPrompt /></PricingProvider></body></html>;
}
