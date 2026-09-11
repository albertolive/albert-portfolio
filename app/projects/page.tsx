import type { Metadata } from "next";
import Image from "next/image";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import SiteNav from "../_components/site-nav";
import ContributionCalendar from "./_components/contribution-calendar";
import SkillsPlayground from "./_components/skills-playground";
import MontsenyScene from "./_components/montseny-scene";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Projects",
};

export default function ProjectsPage() {
  return (
    <div className={styles.page} id="top">
      <SiteNav active="projects" withBlur />

      <main>
        <section className={styles.hero}>
          <header className={styles.intro}>
            <p className={styles.kicker}>selected work · catalonia</p>
            <h1>Things I build close to the ground.</h1>
            <p className={styles.lede}>Weather models, local platforms, and tools that make everyday life a little more useful.</p>
            <a className={styles.exploreLink} href="#projects-title">Explore the projects <span aria-hidden="true">↓</span></a>
          </header>
          <SkillsPlayground />
        </section>

        <div className={styles.content}>
        <ContributionCalendar />
        <section className={styles.projects} aria-labelledby="projects-title">
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>Built and shipped</p><h2 id="projects-title" tabIndex={-1}>Selected projects</h2></div>
        </div>
        <ul className={styles.grid}>
          {projects.map((p) => {
            const content = (
                <>
                  <span className={styles.imageWrap}>
                    <Image
                      className={styles.image}
                      src={p.image}
                      alt={p.imageAlt}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      draggable={false}
                    />
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardTitle}>{p.title}</span>
                    <span className={styles.cardDesc}>{p.description}</span>
                    <span className={styles.cardMeta}>
                      <span className={styles.cardYear}>{p.year}</span>
                      {p.tech.map((tech) => (
                        <span key={tech} className={styles.cardTag}>{tech}</span>
                      ))}
                      {p.href === "#" && <span className={styles.privateLabel}>Private project</span>}
                    </span>
                    {p.href !== "#" && <span className={styles.cardAction}>{p.href.includes("github.com") ? "View code" : "Visit website"} <span aria-hidden="true">↗</span></span>}
                  </span>
                </>
            );

            return (
              <li key={p.slug} className={styles.card}>
                {p.href === "#" ? (
                  <div className={`${styles.cardLink} ${styles.privateCard}`}>{content}</div>
                ) : (
                  <a className={styles.cardLink} href={p.href} target="_blank" rel="noreferrer">{content}</a>
                )}
              </li>
            );
          })}
        </ul>
        </section>
        </div>

        <section className={styles.contact} aria-labelledby="contact-title">
          <div className={styles.contactInner}>
            <p className={styles.kicker}>Have something in mind?</p>
            <h2 id="contact-title">Let’s work<br /><em>together.</em></h2>
            <div className={styles.contactBottom}>
              <p>From a first prototype to a product people use. Let’s talk about what you’re building.</p>
              <a className={styles.contactLink} href={site.linkedin} target="_blank" rel="noopener noreferrer">
                Start a conversation <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <MontsenyScene />
          <footer className={styles.footer}>
            <span>Albert Olivé · {site.location}</span>
            <a href={site.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <a href={site.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
            <a href="#top">Back to top ↑</a>
          </footer>
        </section>
      </main>
    </div>
  );
}
