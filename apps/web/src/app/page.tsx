import Image from "next/image";
import Link from "next/link";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { SavedBookingLink } from "./BookingMemory";
import ScrollReveal from "./ScrollReveal";
import { amenityHighlights, buildingAmenities, checkoutRules, galleryImages, galleryVideos, houseRules, nearbyPlaces, propertyProfile, stayHighlights, unitAmenities } from "@/lib/property";

export const dynamic = "force-dynamic";

export default function Home() {
  return <main><ScrollReveal />
    <section className="snow-hero" id="home">
      <Image src="/images/snowaz/hero.jpg" alt="SnowAZ Staycation's cozy living and dining area" fill preload sizes="100vw" className="snow-hero-image" />
      <div className="snow-hero-overlay" />
      <nav className="snow-nav" aria-label="Primary navigation">
        <a className="snow-brand" href="#home"><Image src="/images/snowaz/logo.jpg" alt="SnowAZ Staycation" width={58} height={58} /><span><strong>SnowAZ</strong><small>Staycation · Condo Rental</small></span></a>
        <div><a href="#about">About</a><a href="#gallery">Gallery</a><a href="#amenities">Amenities</a><a href="#availability">Availability</a><a href="#location">Location</a></div>
        <a className="gold-button" href="#availability">Book your stay</a>
      </nav>
      <div className="snow-hero-copy">
        <p>1BR · 2 guests · ₱1,800/night &nbsp; | &nbsp; 2BR · 4 guests · ₱2,300/night</p>
        <h1>Your cozy escape,<br /><em>away from home.</em></h1>
        <span>Stay. Relax. Create memories.</span>
        <div className="hero-actions"><a className="gold-button" href="#availability">View availability</a><a className="ghost-button" href={propertyProfile.messengerUrl} target="_blank" rel="noreferrer">Chat on Messenger</a></div>
      </div>
    </section>

    <section className="snow-highlights" aria-label="Stay highlights" data-reveal>{amenityHighlights.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>

    <section className="snow-section snow-intro" id="about" data-reveal>
      <div><p className="eyebrow">Welcome to SnowAZ</p><h2>Feel at home in the heart of the city.</h2></div>
      <p>Book a fully furnished, thoughtfully designed two-bedroom condo near malls, cafés, and business hubs. Bedroom 1 is good for 2 guests, while Bedroom 2 is good for 3 guests. The unit can accommodate up to 8 guests with additional sleeping arrangements.</p>
    </section>

    <section className="snow-section" id="gallery" data-reveal>
      <div className="snow-heading"><p className="eyebrow">A look inside</p><h2>Cozy stay. Warm heart.<br />Happy memories.</h2></div>
      <div className="snow-gallery">{galleryImages.map((image, index) => <figure key={image.src} className={index === 0 ? "snow-gallery-feature" : ""}><Image src={image.src} alt={image.alt} fill sizes={index === 0 ? "(max-width: 800px) 100vw, 58vw" : "(max-width: 800px) 100vw, 30vw"} /></figure>)}</div>
      <div className="snow-video-showcase" aria-label="SnowAZ video tours">
        <div className="snow-video-heading"><p className="eyebrow">Watch the space</p><h3>Take a closer look.</h3></div>
        <div className="snow-video-grid">{galleryVideos.map((video) => <figure key={video.src}><video src={video.src} aria-label={video.label} autoPlay controls muted loop playsInline preload="metadata" /><figcaption>{video.label}</figcaption></figure>)}</div>
      </div>
    </section>

    <section className="snow-section stay-grid" data-reveal>{stayHighlights.map((item, index) => <article key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.copy}</p></article>)}</section>

    <section className="details-section" id="amenities" data-reveal>
      <div className="details-heading"><p className="eyebrow">Inside your stay</p><h2>Fully furnished for a comfortable Cebu stay.</h2><p>Available for daily or weekly rental. Check-in is at 2:00 PM and check-out is at 11:00 AM; flexible timing may be arranged depending on availability.</p></div>
      <div className="details-columns">
        <article><h3>Unit amenities</h3><ul>{unitAmenities.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article><h3>Building &amp; safety</h3><ul>{buildingAmenities.map((item) => <li key={item}>{item}</li>)}</ul></article>
      </div>
      <div className="important-notes">
        <article><strong>Stay rates</strong><p>1 bedroom for up to 2 guests: ₱1,800/night. Both bedrooms for up to 4 guests: ₱2,300/night. Each guest beyond 4 is an additional ₱300 per night, up to 8 guests total.</p></article>
        <article><strong>Required down payment</strong><p>A ₱1,000 booking down payment is required to secure the stay and is deducted from the total accommodation payment.</p></article>
        <article><strong>House rules</strong><ul>{houseRules.map((rule) => <li key={rule}>{rule}</li>)}</ul></article>
        <article><strong>Before you leave</strong><ul>{checkoutRules.map((rule) => <li key={rule}>{rule}</li>)}</ul></article>
      </div>
    </section>

    <section className="availability-section" id="availability" data-reveal>
      <div className="availability-copy"><p className="eyebrow">Plan your visit</p><h2>Find your perfect date.</h2><p>Choose any open date to start your booking request. Pending dates may become available again; confirmed stays remain securely blocked without revealing guest information.</p><div className="contact-card"><strong>Already sent a request?</strong><SavedBookingLink /></div><div className="contact-card"><strong>Prefer personal assistance?</strong><a href={propertyProfile.messengerUrl} target="_blank" rel="noreferrer">Message SnowAZ on Facebook</a><a href={`tel:${propertyProfile.phoneHref}`}>Call {propertyProfile.phoneDisplay}</a></div></div>
      <AvailabilityCalendar />
    </section>

    <section className="location-panel" id="location" data-reveal>
      <div><p className="eyebrow">In the heart of the city</p><h2>Urban convenience,<br />cozy comfort.</h2><address>{propertyProfile.address}</address><ul className="nearby-list">{nearbyPlaces.map((place) => <li key={place}>{place}</li>)}</ul><a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertyProfile.address)}`} target="_blank" rel="noreferrer">Open in Google Maps →</a></div>
      <div className="location-image"><Image src="/images/snowaz/dining-room-updated.jpg" alt="Updated SnowAZ Staycation dining area with gold lighting and mirror details" fill sizes="(max-width: 800px) 100vw, 50vw" /></div>
    </section>

    <section className="snow-contact" id="contact" data-reveal><Image src="/images/snowaz/logo.jpg" alt="SnowAZ Staycation logo" width={180} height={180} /><div><p className="eyebrow">Ready when you are</p><h2>Let’s plan your stay.</h2><p>Perfect for family vacations, group trips, or work-from-home stays. Connect directly with SnowAZ for immediate availability confirmation.</p><div className="contact-links"><a href={propertyProfile.messengerUrl} target="_blank" rel="noreferrer">Messenger</a><a href={`tel:${propertyProfile.phoneHref}`}>{propertyProfile.phoneDisplay}</a><a href={`mailto:${propertyProfile.email}`}>{propertyProfile.email}</a><a href={propertyProfile.facebookUrl} target="_blank" rel="noreferrer">Facebook page</a></div></div></section>

    <footer className="snow-footer"><a className="snow-brand" href="#home"><span><strong>SnowAZ Staycation</strong><small>{propertyProfile.tagline}</small></span></a><p>{propertyProfile.address}</p><div className="snow-footer-meta"><nav aria-label="Legal"><Link href="/privacy">Privacy Notice</Link><Link href="/cookies">Cookie Notice</Link></nav><p>© {new Date().getFullYear()} SnowAZ Staycation</p></div></footer>
  </main>;
}
