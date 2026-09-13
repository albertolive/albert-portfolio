"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Page-owned reveal state (plan Phase 3.3-3.5). Replaces the module-global
// reveal event bus: one owner per page, so navigation resets state and the
// open counter (openIds.size) cannot desynchronize on unmounts or nesting.
// Parent-close behavior: closing a reveal closes all of its descendants.
type RevealOwner = {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  register: (id: string, parentId: string | null) => () => void;
  openCount: number;
};

const RevealOwnerContext = createContext<RevealOwner | null>(null);

export function RevealProvider({ children }: { children: React.ReactNode }) {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const parentOf = useRef(new Map<string, string | null>());

  const register = useCallback((id: string, parentId: string | null) => {
    parentOf.current.set(id, parentId);
    return () => {
      parentOf.current.delete(id);
      setOpenIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Cascade: any open reveal whose parent chain is no longer fully
        // open closes too (one pass per depth level; depth here is <= 3).
        let changed = true;
        while (changed) {
          changed = false;
          for (const [child, parent] of parentOf.current) {
            if (parent !== null && next.has(child) && !next.has(parent)) {
              next.delete(child);
              changed = true;
            }
          }
        }
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
    () => ({ isOpen, toggle, register, openCount: openIds.size }),
    [isOpen, toggle, register, openIds.size],
  );

  return <RevealOwnerContext.Provider value={value}>{children}</RevealOwnerContext.Provider>;
}

function useOwner(): RevealOwner {
  const ctx = useContext(RevealOwnerContext);
  if (!ctx) throw new Error("useReveal must be used inside <RevealProvider>");
  return ctx;
}

export function useReveal(id: string, parentId: string | null) {
  const { isOpen, toggle, register } = useOwner();
  useEffect(() => register(id, parentId), [id, parentId, register]);
  return { open: isOpen(id), toggle: () => toggle(id) };
}

export function useRevealOpenCount(): number {
  return useOwner().openCount;
}
