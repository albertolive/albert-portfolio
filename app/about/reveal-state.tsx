"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

// Reveals stay mounted inside their page owner, even when an ancestor closes.
type RevealOwner = {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  openCount: number;
};

const RevealOwnerContext = createContext<RevealOwner | null>(null);

export function RevealProvider({ children }: { children: React.ReactNode }) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isOpen = useCallback(
    (id: string) => openIds.has(id),
    [openIds],
  );

  const value = useMemo(
    () => ({ isOpen, toggle, openCount: openIds.size }),
    [isOpen, toggle, openIds.size],
  );

  return <RevealOwnerContext.Provider value={value}>{children}</RevealOwnerContext.Provider>;
}

function useOwner(): RevealOwner {
  const ctx = useContext(RevealOwnerContext);
  if (!ctx) throw new Error("useReveal must be used inside <RevealProvider>");
  return ctx;
}

export function useReveal(id: string) {
  const { isOpen, toggle } = useOwner();
  return { open: isOpen(id), toggle: () => toggle(id) };
}

export function useRevealOpenCount(): number {
  return useOwner().openCount;
}
