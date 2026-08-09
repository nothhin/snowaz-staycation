"use client";

import { useEffect, useState } from "react";

const navigation = [
  ["Overview", "overview"],
  ["Reservations", "reservations"],
  ["Calendar", "calendar"],
  ["Room templates", "room-templates"],
  ["Physical rooms", "physical-rooms"],
  ["Rates", "rates"],
  ["Guests", "guests"],
  ["Staff & access", "staff-access"],
  ["Settings", "settings"],
] as const;

export function AdminNav({ activeClassName }: { activeClassName: string }) {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const updateActive = () => setActive(window.location.hash.slice(1) || "overview");
    updateActive();
    window.addEventListener("hashchange", updateActive);
    return () => window.removeEventListener("hashchange", updateActive);
  }, []);

  return (
    <nav aria-label="Admin navigation">
      {navigation.map(([label, id], index) => (
        <a
          className={active === id ? activeClassName : undefined}
          href={`#${id}`}
          key={id}
          onClick={() => setActive(id)}
        >
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          {label}
        </a>
      ))}
    </nav>
  );
}

type MobileNavClasses = {
  button: string;
  backdrop: string;
  drawer: string;
  drawerOpen: string;
  drawerHeader: string;
  closeButton: string;
  active: string;
};

export function AdminMobileNav({ classes }: { classes: MobileNavClasses }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const updateActive = () => setActive(window.location.hash.slice(1) || "overview");
    updateActive();
    window.addEventListener("hashchange", updateActive);
    return () => window.removeEventListener("hashchange", updateActive);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        className={classes.button}
        type="button"
        aria-label="Open admin navigation"
        aria-expanded={open}
        aria-controls="mobile-admin-navigation"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">☰</span>
      </button>
      {open ? <button className={classes.backdrop} type="button" aria-label="Close admin navigation" onClick={() => setOpen(false)} /> : null}
      {open ? <aside id="mobile-admin-navigation" className={`${classes.drawer} ${classes.drawerOpen}`}>
        <div className={classes.drawerHeader}>
          <div><strong>SnowAZ</strong><small>Property admin</small></div>
          <button className={classes.closeButton} type="button" aria-label="Close admin navigation" onClick={() => setOpen(false)}>×</button>
        </div>
        <nav aria-label="Mobile admin navigation">
          {navigation.map(([label, id], index) => (
            <a
              className={active === id ? classes.active : undefined}
              href={`#${id}`}
              key={id}
              onClick={() => { setActive(id); setOpen(false); }}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{label}
            </a>
          ))}
        </nav>
      </aside> : null}
    </>
  );
}
