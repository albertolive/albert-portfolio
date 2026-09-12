import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import Clock from "./_components/clock";
import SiteNav from "./_components/site-nav";
import styles from "./page.module.css";

// Home — jrands.com identity (reference/measurements/jrands.md) with the
// shared toryn navbar (user decision 2026-09-08: navbar on all pages,
// bottom info bar kept on home). Server component; clock is a client island.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: `${site.name} — ${site.shortTitle}`,
    description: site.description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${site.name} — ${site.shortTitle}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.shortTitle}`,
    description: site.description,
    images: ["/opengraph-image"],
  },
};

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className={styles.page}>
      <SiteNav active="home" inline />

      <main className={styles.frameWrap}>
        <h1 className={styles.visuallyHidden}>Albert Olivé Corbella, Senior AI Product Engineer in Cardedeu</h1>
        <p className={styles.visuallyHidden}>Building AI-native products from idea to production.</p>
        <div className={styles.frame}>
          <iframe
            className={styles.video}
            src="https://customer-r2fmo0h2bms2itla.cloudflarestream.com/6c867869f199be1a7e96b65435fd6293/iframe?loop=true&autoplay=true&muted=true&poster=https%3A%2F%2Fcustomer-r2fmo0h2bms2itla.cloudflarestream.com%2F6c867869f199be1a7e96b65435fd6293%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600&controls=false"
            title="Montseny landscape background"
            aria-hidden="true"
            tabIndex={-1}
            allow="autoplay; encrypted-media"
          />
        </div>

        <Link
          href="/projects"
          className={styles.badge}
          aria-label={`About ${site.name} — ${site.status}`}
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
