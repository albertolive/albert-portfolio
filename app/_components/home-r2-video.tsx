"use client";

import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import {
  coverLevel,
  floorLevel,
  HERO_HONORS_REDUCED_MOTION,
  homeR2,
  parseLevels,
  REDUCED_MOTION_QUERY,
} from "@/lib/video";
import styles from "../page.module.css";

type PlaybackState =
  | "loading"
  | "playing"
  | "paused"
  | "blocked"
  | "error"
  | "reduced-motion";

// Muted inline autoplay is still refused by iOS Low Power Mode, battery savers,
// and in-app browsers until the first gesture. Those refusals are recoverable,
// so a refused play() retries on a short ladder and again on every event that
// grants playback, instead of leaving a frozen poster on the page.
const RETRY_DELAYS = [200, 700, 1500, 3000, 6000, 12000, 24000];
const ACTIVATION_EVENTS = ["pointerdown", "pointerup", "touchstart", "keydown", "wheel", "focus"] as const;

export default function HomeR2Video() {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlaybackState>("loading");

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia(REDUCED_MOTION_QUERY);
    let hls: Hls | null = null;
    let generation = 0;
    let disposed = false;
    let initializing = false;
    let streaming = false;
    let parsed = false;
    let failed = false;
    let playing = false;
    let step = 0;
    let retry: number | undefined;

    // Autoplay decisions read properties, not markup: set them before the
    // browser evaluates its media policy.
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;

    const wanted = () =>
      !disposed &&
      !failed &&
      !document.hidden &&
      (HERO_HONORS_REDUCED_MOTION ? !motion.matches : true);

    const clearRetry = () => {
      if (retry !== undefined) window.clearTimeout(retry);
      retry = undefined;
    };
    const unload = () => {
      generation += 1;
      initializing = playing = false;
      clearRetry();
      hls?.destroy();
      hls = null;
      streaming = parsed = false;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    const fail = () => {
      failed = true;
      unload();
      if (!disposed) setState("error");
    };
    // Pin the rendition that covers the frame. hls.js picks the first fragment
    // from abrEwmaDefaultEstimate, so an unpinned ladder opens on a soft rung
    // and climbs. The bitrate floor, the cap, and the start level come from the
    // measured frame and are applied before any fragment is requested.
    const bounds = () => {
      if (!hls || hls.levels.length === 0) return;
      const cover = coverLevel(hls.levels, video.clientWidth, video.clientHeight, window.devicePixelRatio);
      if (cover < 0) return;
      hls.autoLevelCapping = cover;
      hls.config.minAutoBitrate = hls.levels[floorLevel(hls.levels, cover)].bitrate;
      hls.startLevel = cover;
    };
    const load = () => {
      // Waiting for MANIFEST_PARSED keeps startLoad() out of hls.js's
      // "forceStartLoad" path, where the first fragment would be requested
      // before the pin above is applied.
      if (!hls || !parsed || streaming || !wanted()) return;
      hls.startLoad();
      streaming = true;
    };
    const stop = () => {
      if (!hls || !streaming) return;
      hls.stopLoad();
      streaming = false;
    };
    const retryLater = () => {
      if (!wanted() || step >= RETRY_DELAYS.length) return;
      clearRetry();
      const delay = RETRY_DELAYS[step];
      step += 1;
      retry = window.setTimeout(() => {
        retry = undefined;
        void sync();
      }, delay);
    };
    // The master-side ladder lives at homeR2.src; the native path reads it once
    // and requests the single rendition that covers the frame, so the platform
    // player has no ladder to switch through. Falls back to the master, which
    // plays through the platform's own adaptive selection.
    const nativeSource = async () => {
      try {
        const response = await fetch(homeR2.src);
        if (response.ok) {
          const levels = parseLevels(await response.text(), homeR2.src);
          const cover = coverLevel(levels, video.clientWidth, video.clientHeight, window.devicePixelRatio);
          if (cover >= 0) return levels[cover].url;
        }
      } catch {
        /* fall through to the master ladder */
      }
      return homeR2.src;
    };
    const attemptPlay = () => {
      if (!wanted() || playing || !video.paused) return;
      const attempt = generation;
      playing = true;
      void video
        .play()
        .catch((error: unknown) => {
          if (attempt !== generation || !wanted()) return;
          if (error instanceof DOMException && error.name === "AbortError")
            return;
          // Refused before any user activation: release the bandwidth, keep
          // the poster, and resume on the next gesture or retry.
          stop();
          setState("blocked");
          retryLater();
        })
        .finally(() => {
          if (attempt === generation) playing = false;
        });
    };
    const sync = async () => {
      if (disposed) return;
      if (HERO_HONORS_REDUCED_MOTION && motion.matches) {
        unload();
        setState("reduced-motion");
        return;
      }
      if (!wanted()) {
        video.pause();
        stop();
        if (!failed) setState("paused");
        return;
      }
      if (!hls && !video.hasAttribute("src")) {
        if (initializing) return;
        initializing = true;
        const attempt = generation;
        setState("loading");
        try {
          if (video.canPlayType("application/vnd.apple.mpegurl")) {
            // Native HLS (Safari, and Chrome on macOS) runs its own adaptive
            // bitrate and opens on a low rendition, so it gets the single
            // rendition that covers the frame, with no ladder to climb.
            video.src = await nativeSource();
            if (attempt !== generation || !wanted()) return;
          } else {
            const { default: Hls } = await import("hls.js");
            if (attempt !== generation || !wanted()) return;
            if (!Hls.isSupported()) {
              fail();
              return;
            }
            hls = new Hls({
              // The first fragment waits for the measured frame.
              autoStartLoad: false,
              maxBufferLength: 30,
              maxMaxBufferLength: 120,
              abrEwmaDefaultEstimate: 8_000_000,
            });
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              parsed = true;
              bounds();
              load();
            });
            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) fail();
            });
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
      load();
      attemptPlay();
    };
    const activated = () => {
      step = 0;
      void sync();
    };
    const resized = () => {
      bounds();
    };
    const started = () => {
      step = 0;
      if (wanted()) setState("playing");
    };
    const interrupted = () => {
      if (!wanted()) return;
      setState("paused");
      retryLater();
    };
    const observer = new ResizeObserver(resized);
    observer.observe(video);
    video.addEventListener("canplay", attemptPlay);
    video.addEventListener("loadeddata", attemptPlay);
    video.addEventListener("playing", started);
    video.addEventListener("pause", interrupted);
    video.addEventListener("error", fail);
    document.addEventListener("visibilitychange", activated);
    window.addEventListener("pageshow", activated);
    motion.addEventListener("change", activated);
    for (const name of ACTIVATION_EVENTS)
      window.addEventListener(name, activated, { passive: true });
    void sync();
    return () => {
      disposed = true;
      observer.disconnect();
      video.removeEventListener("canplay", attemptPlay);
      video.removeEventListener("loadeddata", attemptPlay);
      video.removeEventListener("playing", started);
      video.removeEventListener("pause", interrupted);
      video.removeEventListener("error", fail);
      document.removeEventListener("visibilitychange", activated);
      window.removeEventListener("pageshow", activated);
      motion.removeEventListener("change", activated);
      for (const name of ACTIVATION_EVENTS)
        window.removeEventListener(name, activated);
      unload();
    };
  }, []);

  return (
    <div
      className={styles.frame}
      style={{ backgroundImage: `url("${homeR2.poster}")` }}
      aria-hidden="true"
    >
      <video
        ref={ref}
        className={styles.video}
        data-state={state}
        poster={homeR2.poster}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        tabIndex={-1}
      />
    </div>
  );
}