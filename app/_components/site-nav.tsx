import type { ReactNode } from "react";
import Link from "next/link";
import ReactiveAvatar from "./reactive-avatar";
import styles from "./site-nav.module.css";

export type NavRoute = "home" | "projects" | "about" | "experience" | "friends";

export const navRoutes: { id: NavRoute; href: string; label: string }[] = [
  { id: "home", href: "/", label: "home" },
  { id: "experience", href: "/experience", label: "experience" },
  { id: "projects", href: "/projects", label: "projects" },
  { id: "about", href: "/about", label: "about" },
];

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: styles.icon,
};

const icons: Record<NavRoute, ReactNode> = {
  // Hand-drawn set from toryn.bio (reference/measurements/toryn.md)
  home: (
    <svg {...iconProps}>
      <path
        d="M3.6 11.4 L12.2 3.7 L20.6 11.2 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="none"
      />
      <path
        d="M5.8 10.6 L5.5 19.6 L18.6 19.8 L18.3 10.4 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="none"
      />
      <path
        d="M10.4 19.6 L10.5 14.8 C 10.5 14.3, 13.4 14.2, 13.5 14.9 L13.6 19.7 Z"
        fill="#fff"
        stroke="none"
      />
      <path d="M3.6 11.4 L12.2 3.7" />
      <path d="M12.2 3.7 L20.6 11.2" />
      <path d="M5.8 10.6 L5.5 19.6" />
      <path d="M18.6 19.8 L18.3 10.4" />
      <path d="M5.5 19.6 L18.6 19.8" />
      <path d="M10.4 19.6 L10.5 14.8" />
      <path d="M10.5 14.8 C 10.5 14.3, 13.4 14.2, 13.5 14.9" />
      <path d="M13.5 14.9 L13.6 19.7" />
    </svg>
  ),
  projects: (
    <svg {...iconProps}>
      <rect x="5.6" y="3.8" width="12.8" height="9.6" rx="1.1" />
      <path
        d="M4.9 13.4 L19.1 13.4 L21.4 18.2 C 21.7 18.9, 21.2 19.4, 20.4 19.4 L3.6 19.4 C 2.8 19.4, 2.3 18.9, 2.6 18.2 Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path d="M10.3 16.4 L13.7 16.4" />
    </svg>
  ),
  about: (
    <svg {...iconProps}>
      <ellipse
        cx="10.5"
        cy="12.3"
        rx="7.8"
        ry="7.5"
        fill="#fff"
        stroke="none"
      />
      <ellipse
        cx="10.5"
        cy="12.3"
        rx="7.8"
        ry="7.5"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="none"
      />
      <ellipse cx="10.5" cy="12.3" rx="7.8" ry="7.5" />
      <circle cx="7.9" cy="10.3" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="12.9" cy="10.1" r="0.55" fill="currentColor" stroke="none" />
      <path d="M7.2 14.8 C 8.7 17, 12.5 17.1, 14 15.1" />
    </svg>
  ),
  experience: (
    <svg {...iconProps}>
      <path
        d="M5.2 8.2 L18.8 8.2 L18.1 19.2 L5.9 19.2 Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path d="M9 8.1 L9.4 5.2 L14.7 5.2 L15 8.1" />
      <path d="M5.3 12.1 C8.3 13.7, 15.7 13.7, 18.7 12.1" />
      <path d="M10.1 13.2 L10.1 15.1 L13.9 15.1 L13.9 13.2" />
    </svg>
  ),
  friends: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  ),
};

// Toryn.bio navbar, shared by every page (reference/measurements/toryn.md).
// tone="light" for dark backgrounds (home video, about).
export default function SiteNav({
  active,
  tone = "dark",
  withBlur = false,
  inline = false,
}: {
  active: NavRoute;
  tone?: "dark" | "light";
  withBlur?: boolean;
  inline?: boolean;
}) {
  return (
    <>
      <nav
        className={`${styles.nav} ${tone === "light" ? styles.light : ""} ${inline ? styles.inline : ""}`}
        aria-label="Primary navigation"
      >
        {/* Veil must live INSIDE the nav stacking context (like toryn's
            header): z -1 puts it under the nav text but above page content,
            so scrolled/hovered cards (z 10) blur out under the brand. */}
        {withBlur && <div className={styles.navBlur} aria-hidden="true" />}
        <div className={styles.navInner}>
          <div className={styles.brand}>
            <Link href="/">
              <ReactiveAvatar />
              <span className={styles.brandText}>Albert Olivé Corbella</span>
            </Link>
          </div>
          <ul className={styles.links}>
            {navRoutes.map((r) => (
              <li key={r.id}>
                <Link
                  href={r.href}
                  className={styles.link}
                  aria-label={r.label}
                  aria-current={active === r.id ? "page" : undefined}
                >
                  {icons[r.id]}
                  <span className={styles.linkLabel}>{r.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
