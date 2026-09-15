import type { CSSProperties } from "react";
import { about, revealCount, type AboutSegment } from "@/content/about";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import SiteNav from "../_components/site-nav";
import AboutVideo from "./about-video";
import Grain from "./grain";
import Reveal from "./reveal";
import Counter from "./counter";
import { RevealProvider } from "./reveal-state";
import styles from "./page.module.css";

const aboutDescription =
  "About Albert Olivé Corbella, an AI product engineer and engineering leader in Cardedeu building AI-native products from idea to production.";

export const metadata = pageMetadata({
  title: "About",
  description: aboutDescription,
  path: "/about",
});

// /about — ped.ro identity (reference/measurements/pedro.md).
// Deviations (D5): closed content inert, counter aria-live, reduced-motion.
// One paragraph per sentence so each staggers in ped.ro-style
// (animation-delay calc(.16s * --delay)). Boundaries follow the copy in
// content/about.ts: sentences start at top-level text segments 0, 2, 4, 6.
const paras: AboutSegment[][] = [
  about.segments.slice(0, 2),
  about.segments.slice(2, 4),
  about.segments.slice(4, 6),
  about.segments.slice(6),
];
export default function AboutPage() {
  return (
    <div className={styles.page}>
      <AboutVideo />
      <Grain />
      <RevealProvider>
        <div className={styles.contentLayer}>
          <SiteNav active="about" tone="light" />
          <Counter total={revealCount} />
          <main className={styles.main}>
            <h1 className={styles.visuallyHidden}>
              About {site.name}, {site.role} in Cardedeu
            </h1>
            {paras.map((segs, p) => (
              <p
                key={p}
                className={styles.homeText}
                style={{ "--delay": p } as CSSProperties}
              >
                {segs.map((seg, i) =>
                  seg.kind === "text" ? (
                    <span key={i}>{seg.text}</span>
                  ) : seg.kind === "link" ? (
                    <a key={i} className={styles.mail} href={seg.href}>
                      {seg.text}
                    </a>
                  ) : (
                    <Reveal key={seg.id} reveal={seg} parentId={null} />
                  ),
                )}
              </p>
            ))}
          </main>
        </div>
      </RevealProvider>
    </div>
  );
}
