"use client";

import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { coverLevel, homeR2, REDUCED_MOTION_QUERY } from "@/lib/video";
import styles from "../page.module.css";

type PlaybackState = "loading" | "playing" | "paused" | "blocked" | "error" | "reduced-motion";

export default function HomeR2Video() {
  const ref = useRef<HTMLVideoElement>(null);
  const controls = useRef<{ play: () => void; pause: () => void } | null>(null);
  const [state, setState] = useState<PlaybackState>("loading");

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia(REDUCED_MOTION_QUERY);
    let hls: Hls | null = null;
    let generation = 0;
    let disposed = false;
    let initializing = false;
    let wanted = true;
    let blocked = false;
    let failed = false;
    let pendingPlay = false;

    video.muted = true;
    video.defaultMuted = true;
    const allowed = () => !disposed && !motion.matches && !document.hidden && wanted && !failed;
    const unload = () => {
      generation += 1;
      initializing = pendingPlay = false;
      hls?.destroy();
      hls = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    const fail = () => {
      failed = true;
      unload();
      if (!disposed) setState("error");
    };
    const tryPlay = () => {
      if (!allowed() || blocked || pendingPlay || !video.paused) return;
      const attempt = generation;
      pendingPlay = true;
      void video.play().catch((error: unknown) => {
        if (attempt !== generation || !allowed()) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        blocked = true;
        hls?.stopLoad();
        setState("blocked");
      }).finally(() => {
        if (attempt === generation) pendingPlay = false;
      });
    };
    const resize = () => {
      if (hls) hls.autoLevelCapping = coverLevel(hls.levels, video.clientWidth, video.clientHeight, window.devicePixelRatio);
    };
    const sync = async () => {
      if (disposed) return;
      if (motion.matches) {
        blocked = false;
        unload();
        setState("reduced-motion");
        return;
      }
      if (!allowed()) {
        video.pause();
        hls?.stopLoad();
        if (!document.hidden && !failed) setState("paused");
        return;
      }
      if (!hls && !video.hasAttribute("src")) {
        if (initializing) return;
        initializing = true;
        const attempt = generation;
        setState("loading");
        try {
          if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = homeR2.src;
          } else {
            const { default: Hls } = await import("hls.js");
            if (attempt !== generation || !allowed()) return;
            if (!Hls.isSupported()) { fail(); return; }
            hls = new Hls({ maxBufferLength: 30, abrEwmaDefaultEstimate: 5_000_000 });
            hls.on(Hls.Events.MANIFEST_PARSED, resize);
            hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) fail(); });
            hls.attachMedia(video);
            hls.loadSource(homeR2.src);
          }
        } catch {
          if (attempt === generation && !disposed) fail();
          return;
        } finally {
          if (attempt === generation) initializing = false;
        }
      }
      if (!blocked) { hls?.startLoad(); tryPlay(); }
    };
    const playing = () => { if (allowed()) setState("playing"); else video.pause(); };
    const paused = () => { if (!disposed && !motion.matches && !failed && !blocked) setState("paused"); };
    const syncPlayback = () => { void sync(); };
    controls.current = {
      play: () => { wanted = true; blocked = failed = false; syncPlayback(); },
      pause: () => { wanted = false; video.pause(); hls?.stopLoad(); setState("paused"); },
    };
    const observer = new ResizeObserver(resize);
    observer.observe(video);
    video.addEventListener("canplay", tryPlay);
    video.addEventListener("playing", playing);
    video.addEventListener("pause", paused);
    video.addEventListener("error", fail);
    motion.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => {
      disposed = true;
      controls.current = null;
      observer.disconnect();
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("playing", playing);
      video.removeEventListener("pause", paused);
      video.removeEventListener("error", fail);
      motion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      unload();
    };
  }, []);

  return (
    <>
      <div className={styles.frame} style={{ backgroundImage: `url("${homeR2.poster}")` }} aria-hidden="true">
        <video ref={ref} className={styles.video} data-state={state}
          poster={homeR2.poster} muted loop playsInline preload="auto"
          disablePictureInPicture tabIndex={-1} />
      </div>
      {state !== "reduced-motion" && (
        <button type="button" className={styles.videoControl} disabled={state === "loading"}
          onClick={() => state === "playing" ? controls.current?.pause() : controls.current?.play()}>
          {state === "playing" ? "Pause video" : "Play video"}
        </button>
      )}
    </>
  );
}
