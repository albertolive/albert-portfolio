import type { Metadata } from "next";
import Image from "next/image";
import { projects } from "@/content/projects";
import SiteNav from "../_components/site-nav";
import WaterField from "./_components/water-field";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Projects",
};

// /projects — toryn.bio/projects identity (reference/measurements/toryn.md).
// Deviations (D4): all cards are external links with target=_blank +
// rel=noreferrer, focus-visible rings, reduced-motion respected globally.
export default function ProjectsPage() {
  return (
    <div className={styles.page}>
      <WaterField className={styles.waterField} />
      <SiteNav active="projects" withBlur />

      <main className={styles.main}>
        <header className={styles.intro}>
          <p className={styles.kicker}>selected work · catalonia</p>
          <h1>Things I build close to the ground.</h1>
          <p className={styles.lede}>Weather models, local platforms, and tools that make everyday life a little more useful.</p>
        </header>
        <ul className={styles.grid}>
          {projects.map((p, index) => (
            <li key={p.slug} className={`${styles.card} ${index === 0 ? styles.featured : ""}`}>
              <a
                className={styles.cardLink}
                href={p.href}
                target="_blank"
                rel="noreferrer"
              >
                <span className={styles.cardInner}>
                  <span className={styles.imageWrap}>
                    <Image
                      className={styles.image}
                      src={p.image}
                      alt={p.imageAlt}
                      fill
                      sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 686px) 50vw, 90vw"
                      priority={p.slug === "nowcast-cardedeu"}
                    />
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardTitle}>
                      {p.title}
                      <svg
                        className={styles.arrow}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M6 13h6v4l6-5-6-5v4H6z" />
                      </svg>
                    </span>
                    <span className={styles.cardDesc}>{p.description}</span>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
