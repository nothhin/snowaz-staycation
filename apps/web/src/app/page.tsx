import Image from "next/image";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { amenityHighlights, buildingAmenities, galleryImages, nearbyPlaces, propertyProfile, stayHighlights, unitAmenities } from "@/lib/property";

export default function Home() {
  return <main>
    <section className="snow-hero" id="home">
      <Image src="/images/snowaz/hero.jpg" alt="SnowAZ Staycation's cozy living and dining area" fill preload sizes="100vw" className="snow-hero-image" />
      <div className="snow-hero-overlay" />
      <nav className="snow-nav" aria-label="Primary navigation">
        <a className="snow-brand" href="#home"><Image src="/images/snowaz/logo.jpg" alt="SnowAZ Staycation" width={58} height={58} /><span><strong>SnowAZ</strong><small>Staycation · Condo Rental</small></span></a>
        <div><a href="#about">About</a><a href="#gallery">Gallery</a><a href="#amenities">Amenities</a><a href="#availability">Availability</a><a href="#location">Location</a></div>
        <a className="gold-button" href="#availability">Book your stay</a>
      </nav>
      <div className="snow-hero-copy">
        <p>1BR for 2 guests · 2BR for 4+ guests · Mandaue City</p>
        <h1>Your cozy escape,<br /><em>away from home.</em></h1>
        <span>Stay. Relax. Create memories.</span>
        <div className="hero-actions"><a className="gold-button" href="#availability">View availability</a><a className="ghost-button" href={propertyProfile.whatsappUrl} target="_blank" rel="noreferrer">Chat on WhatsApp</a></div>
      </div>
    </section>

    <section className="snow-highlights" aria-label="Stay highlights">{amenityHighlights.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>

    <section className="snow-section snow-intro" id="about">
      <div><p className="eyebrow">Welcome to SnowAZ</p><h2>Feel at home in the heart of the city.</h2></div>
      <p>This minimalist two-bedroom condo is close to Oakridge Business Park, Cebu I.T. Park, schools, hospitals, and malls. Its living and dining area, coffee-bar corner, and comfortable sleeping spaces can accommodate 5–8 guests.</p>
    </section>

    <section className="snow-section" id="gallery">
      <div className="snow-heading"><p className="eyebrow">A look inside</p><h2>Cozy stay. Warm heart.<br />Happy memories.</h2></div>
      <div className="snow-gallery">{galleryImages.map((image, index) => <figure key={image.src} className={index === 0 ? "snow-gallery-feature" : ""}><Image src={image.src} alt={image.alt} fill sizes={index === 0 ? "(max-width: 800px) 100vw, 58vw" : "(max-width: 800px) 100vw, 30vw"} /></figure>)}</div>
    </section>

    <section className="snow-section stay-grid">{stayHighlights.map((item, index) => <article key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.copy}</p></article>)}</section>

    <section className="details-section" id="amenities">
      <div className="details-heading"><p className="eyebrow">Inside your stay</p><h2>Fully furnished for a comfortable Cebu stay.</h2><p>Available for daily or weekly rental. Check-in is at 2:00 PM and check-out is at 11:00 AM; flexible timing may be arranged depending on availability.</p></div>
      <div className="details-columns">
        <article><h3>Unit amenities</h3><ul>{unitAmenities.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article><h3>Building &amp; safety</h3><ul>{buildingAmenities.map((item) => <li key={item}>{item}</li>)}<li>CCTV surveillance</li><li>Fire exits</li><li>Flood and earthquake safety provisions</li></ul></article>
      </div>
      <div className="important-notes">
        <article><strong>Bedroom access</strong><p>The displayed nightly price covers 2 guests with access to 1 bedroom. Book a minimum of 4 guests for both bedrooms, or message SnowAZ for assistance.</p></article>
        <article><strong>Security deposit</strong><p>A refundable ₱1,000 security deposit is required before check-in and returned after checkout clearing.</p></article>
        <article><strong>House rules</strong><p>No smoking inside the unit—a ₱5,000 penalty applies. No pets, no balcony, and no on-site parking; parking arrangements may be requested.</p></article>
      </div>
    </section>

    <section className="availability-section" id="availability">
      <div className="availability-copy"><p className="eyebrow">Plan your visit</p><h2>Find your perfect date.</h2><p>Choose any open date to start your booking request. Pending dates may become available again; confirmed stays remain securely blocked without revealing guest information.</p><div className="contact-card"><strong>Prefer personal assistance?</strong><a href={propertyProfile.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp {propertyProfile.phoneDisplay}</a></div></div>
      <AvailabilityCalendar />
    </section>

    <section className="location-panel" id="location">
      <div><p className="eyebrow">In the heart of the city</p><h2>Urban convenience,<br />cozy comfort.</h2><address>{propertyProfile.address}</address><ul className="nearby-list">{nearbyPlaces.map((place) => <li key={place}>{place}</li>)}</ul><a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertyProfile.address)}`} target="_blank" rel="noreferrer">Open in Google Maps →</a></div>
      <div className="location-image"><Image src="/images/snowaz/dining-wide.jpg" alt="Elegant SnowAZ Staycation dining area" fill sizes="(max-width: 800px) 100vw, 50vw" /></div>
    </section>

    <section className="snow-contact" id="contact"><Image src="/images/snowaz/logo.jpg" alt="SnowAZ Staycation logo" width={180} height={180} /><div><p className="eyebrow">Ready when you are</p><h2>Let’s plan your stay.</h2><p>For final rates, bedroom access, parking arrangements, flexible arrival times, and immediate availability confirmation, connect directly with SnowAZ Staycation.</p><div className="contact-links"><a href={propertyProfile.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a><a href={`tel:${propertyProfile.phoneHref}`}>{propertyProfile.phoneDisplay}</a><a href={`mailto:${propertyProfile.email}`}>{propertyProfile.email}</a><a href={propertyProfile.facebookUrl} target="_blank" rel="noreferrer">Facebook page</a></div></div></section>

    <footer className="snow-footer"><a className="snow-brand" href="#home"><span><strong>SnowAZ Staycation</strong><small>{propertyProfile.tagline}</small></span></a><p>{propertyProfile.address}</p><p>© {new Date().getFullYear()} SnowAZ Staycation</p></footer>
  </main>;
}
