"use client";

import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import styles from "../page.module.css";

const SKILLS = [
  "TypeScript", "JavaScript", "React", "Next.js", "React Native", "Node.js",
  "Tailwind CSS", "Python", "XGBoost", "scikit-learn", "OpenAI API", "Claude",
  "Langfuse", "Remotion", "AWS", "Docker", "Redis", "GraphQL", "MySQL",
  "Coolify", "Solidity", "Ethereum", "IOTA", "Verifiable Credentials",
] as const;

const COLORS = ["mint", "yellow", "coral", "pink", "blue", "purple", "green"] as const;

type Drag = {
  body: Matter.Body;
  constraint: Matter.Constraint;
  pointerId: number;
  previous: { x: number; y: number; time: number };
  velocity: Matter.Vector;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export default function SkillsPlayground() {
  const boardRef = useRef<HTMLUListElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const engineRef = useRef<Matter.Engine | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const activeRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const visibleRef = useRef(true);
  const [active, setActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState("Skills are resting.");

  function setRunning(next: boolean) {
    activeRef.current = next;
    setActive(next);
    setAnnouncement(next ? "Physics playing." : "Physics paused.");
  }

  function reset() {
    const board = boardRef.current;
    if (!board) return;
    bodiesRef.current.forEach((body, index) => {
      const element = pillRefs.current[index];
      if (!element) return;
      const halfWidth = element.offsetWidth / 2;
      const halfHeight = element.offsetHeight / 2;
      const staticColumns = board.clientWidth < 600 ? 3 : 6;
      const column = index % staticColumns;
      const row = Math.floor(index / staticColumns);
      const resting = reducedMotionRef.current && !activeRef.current;
      const x = resting
        ? ((column + 0.5) * board.clientWidth) / staticColumns
        : halfWidth + 24 + Math.random() * Math.max(0, board.clientWidth - element.offsetWidth - 48);
      const y = resting ? 24 + row * 52 : -halfHeight - 24 - index * 48 - Math.random() * 16;
      Matter.Body.setPosition(body, {
        x: clamp(x, halfWidth + 4, board.clientWidth - halfWidth - 4),
        y,
      });
      Matter.Body.setAngle(body, resting ? 0 : (Math.random() - 0.5) * 0.7);
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Sleeping.set(body, false);
    });
    setAnnouncement(reducedMotionRef.current && !activeRef.current ? "Skills reset." : "Skills raining into the pile.");
  }

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const engine = Matter.Engine.create({ enableSleeping: true });
    engine.gravity.y = 0.92;
    engineRef.current = engine;

    const makeWalls = () => {
      const width = board.clientWidth;
      const height = board.clientHeight;
      const options = { isStatic: true, restitution: 0.65, friction: 0.2 };
      return [
        Matter.Bodies.rectangle(width / 2, height - 4, width + 80, 40, options),
        Matter.Bodies.rectangle(0, height / 2 - height, 40, height * 3 + 80, options),
        Matter.Bodies.rectangle(width, height / 2 - height, 40, height * 3 + 80, options),
      ];
    };

    let walls = makeWalls();
    const sizes = pillRefs.current.map((element) => ({ width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 }));
    let boardWidth = board.clientWidth;
    let boardHeight = board.clientHeight;
    const bodies = pillRefs.current.flatMap((element, index) => {
      if (!element) return [];
      const body = Matter.Bodies.rectangle(0, 0, element.offsetWidth, element.offsetHeight, {
        chamfer: { radius: element.offsetHeight / 2 },
        restitution: 0.54,
        friction: 0.22,
        frictionAir: 0.018,
        density: 0.0015,
        label: SKILLS[index],
      });
      return [body];
    });
    bodiesRef.current = bodies;
    Matter.Composite.add(engine.world, [...walls, ...bodies]);
    const render = () => {
      bodies.forEach((body, index) => {
        const element = pillRefs.current[index];
        if (!element) return;
        element.style.transform = `translate3d(${body.position.x - sizes[index].width / 2}px, ${body.position.y - sizes[index].height / 2}px, 0) rotate(${body.angle}rad)`;
      });
    };

    let frame = 0;
    let previous = performance.now();
    let accumulated = 0;
    const step = 1000 / 60;
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 32);
      previous = now;
      if (activeRef.current && visibleRef.current) {
        accumulated += delta;
        while (accumulated >= step) {
          Matter.Engine.update(engine, step);
          accumulated -= step;
        }
        render();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    let inViewport = true;
    const visibility = () => {
      visibleRef.current = inViewport && document.visibilityState === "visible";
      previous = performance.now();
    };
    document.addEventListener("visibilitychange", visibility);

    const intersection = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      visibility();
      previous = performance.now();
    });
    intersection.observe(board);

    const resize = new ResizeObserver(() => {
      if (board.clientWidth === boardWidth && board.clientHeight === boardHeight) return;
      boardWidth = board.clientWidth;
      boardHeight = board.clientHeight;
      Matter.Composite.remove(engine.world, walls);
      walls = makeWalls();
      Matter.Composite.add(engine.world, walls);
      bodies.forEach((body, index) => {
        const element = pillRefs.current[index];
        if (!element) return;
        const width = element.offsetWidth;
        const height = element.offsetHeight;
        const angle = body.angle;
        Matter.Body.setAngle(body, 0);
        Matter.Body.scale(body, width / sizes[index].width, height / sizes[index].height);
        Matter.Body.setAngle(body, angle);
        sizes[index] = { width, height };
        const halfWidth = (body.bounds.max.x - body.bounds.min.x) / 2;
        const halfHeight = (body.bounds.max.y - body.bounds.min.y) / 2;
        Matter.Body.setPosition(body, {
          x: clamp(body.position.x, halfWidth + 20, boardWidth - halfWidth - 20),
          y: Math.min(body.position.y, boardHeight - halfHeight - 24),
        });
        Matter.Sleeping.set(body, false);
      });
      // A narrower board cannot preserve the old packing without overlapping bodies.
      if (activeRef.current) reset();
      render();
    });
    resize.observe(board);

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionPreference.matches;
    activeRef.current = !motionPreference.matches;
    reset();
    render();
    board.dataset.ready = "true";
    const initialFrame = requestAnimationFrame(() => {
      setActive(activeRef.current);
      setReducedMotion(motionPreference.matches);
    });
    const changeMotionPreference = () => {
      reducedMotionRef.current = motionPreference.matches;
      setReducedMotion(motionPreference.matches);
      if (motionPreference.matches) setRunning(false);
    };
    motionPreference.addEventListener("change", changeMotionPreference);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(initialFrame);
      delete board.dataset.ready;
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      motionPreference.removeEventListener("change", changeMotionPreference);
      Matter.Engine.clear(engine);
      engineRef.current = null;
      bodiesRef.current = [];
    };
  }, []);

  function pointerPosition(event: ReactPointerEvent<HTMLButtonElement>) {
    const rect = boardRef.current?.getBoundingClientRect();
    return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null;
  }

  function startDrag(index: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !engineRef.current || dragRef.current || reducedMotionRef.current) return;
    const point = pointerPosition(event);
    const body = bodiesRef.current[index];
    if (!point || !body) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    Matter.Sleeping.set(body, false);
    const constraint = Matter.Constraint.create({
      pointA: point,
      bodyB: body,
      pointB: Matter.Vector.rotate(Matter.Vector.sub(point, body.position), -body.angle),
      stiffness: 0.22,
      damping: 0.08,
      length: 0,
    });
    Matter.Composite.add(engineRef.current.world, constraint);
    dragRef.current = {
      body,
      constraint,
      pointerId: event.pointerId,
      previous: { ...point, time: event.timeStamp },
      velocity: { x: 0, y: 0 },
    };
    setRunning(true);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const point = pointerPosition(event);
    if (!drag || drag.pointerId !== event.pointerId || !point) return;
    const now = event.timeStamp;
    const elapsed = Math.max(now - drag.previous.time, 1);
    drag.velocity = {
      x: clamp(((point.x - drag.previous.x) / elapsed) * 16.667, -32, 32),
      y: clamp(((point.y - drag.previous.y) / elapsed) * 16.667, -32, 32),
    };
    drag.previous = { ...point, time: now };
    drag.constraint.pointA = point;
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !engineRef.current) return;
    Matter.Composite.remove(engineRef.current.world, drag.constraint);
    const cancelled = event.type !== "pointerup";
    const heldStill = event.timeStamp - drag.previous.time > 100;
    Matter.Body.setVelocity(drag.body, cancelled || heldStill ? { x: 0, y: 0 } : drag.velocity);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  function nudge(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (reducedMotionRef.current) return;
    if (event.key === "Escape" || event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) setRunning(event.key === "Escape" ? false : !activeRef.current);
      return;
    }
    const directions: Record<string, Matter.Vector> = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    };
    const direction = directions[event.key];
    const body = bodiesRef.current[index];
    if (!direction || !body) return;
    event.preventDefault();
    const speed = event.shiftKey ? 14 : 8;
    Matter.Sleeping.set(body, false);
    Matter.Body.setVelocity(body, {
      x: body.velocity.x + direction.x * speed,
      y: body.velocity.y + direction.y * speed,
    });
    setRunning(true);
    setAnnouncement(`${SKILLS[index]} nudged ${event.key.replace("Arrow", "").toLowerCase()}.`);
  }

  return (
    <section className={styles.pileSection} aria-labelledby="skills-title">
      <div className={styles.pileHeading}>
        <div>
          <p className={styles.pileHint}>A few tools I reach for. <span aria-hidden="true">↓</span></p>
          <h2 id="skills-title" className={styles.srOnly}>Skills with momentum</h2>
        </div>
      </div>
      <p className={styles.srOnly} id="skills-instructions">
        Grab and throw a skill into the pile. The arrows nudge a focused skill; Shift adds more force.
        Space or Enter pauses or resumes the pile. Escape pauses it.
      </p>
      <ul className={styles.pileBoard} data-active={active} ref={boardRef} aria-label="Technology skills">
        {SKILLS.map((skill, index) => (
          <li className={styles.skillItem} key={skill}>
          <button
            aria-describedby={reducedMotion ? undefined : "skills-instructions"}
            aria-label={reducedMotion ? skill : `${skill}, draggable skill`}
            disabled={reducedMotion}
            className={`${styles.skillPill} ${styles[COLORS[index % COLORS.length]]}`}
            onKeyDown={(event) => nudge(index, event)}
            onLostPointerCapture={finishDrag}
            onPointerCancel={finishDrag}
            onPointerDown={(event) => startDrag(index, event)}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            ref={(node) => { pillRefs.current[index] = node; }}
            type="button"
          >{skill}</button>
          </li>
        ))}
      </ul>
      <p className={styles.srOnly} aria-live="polite">{announcement}</p>
    </section>
  );
}
