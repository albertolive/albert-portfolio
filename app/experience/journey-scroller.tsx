"use client";

import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "../_components/icons";
import styles from "./page.module.css";

type JourneyScrollerProps = {
  ariaLabel: string;
  children: ReactNode;
};

export default function JourneyScroller({ ariaLabel, children }: JourneyScrollerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateControls = () => {
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      setAtStart(viewport.scrollLeft <= 1);
      setAtEnd(viewport.scrollLeft >= maxScrollLeft - 1);
    };

    const resizeObserver = new ResizeObserver(updateControls);
    updateControls();
    viewport.addEventListener("scroll", updateControls, { passive: true });
    resizeObserver.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", updateControls);
      resizeObserver.disconnect();
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const distance = event.clientX - drag.current.startX;
    if (Math.abs(distance) > 4) drag.current.moved = true;
    event.currentTarget.scrollLeft = drag.current.scrollLeft - distance;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    drag.current.active = false;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;
    const step = Math.round(viewport.clientWidth * 0.75);
    const movements: Partial<Record<typeof event.key, number>> = {
      ArrowLeft: -80,
      ArrowRight: 80,
      PageUp: -step,
      PageDown: step,
      Home: -viewport.scrollWidth,
      End: viewport.scrollWidth,
    };
    const movement = movements[event.key];

    if (movement === undefined) return;
    event.preventDefault();
    viewport.scrollBy({ left: movement });
  };

  const scroll = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const step = Math.min(424, viewport.clientWidth * 0.8);
    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
    const left = Math.max(0, Math.min(maxScrollLeft, viewport.scrollLeft + direction * step));
    viewport.scrollLeft = left;
  };

  return (
    <section className={styles.journey} aria-label={ariaLabel}>
      <div
        ref={viewportRef}
        className={styles.journeyViewport}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onClickCapture={(event) => {
          if (drag.current.moved) {
            event.preventDefault();
            event.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        {children}
      </div>
      <div className={styles.journeyControls}>
        <span>Drag, swipe or use arrow keys</span>
        <div className={styles.journeyButtons}>
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous experience" disabled={atStart}>
            <ArrowLeftIcon />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next experience" disabled={atEnd}>
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </section>
  );
}
