"use client";

import { useEffect, useState } from "react";
import { subscribe } from "./counter-context";
import styles from "./page.module.css";

// R counter — ped.ro .counter: fixed top-right, serif italic, "R 0 / N".
// Deviations (D5): aria-live polite; hidden on (hover:none) via CSS.
export default function Counter({ total }: { total: number }) {
  const [open, setOpen] = useState(0);

  useEffect(() => subscribe((opened) => {
    setOpen((n) => (opened ? n + 1 : Math.max(0, n - 1)));
  }), []);

  return (
    <p className={styles.counter} aria-live="polite">
      R {open} / {total}
    </p>
  );
}
