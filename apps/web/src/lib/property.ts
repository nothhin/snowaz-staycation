export const propertyProfile = {
  displayName: "SnowAZ Staycation",
  shortName: "SnowAZ",
  descriptor: "Condo Rental",
  tagline: "Relax · Stay · Enjoy",
  locationLabel: "Banilad, Mandaue City",
  address: "Tower 1, Urban Deca Homes Banilad, Mandaue City, Cebu 6014, Philippines",
  timezone: "Asia/Manila",
  currency: "PHP",
  defaultLanguage: "en",
  phoneDisplay: "+63 995 260 6412",
  phoneHref: "+639952606412",
  email: "merryshien.gepitulan@gmail.com",
  facebookUrl: "https://www.facebook.com/profile.php?id=61592545910229",
  whatsappUrl: "https://wa.me/639952606412",
} as const;

export const galleryImages = [
  { src: "/images/snowaz/hero.jpg", alt: "Warm and cozy SnowAZ Staycation living and dining area" },
  { src: "/images/snowaz/dining-wide.jpg", alt: "SnowAZ dining area with gold lighting and mirror details" },
  { src: "/images/snowaz/dining.jpg", alt: "Dining table prepared for four guests at SnowAZ Staycation" },
  { src: "/images/snowaz/detail.jpg", alt: "Gold and dried-flower interior details at SnowAZ Staycation" },
] as const;

export const amenityHighlights = [
  ["Central", "Mandaue location"],
  ["Private", "Entire condo stay"],
  ["Direct", "Owner assistance"],
  ["Fast", "WhatsApp booking"],
] as const;

export const stayHighlights = [
  { title: "A cozy city escape", copy: "A warm, thoughtfully styled condo designed for restful stays and memorable moments." },
  { title: "Made for slow moments", copy: "Relax in an inviting living space, share a meal, and feel at home in the city." },
  { title: "Easy direct booking", copy: "View the calendar, choose your preferred dates, and send a request directly to SnowAZ." },
] as const;
