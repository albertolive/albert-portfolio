import Link from "next/link";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import Clock from "./_components/clock";
import HomeR2Video from "./_components/home-r2-video";
import SiteNav from "./_components/site-nav";
import styles from "./page.module.css";

// Home — jrands.com identity (reference/measurements/jrands.md) with the
// shared toryn navbar (user decision 2026-09-08: navbar on all pages,
// bottom info bar kept on home). Server component; clock is a client island.
export const metadata = pageMetadata({
  description: site.description,
  path: "/",
});

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className={styles.page}>
      <SiteNav active="home" inline />

      <main className={styles.frameWrap}>
        <h1 className={styles.visuallyHidden}>Albert Olivé Corbella, Senior AI Product Engineer in Cardedeu</h1>
        <p className={styles.visuallyHidden}>Building AI-native products from idea to production.</p>
        <HomeR2Video />

        <Link
          href="/projects"
          className={styles.badge}
          aria-label={`${site.status} — View my projects`}
        >
          <span className={styles.badgeDot} aria-hidden="true" />
          <span className={styles.badgeText}>{site.status}</span>
        </Link>
      </main>

      <div className={styles.bottomBar}>
        <div className={styles.barGroup}>
          <span className={styles.barItem}>{site.name.split(" ").slice(0, 2).join(" ")}</span>
          <span className={styles.barItem}>{site.role}</span>
        </div>
        <div className={`${styles.barGroup} ${styles.barRight}`}>
          <span className={styles.barItem}>{site.location}</span>
          <span className={styles.barTime}>
            <Clock /><span className={styles.barItem}>{year}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
