"use client";

// Tiny module-scoped bus for reveal open/close events; the counter
// subscribes. Reset on reload is inherent (no persistence — matches ped.ro).
type Listener = (opened: boolean) => void;

const listeners = new Set<Listener>();

export function onReveal(opened: boolean) {
  listeners.forEach((l) => l(opened));
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
