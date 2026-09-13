import type { Metadata } from "next";
import Image from "next/image";
import { education, experience, languages } from "@/content/experience";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import SiteNav from "../_components/site-nav";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpRightIcon } from "../_components/icons";
import MontsenyScene from "../_components/montseny-scene";
import JourneyScroller from "./journey-scroller";
import styles from "./page.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Experience",
  description:
    "Albert Olivé Corbella's CV — 12 years across esdeveniments.cat, IOTA Foundation, Consensys (MetaMask), letgo, CornerJob and more.",
  path: "/experience",
});

export default function ExperiencePage() {
  return (
    <div className={styles.page} id="top">
      <SiteNav active="experience" withBlur />

      <main className={styles.main}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Work Experience</p>
          <h1>The Journey So Far</h1>
          <p className={styles.lede}>
            From seventh employee to engineering lead, solution architect and founder —
            building products, teams and the systems between them.
          </p>
          <a className={styles.cvLink} href="/cv.pdf" download>
            Download the CV <ArrowDownIcon />
          </a>
        </header>

        <JourneyScroller ariaLabel="Career timeline. Use arrow keys to move through the journey.">
          <ol className={styles.journeyTrack}>
            {experience.map((company) => (
              <li key={company.name} className={styles.journeyStop}>
                <div className={styles.datePill}>{company.span}</div>
                <div className={styles.connector} aria-hidden="true">
                  <span />
                </div>
                  <article className={styles.companyCard}>
                    <div className={styles.companyHeader}>
                      <Image className={styles.companyLogo} src={company.logo} alt="" width={56} height={56} />
                      <div>
                        <h2 className={styles.companyName}>
                          {company.href ? <a href={company.href} target="_blank" rel="noopener noreferrer">{company.name}</a> : company.name}
                        </h2>
                        <p className={styles.companyRole}>{company.role}</p>
                      </div>
                    </div>
                    <p className={styles.roleSummary}>{company.summary}</p>
                    <ul className={styles.techList} aria-label="Technologies and skills">
                      {company.tags.map((tag) => <li key={tag}>{tag}</li>)}
                    </ul>
                </article>
              </li>
            ))}
          </ol>
        </JourneyScroller>

        <section className={styles.details} aria-labelledby="education-title">
          <div>
            <h2 id="education-title" className={styles.detailsTitle}>Education</h2>
            <ul className={styles.educationList}>
              {education.map((item) => (
                <li key={item.school + item.period}>
                  <span className={styles.school}>{item.school}</span>
                  <span className={styles.program}>{item.program}</span>
                  <span className={styles.period}>{item.period}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={styles.detailsTitle}>Languages</h2>
            <ul className={styles.languageList}>
              {languages.map((language) => <li key={language}>{language}</li>)}
            </ul>
          </div>
        </section>
      </main>
      <div className={styles.ending}>
        <MontsenyScene />
        <footer className={styles.footer}>
          <span>Albert Olivé · {site.location}</span>
          <a href={site.github} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRightIcon /></a>
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRightIcon /></a>
          <a href="#top">Back to top <ArrowUpIcon /></a>
        </footer>
      </div>
    </div>
  );
}
