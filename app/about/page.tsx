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
};

// /about — ped.ro identity (reference/measurements/pedro.md).
// Deviations (D5): closed content inert, counter aria-live, reduced-motion.
export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className={styles.videoWrap} aria-hidden="true">
        <video
          className={styles.videoBg}
          src="https://cdn.ped.ro/video-optimised.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
        />
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
              ) : (
                <Reveal key={seg.id} reveal={seg} />
              ),
            )}
            <a className={styles.mail} href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
