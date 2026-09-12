"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { ProjectSection } from "@/content/projects";
import styles from "../page.module.css";

type ProjectPreviewProps = {
  title: string;
  href: string;
  image: string;
  imageAlt: string;
  video: string;
  sections?: ProjectSection[];
  children: ReactNode;
};

const HOVER_CAPABLE = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Only one preview clip ever plays at a time, across every card. */
let activePlayer: { card: string; stop: () => void } | null = null;

function matches(query: string) {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M8 5.2v13.6L19 12 8 5.2Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor" />
    </svg>
  );
}

export default function ProjectPreview({
  title,
  href,
  image,
  imageAlt,
  video,
  sections,
  children,
}: ProjectPreviewProps) {
  const cardRef = useRef<HTMLLIElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Stable per-card identity, so a card recognises its own claim on the player. */
  const card = useId();
  const hovering = useRef(false);
  const focused = useRef(false);
  const pinned = useRef(false);
  const indexRef = useRef(0);
  const navRef = useRef<HTMLDivElement>(null);
  const [pinnedState, setPinnedState] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);

  const tabs = sections && sections.length > 1 ? sections : null;
  const active = tabs?.[index] ?? { label: title, href, video, image };

  useEffect(() => {
    const element = cardRef.current;
    if (!element || matches(REDUCED_MOTION) || !("IntersectionObserver" in window)) return;

    element.setAttribute("data-reveal", "");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        element.setAttribute("data-revealed", "true");
        observer.unobserve(element);
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  /** The clip the current selection points at, read live (never from a stale render). */
  const currentVideo = () => (tabs ? tabs[indexRef.current].video : video);

  /** Pause, reset, and drop this card's claim on the shared player. */
  const stop = useCallback(() => {
    const element = videoRef.current;
    pinned.current = false;
    setPinnedState(false);
    setPlaying(false);
    if (element) {
      element.pause();
      element.currentTime = 0;
    }
    if (activePlayer?.card === card) activePlayer = null;
  }, [card]);

  /** Start the given clip, taking playback away from any other card. */
  const play = useCallback(
    (source: string) => {
      if (matches(REDUCED_MOTION)) return;
      const element = videoRef.current;
      if (!element) return;
      if (activePlayer && activePlayer.card !== card) activePlayer.stop();
      activePlayer = { card, stop };
      // Setting the attribute is enough: it invokes the media load algorithm.
      if (element.getAttribute("src") !== source) element.setAttribute("src", source);
      element.play().then(
        () => {
          if (activePlayer?.card === card) setPlaying(true);
          else {
            element.pause();
            element.currentTime = 0;
          }
        },
        () => setPlaying(false),
      );
    },
    [card, stop],
  );

  useEffect(() => {
    const reduced = window.matchMedia(REDUCED_MOTION);
    const onChange = () => {
      if (reduced.matches) stop();
    };
    reduced.addEventListener("change", onChange);
    return () => {
      reduced.removeEventListener("change", onChange);
      stop();
    };
  }, [stop]);

  function handlePointerEnter(event: PointerEvent<HTMLLIElement>) {
    if (event.pointerType !== "mouse") return;
    hovering.current = true;
    if (matches(HOVER_CAPABLE)) play(currentVideo());
  }

  function handlePointerLeave() {
    hovering.current = false;
    if (!focused.current && !pinned.current) stop();
  }

  function handleFocus() {
    focused.current = true;
    if (matches(HOVER_CAPABLE)) play(currentVideo());
  }

  function handleBlur(event: FocusEvent<HTMLLIElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    focused.current = false;
    if (!hovering.current && !pinned.current) stop();
  }

  function toggleTouchPlayback() {
    if (pinned.current) {
      stop();
      return;
    }
    pinned.current = true;
    setPinnedState(true);
    play(currentVideo());
  }

  function selectSection(next: number) {
    if (!tabs || next === indexRef.current) return;
    indexRef.current = next;
    setIndex(next);
    const source = tabs[next].video;
    const element = videoRef.current;
    // On touch only the labelled play control starts a clip, so switching
    // section there swaps the poster/source without autoplaying.
    const shouldPlay = pinned.current || (matches(HOVER_CAPABLE) && (playing || hovering.current || focused.current));
    // Point the element at the new clip. Nothing is fetched while motion is
    // reduced: there the section swap only changes the poster.
    if (element && !matches(REDUCED_MOTION)) {
      element.setAttribute("src", source);
      element.currentTime = 0;
    }
    if (shouldPlay) play(source);
    else setPlaying(false);
  }

  /** Left/right arrows move along the section strip and swap the clip. */
  function handleNavKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!tabs) return;
    const buttons = [...(navRef.current?.querySelectorAll("button") ?? [])];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % buttons.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + buttons.length) % buttons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[next].focus();
    selectSection(next);
  }

  return (
    <li
      ref={cardRef}
      className={styles.card}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <a className={styles.cardLink} href={href} target="_blank" rel="noreferrer">
        <span className={styles.imageWrap}>
          <Image
            className={styles.image}
            src={active.image}
            alt={imageAlt}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            draggable={false}
          />
          {/* No `poster`: the optimised <Image> underneath is the still frame,
              always visible until a clip actually plays. A `poster` URL would
              bypass next/image and pull the full-size PNG on first load. */}
          <video
            ref={videoRef}
            className={`${styles.video} ${playing ? styles.videoVisible : ""}`}
            data-src={active.video}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
          />
        </span>
        {children}
      </a>
      <div className={styles.previewControls} data-preview-controls>
        <button
          type="button"
          className={styles.previewPlay}
          aria-pressed={pinnedState}
          onClick={toggleTouchPlayback}
        >
          {pinnedState ? <PauseIcon /> : <PlayIcon />}
          <span>{pinnedState ? "Pause preview" : "Play preview"}</span>
        </button>
        {tabs ? (
          <div
            className={styles.sectionNav}
            role="group"
            aria-label={`Preview sections of ${title}`}
            ref={navRef}
            onKeyDown={handleNavKeyDown}
          >
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                type="button"
                className={styles.sectionButton}
                aria-pressed={i === index}
                onClick={() => selectSection(i)}
                onPointerEnter={() => selectSection(i)}
                onFocus={() => selectSection(i)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
