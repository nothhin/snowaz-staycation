"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const navigation = [
  { label: "Overview", href: "/admin#overview", id: "overview" },
  { label: "Booking requests", href: "/admin#booking-requests", id: "booking-requests" },
  { label: "Calendar", href: "/admin#calendar", id: "calendar" },
  { label: "Confirmed stays", href: "/admin/confirmed", id: "confirmed" },
  { label: "Operations & finance", href: "/admin/operations", id: "operations" },
  { label: "Price Management", href: "/admin/prices", id: "prices" },
  { label: "Guest rules", href: "/admin#guest-rules", id: "guest-rules" },
  { label: "Settings", href: "/admin#settings", id: "settings" },
] as const;

function useActiveSection() {
  const pathname = usePathname();
  const [hash, setHash] = useState("overview");
  useEffect(() => {
    const update = () => setHash(window.location.hash.slice(1) || "overview");
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);
  if (pathname === "/admin/confirmed") return "confirmed";
  if (pathname === "/admin/operations") return "operations";
  if (pathname === "/admin/prices") return "prices";
  return hash;
}

export function AdminNav({ activeClassName }: { activeClassName: string }) {
  const active = useActiveSection();
  return <nav aria-label="Admin navigation">{navigation.map((item,index)=><a className={active===item.id?activeClassName:undefined} href={item.href} key={item.id}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span>{item.label}</a>)}</nav>;
}

type MobileNavClasses = { button:string; backdrop:string; drawer:string; drawerOpen:string; drawerHeader:string; closeButton:string; active:string };

export function AdminMobileNav({ classes }: { classes: MobileNavClasses }) {
  const [open, setOpen] = useState(false);
  const active = useActiveSection();
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const drawer = open ? createPortal(<div className={classes.backdrop} role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false);}}><aside id="mobile-admin-navigation" className={`${classes.drawer} ${classes.drawerOpen}`} role="dialog" aria-modal="true" aria-label="Admin navigation"><div className={classes.drawerHeader}><div><strong>SnowAZ</strong><small>Property admin</small></div><button className={classes.closeButton} type="button" aria-label="Close admin navigation" onClick={()=>setOpen(false)}>×</button></div><nav aria-label="Mobile admin navigation">{navigation.map((item,index)=><a className={active===item.id?classes.active:undefined} href={item.href} key={item.id} onClick={()=>setOpen(false)}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span>{item.label}</a>)}</nav></aside></div>, document.body) : null;

  return <><button className={classes.button} type="button" aria-label="Open admin navigation" aria-expanded={open} aria-controls="mobile-admin-navigation" onClick={()=>setOpen(true)}><span aria-hidden="true"><i/><i/><i/></span></button>{drawer}</>;
}
