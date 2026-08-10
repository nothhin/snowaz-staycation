export const propertyProfile = {
  displayName: "SnowAZ Staycation",
  shortName: "SnowAZ",
  descriptor: "Condo Rental",
  tagline: "Relax · Stay · Enjoy",
  locationLabel: "Banilad, Mandaue City",
  address: "Unit 1920, 19th Floor, Tower 1, Urban Deca Homes Banilad, A.S. Fortuna, Mandaue City, Cebu",
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
  ["2 BR", "Condo unit"],
  ["5–8", "Guest capacity"],
  ["24/7", "Building security"],
  ["Direct", "Owner assistance"],
] as const;

export const stayHighlights = [
  { title: "Two-bedroom comfort", copy: "A fully furnished two-bedroom condo with a living and dining area, coffee-bar corner, and one bathroom." },
  { title: "For families and friends", copy: "Comfortably arranged for staycations, family visits, and barkada gatherings of up to 5–8 guests." },
  { title: "Easy direct booking", copy: "View the calendar, choose your preferred dates, and send a request directly to SnowAZ." },
] as const;

export const unitAmenities = [
  "Wi-Fi", "Hot and cold shower", "2 air conditioners", "Electric tower fan",
  "Humidifier", "32-inch TV", "Mini refrigerator", "Microwave",
  "Electric kettle", "Rice cooker", "Range hood", "Kitchen utensils",
  "Bidet", "Sofa", "3 side lamps", "Smart lock",
  "Single-size bunk bed", "2 double-size beds with a single-size bunk bed",
] as const;

export const buildingAmenities = [
  "Playground", "Elevator", "Function hall", "24/7 security",
  "Basketball court (coming soon)", "Swimming pool (coming soon)",
] as const;

export const nearbyPlaces = [
  "Walking distance to Oakridge, Starbucks, Rustan’s Supermarket, and restaurants",
  "About 1 km from Vicente Gullas Memorial Hospital",
  "About 1.5 km from Cebu I.T. Park",
  "About 6.6 km from Mactan-Cebu International Airport",
  "10–15 minutes to GAGFA/Sykes, Ayala, SM, Chong Hua, UCMed, CDU, and Parkmall",
  "Near USC Talamban, UC Banilad, and UV Gullas Banilad campuses",
  "Near SM, JMall, Gaisano Country Mall, Ayala Central Bloc, and Banilad Town Centre",
] as const;
