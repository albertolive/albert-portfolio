"use client";

import { useRevealOpenCount } from "./reveal-state";
import styles from "./page.module.css";

// R counter — ped.ro .counter: fixed top-right, serif italic, "R 0 / N".
// Deviations (D5): aria-live polite; hidden on (hover:none) via CSS.
// The open count is derived from the page-owned reveal state, so unmounts
// and nested reveals cannot desynchronize it.
export default function Counter({ total }: { total: number }) {
  const open = useRevealOpenCount();

  return (
    <p className={styles.counter} aria-live="polite">
      R {open} / {total}
    </p>
  );
}
