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
  messengerUrl: "https://m.me/61592545910229",
} as const;

export const galleryImages = [
  { src: "/images/snowaz/hero.jpg", alt: "Warm and cozy SnowAZ Staycation living and dining area" },
  { src: "/images/snowaz/dining-wide.jpg", alt: "SnowAZ dining area with gold lighting and mirror details" },
  { src: "/images/snowaz/dining.jpg", alt: "Dining table prepared for four guests at SnowAZ Staycation" },
  { src: "/images/snowaz/detail.jpg", alt: "Gold and dried-flower interior details at SnowAZ Staycation" },
] as const;

export const amenityHighlights = [
  ["2 BR", "Condo unit"],
  ["Up to 8", "Guest capacity"],
  ["24/7", "Building security"],
  ["Direct", "Owner assistance"],
] as const;

export const stayHighlights = [
  { title: "Two-bedroom comfort", copy: "A fully furnished two-bedroom condo with a living and dining area, coffee-bar corner, and one bathroom." },
  { title: "For families and friends", copy: "Comfortably arranged for family vacations, group trips, and work-from-home stays of up to 8 guests." },
  { title: "Easy direct booking", copy: "View the calendar, choose your preferred dates, and send a request directly to SnowAZ." },
] as const;

export const unitAmenities = [
  "Fast Wi-Fi", "32-inch Smart TV with Netflix", "2 air-conditioned bedrooms",
  "2 humidifiers", "Fresh linens, pillows, and blankets", "Towels and basic toiletries",
  "Hot and cold shower", "Spacious living and dining area", "Instagrammable photo corner",
  "Fully equipped kitchen with utensils, cookware, and dining ware", "Microwave oven",
  "Refrigerator", "Rice cooker", "Induction cooker", "Electric kettle",
  "Complimentary drinking water", "Bedroom 1: 1 standard single bunk bed (good for 2 guests)",
  "Bedroom 2: 1 Twin-over-double bunk bed (good for 3 guests)",
] as const;

export const buildingAmenities = [
  "Playground (coming soon)", "Elevator", "Function hall (coming soon)", "24/7 security",
  "Basketball court (coming soon)", "Swimming pool (coming soon)",
  "CCTV surveillance", "Fire exits",
] as const;

export const houseRules = [
  "Quiet hours are from 11:00 PM to 7:00 AM",
  "Commercial photography is allowed",
  "No smoking inside the unit; a ₱5,000 penalty applies",
] as const;

export const checkoutRules = [
  "Gather used towels", "Throw trash away", "Turn things off", "Return keys", "Lock up",
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
