import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import "sweetalert2/dist/sweetalert2.min.css";
import GuestMenu from "./GuestMenu";
import BrowserViewPrompt from "./BrowserViewPrompt";

const bodyFont = Montserrat({ variable: "--font-body", subsets: ["latin"] });
const displayFont = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "SnowAZ Staycation | Condo Rental in Mandaue City", template: "%s | SnowAZ Staycation" },
  description: "Book a fully furnished two-bedroom SnowAZ Staycation condo for up to 8 guests at Urban Deca Homes Banilad, Mandaue City.",
  applicationName: "SnowAZ Staycation",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SnowAZ",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}><body>{children}<GuestMenu /><BrowserViewPrompt /></body></html>;
}
