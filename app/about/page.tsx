import type { CSSProperties } from "react";
import { about, revealCount } from "@/content/about";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import SiteNav from "../_components/site-nav";
import AboutVideo from "./about-video";
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

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <AboutVideo />
      <RevealProvider>
        {/* Nav and counter sit outside the multiply slab (ped.ro's DOM order)
            so the blend cannot wash them out. */}
        <SiteNav active="about" tone="light" />
        <Counter total={revealCount} />
        <div className={styles.contentLayer}>
          <main className={styles.main}>
            <h1 className={styles.visuallyHidden}>
              About {site.name}, {site.role} in Cardedeu
            </h1>
            {about.paragraphs.map((segs, p) => (
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
                    <Reveal key={seg.id} reveal={seg} />
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
