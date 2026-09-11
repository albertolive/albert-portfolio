type Point = { x: number; y: number };

export function planeFlight({
  start,
  distance,
  rise,
  noseDive,
}: {
  start: Point;
  distance: number;
  rise: number;
  noseDive: boolean;
}): Keyframe[] {
  const travel = distance * (noseDive ? 0.78 : 1);
  const transform = (x: number, y: number, pitch: number, bank = 0) =>
    `translate3d(${x}px, ${y}px, 0) perspective(500px) rotate(${pitch}deg) rotateX(${bank}deg)`;
  const frames: Keyframe[] = Array.from({ length: 61 }, (_, index) => {
    const t = index / 60;
    const x = start.x + travel * t * (2 - t);
    const y = start.y - rise * 4 * t * (1 - t);
    const pitch = Math.max(-35, Math.min(noseDive ? 72 : 28,
      Math.atan2(-rise * 4 * (1 - 2 * t), Math.max(1, travel * 2 * (1 - t))) * 180 / Math.PI));
    const bank = Math.sin(t * Math.PI * (noseDive ? 4 : 2)) * 18;
    return { offset: t * 0.76, transform: transform(x, y, pitch, bank), opacity: 1 };
  });
  const x = start.x + travel;
  frames.push(
    { offset: 0.81, transform: transform(x + 2, start.y + 3, noseDive ? 80 : -4), opacity: 1, easing: "ease-out" },
    { offset: 0.86, transform: transform(x, start.y, noseDive ? 58 : 3), opacity: 1, easing: "ease-out" },
    { offset: 0.94, transform: transform(x, start.y + 2, noseDive ? 66 : 0), opacity: 1 },
    { offset: 1, transform: transform(x, start.y + 2, noseDive ? 66 : 0), opacity: 0 },
  );
  return frames;
}
