import type { Metadata } from "next";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import SiteNav from "../_components/site-nav";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
} from "../_components/icons";
import MontsenyScene from "../_components/montseny-scene";
import ContributionCalendar from "./_components/contribution-calendar";
import ProjectPreview from "./_components/project-preview";
import SkillsPlayground from "./_components/skills-playground";
import styles from "./page.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Projects",
  description:
    "Selected AI-native products, local platforms, weather tools, and open-source work built by Albert Olivé Corbella.",
  path: "/projects",
});

export default function ProjectsPage() {
  return (
    <div className={styles.page} id="top">
      <SiteNav active="projects" withBlur />

      <main>
        <section className={styles.hero}>
          <header className={styles.intro}>
            <p className={styles.kicker}>selected work · catalonia</p>
            <h1>Things I build close to the ground.</h1>
            <p className={styles.lede}>
              Weather models, local platforms, and tools that make everyday life
              a little more useful.
            </p>
            <a className={styles.exploreLink} href="#projects-title">
              Explore the projects <ArrowDownIcon />
            </a>
          </header>
          <SkillsPlayground />
        </section>

        <div className={styles.content}>
          <ContributionCalendar />
          <section className={styles.projects} aria-labelledby="projects-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.kicker}>Built and shipped</p>
                <h2 id="projects-title" tabIndex={-1}>
                  Selected projects
                </h2>
              </div>
            </div>
            <ul className={styles.grid}>
              {projects.map((p) => (
                <ProjectPreview
                  key={p.slug}
                  title={p.title}
                  href={p.href}
                  image={p.image}
                  imageAlt={p.imageAlt}
                  video={p.video}
                  sections={p.sections}
                >
                  <span className={styles.cardBody}>
                    <span className={styles.cardTitle}>{p.title}</span>
                    <span className={styles.cardDesc}>{p.description}</span>
                    <span className={styles.cardMeta}>
                      <span className={styles.cardYear}>{p.year}</span>
                      {p.tech.map((tech) => (
                        <span key={tech} className={styles.cardTag}>
                          {tech}
                        </span>
                      ))}
                    </span>
                    <span className={styles.cardAction}>
                      {p.href.includes("github.com")
                        ? "View code"
                        : "Visit website"}{" "}
                      <ArrowUpRightIcon />
                    </span>
                  </span>
                </ProjectPreview>
              ))}
            </ul>
            <a
              className={styles.moreProjectsLink}
              href={site.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              See more on GitHub <ArrowUpRightIcon />
            </a>
          </section>
        </div>

        <section className={styles.contact} aria-labelledby="contact-title">
          <div className={styles.contactInner}>
            <p className={styles.kicker}>Have something in mind?</p>
            <h2 id="contact-title">
              Let’s work
              <br />
              <em>together.</em>
            </h2>
            <div className={styles.contactBottom}>
              <p>
                From a first prototype to a product people use. Let’s talk about
                what you’re building.
              </p>
              <a
                className={styles.contactLink}
                href={site.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                Start a conversation <ArrowUpRightIcon />
              </a>
            </div>
          </div>
          <MontsenyScene />
          <footer className={styles.footer}>
            <span>Albert Olivé Corbella · {site.location}</span>
            <a href={site.github} target="_blank" rel="noopener noreferrer">
              GitHub <ArrowUpRightIcon />
            </a>
            <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn <ArrowUpRightIcon />
            </a>
            <a href="#top">
              Back to top <ArrowUpIcon />
            </a>
          </footer>
        </section>
      </main>
    </div>
  );
}
