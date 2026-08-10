"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLiveRefresh() {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => {
    let refreshing = false;
    const refresh = () => {
      if (refreshing) return;
      refreshing = true;
      router.refresh();
      setLastUpdated(new Date());
      window.setTimeout(() => { refreshing = false; }, 1_000);
    };
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    setLastUpdated(new Date());
    const interval = window.setInterval(refresh, 5_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("snowaz:admin-changed", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("snowaz:admin-changed", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [router]);
  return <small>{lastUpdated ? `Auto-updated ${lastUpdated.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : "Auto-refreshing"}</small>;
}
