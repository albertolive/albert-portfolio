"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { planeFlight } from "./plane-flight";
import styles from "./montseny-scene.module.css";

type Point = { x: number; y: number };
type Drag = Point & { pointerId: number; origin: Point; startedAt: number; samples: Array<Point & { time: number }> };

function PaperPlane() {
  return (
    <svg viewBox="0 0 64 48" fill="none" aria-hidden="true">
      <path d="M3 5 61 21 11 42 21 24Z" fill="#d5d3c4" stroke="#74776a" strokeLinejoin="round" />
      <path d="M3 5 61 21 21 24Z" fill="#fffdf4" stroke="#74776a" strokeLinejoin="round" />
      <path d="M21 24 61 21 38 38Z" fill="#eee8d6" stroke="#74776a" strokeLinejoin="round" />
      <path d="m11 12 8 3" stroke="#ff5a36" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function MontsenyScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const launchRef = useRef<HTMLButtonElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const launches = useRef(0);
  const dragRef = useRef<Drag | null>(null);
  const [flying, setFlying] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const stop = () => animationRef.current?.cancel();
    const resize = new ResizeObserver(stop);
    resize.observe(scene);
    const intersection = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    intersection.observe(scene);
    const visibility = () => { if (document.hidden) stop(); };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", stop);
    return () => {
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", stop);
      const animation = animationRef.current;
      if (animation) {
        animation.onfinish = null;
        animation.oncancel = null;
        animation.cancel();
      }
    };
  }, []);

  function launch(droppedStart?: Point, velocity: Point = { x: 0.7, y: -0.2 }) {
    const scene = sceneRef.current;
    const plane = planeRef.current;
    const button = launchRef.current;
    if (!scene || !plane || !button || animationRef.current || dragRef.current) return;
    const rect = scene.getBoundingClientRect();
    const start = droppedStart ?? { x: button.offsetLeft + 4, y: button.offsetTop + 4 };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const noseDive = launches.current++ % 2 === 1;
    const throwSpeed = Math.min(2.5, Math.hypot(velocity.x, velocity.y));
    const travelFactor = Math.min(throwSpeed / 1.2, 1);
    const distance = droppedStart
      ? Math.sign(velocity.x || 1) * (20 + Math.abs(velocity.x) * 600)
      : rect.width - start.x - 88;
    const frames = reduce
      ? [
          { transform: `translate(${start.x}px, ${start.y}px)`, opacity: 0.4 },
          { transform: `translate(${start.x}px, ${start.y}px)`, opacity: 1 },
          { transform: `translate(${start.x}px, ${start.y}px)`, opacity: 0 },
        ]
        : planeFlight({ start, distance, rise: Math.min(rect.height * 0.42, 20 + travelFactor * 130), noseDive });
    setFlying(true);
    setAnnouncement(reduce ? "Paper plane launched. Reduced motion is on." : "Paper plane launched. Press Escape to stop the flight.");
    const animation = plane.animate(frames, { duration: reduce ? 200 : 3600 - Math.min(throwSpeed, 1.2) * 1500, fill: "forwards", easing: "linear" });
    animationRef.current = animation;
    animation.onfinish = () => {
      animation.oncancel = null;
      animation.cancel();
      animationRef.current = null;
      setFlying(false);
      setAnnouncement(noseDive ? "A slightly clumsy landing. Ready for another throw." : "Paper plane landed. Ready for another throw.");
    };
    animation.oncancel = () => {
      animationRef.current = null;
      setFlying(false);
      setAnnouncement("Flight stopped. Ready for another throw.");
    };
  }

  function clearDrag(button: HTMLButtonElement | null) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!button) return;
    button.style.transform = "";
    if (drag && button.hasPointerCapture(drag.pointerId)) button.releasePointerCapture(drag.pointerId);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (animationRef.current || dragRef.current || !event.isPrimary || event.button !== 0) return;
    const button = event.currentTarget;
    const scene = sceneRef.current;
    if (!scene) return;
    button.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: { x: button.offsetLeft, y: button.offsetTop },
      startedAt: performance.now(),
      samples: [{ x: event.clientX, y: event.clientY, time: performance.now() }],
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const scene = sceneRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !scene) return;
    const button = event.currentTarget;
    const now = performance.now();
    drag.samples.push({ x: event.clientX, y: event.clientY, time: now });
    while (drag.samples.length > 2 && now - drag.samples[0].time > 140) drag.samples.shift();
    const maxX = Math.max(0, scene.clientWidth - button.offsetWidth);
    const maxY = Math.max(0, scene.clientHeight - button.offsetHeight);
    const x = Math.max(0, Math.min(maxX, drag.origin.x + event.clientX - drag.x));
    const y = Math.max(0, Math.min(maxY, drag.origin.y + event.clientY - drag.y));
    button.style.transform = `translate(${x - drag.origin.x}px, ${y - drag.origin.y}px)`;
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const button = event.currentTarget;
    const scene = sceneRef.current;
    const maxX = scene ? Math.max(0, scene.clientWidth - button.offsetWidth) : drag.origin.x;
    const maxY = scene ? Math.max(0, scene.clientHeight - button.offsetHeight) : drag.origin.y;
    const x = Math.max(0, Math.min(maxX, drag.origin.x + event.clientX - drag.x));
    const y = Math.max(0, Math.min(maxY, drag.origin.y + event.clientY - drag.y));
    const now = performance.now();
    const previous = drag.samples.find(sample => now - sample.time <= 140) ?? { x: event.clientX, y: event.clientY, time: now };
    const elapsed = Math.max(16, now - previous.time);
    const velocity = { x: Math.max(-2.5, Math.min(2.5, (event.clientX - previous.x) / elapsed)), y: Math.max(-2.5, Math.min(2.5, (event.clientY - previous.y) / elapsed)) };
    clearDrag(button);
    launch({ x: x + 4, y: y + 4 }, velocity);
  }

  return (
    <figure className={styles.landscape}>
      <div className={styles.scene} ref={sceneRef} data-flying={flying}>
        <Image
          src="/images/montseny-snow-panorama.jpg"
          alt="Montseny seen from Cardedeu, photographed by Albert Olivé"
          fill
          sizes="100vw"
          className={styles.landscapeImage}
          draggable={false}
        />
        <button
          type="button"
          ref={launchRef}
          className={styles.planeLaunch}
          aria-label="Launch paper plane"
          aria-describedby="plane-hint"
          aria-disabled={flying}
          onClick={(event) => { if (event.detail === 0) launch(); }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={(event) => { if (dragRef.current?.pointerId === event.pointerId) clearDrag(event.currentTarget); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              clearDrag(event.currentTarget);
              animationRef.current?.cancel();
            }
          }}
        ><PaperPlane /></button>
        <div ref={planeRef} className={styles.planeFlight} aria-hidden="true"><PaperPlane /></div>
      </div>
      <figcaption className={styles.sceneCaption}>
        <span>Montseny, from Cardedeu. <span className={styles.photoCredit}>A photo of mine.</span></span>
        <span id="plane-hint">A little spare paper. Give it a throw.</span>
      </figcaption>
      <p className={styles.srOnly} role="status">{announcement}</p>
    </figure>
  );
}
