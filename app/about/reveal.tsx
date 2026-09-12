"use client";

import { useState } from "react";
import type { AboutSegment } from "@/content/about";
import { onReveal } from "./counter-context";
import styles from "./page.module.css";

// Ped.ro .reveal-trigger / .reveal-content, recursive: a pill's hidden
// content is the sentence continuation and can contain more pills.
// Deviation (D5): closed content is inert (not tabbable).
export default function Reveal({ reveal }: { reveal: Extract<AboutSegment, { kind: "reveal" }> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={open ? `${styles.revealTrigger} ${styles.open}` : styles.revealTrigger}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          onReveal(!open);
        }}
      >
        {reveal.label}
      </button>
      <span
        className={open ? `${styles.revealContent} ${styles.open}` : styles.revealContent}
        hidden={!open}
        inert={!open}
      >
        {reveal.children.map((seg, i) =>
          seg.kind === "text" ? (
            <span key={i}>{seg.text}</span>
          ) : seg.kind === "link" ? (
            <a key={i} className={styles.mail} href={seg.href}>
              {seg.text}
            </a>
          ) : (
            <Reveal key={seg.id} reveal={seg} />
          ),
        )}
      </span>
    </>
  );
}
