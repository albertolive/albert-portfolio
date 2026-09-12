import type { Metadata } from "next";
import { about, revealCount } from "@/content/about";
import { site } from "@/content/site";
import SiteNav from "../_components/site-nav";
import Grain from "./grain";
import Reveal from "./reveal";
import Counter from "./counter";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About",
  description: "About Albert Olivé Corbella, an AI product engineer and engineering leader in Cardedeu building AI-native products from idea to production.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    url: "/about",
    title: `About — ${site.name}`,
    description: "About Albert Olivé Corbella, an AI product engineer and engineering leader in Cardedeu building AI-native products from idea to production.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${site.name} — ${site.shortTitle}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `About — ${site.name}`,
    description: "About Albert Olivé Corbella, an AI product engineer and engineering leader in Cardedeu building AI-native products from idea to production.",
    images: ["/opengraph-image"],
  },
};

// /about — ped.ro identity (reference/measurements/pedro.md).
// Deviations (D5): closed content inert, counter aria-live, reduced-motion.
export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.videoWrap} aria-hidden="true">
        <video
          className={styles.videoBg}
          poster="/images/about-poster.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
        >
          <source src="/video/about.webm" type="video/webm" />
        </video>
      </div>
      <Grain />
      <div className={styles.contentLayer}>
        <SiteNav active="about" tone="light" />
        <Counter total={revealCount} />
        <main className={styles.main}>
          <div className={styles.text}>
            {about.segments.map((seg, i) =>
              seg.kind === "text" ? (
                <span key={i} className={styles.fade} style={{ "--delay": i } as React.CSSProperties}>
                  {seg.text}
                </span>
              ) : seg.kind === "link" ? (
                <a key={i} className={styles.mail} href={seg.href}>
                  {seg.text}
                </a>
              ) : (
                <Reveal key={seg.id} reveal={seg} />
              ),
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
