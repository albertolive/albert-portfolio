"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";

// Europe/Madrid live clock, per-second, unmount-safe (DESIGN.md "Clock").
export default function Clock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: site.timezone,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span suppressHydrationWarning>
      {time ?? "00:00:00"}
    </span>
  );
}
