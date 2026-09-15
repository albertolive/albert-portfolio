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

// Coming back from a backgrounded app is not the same as coming back from a
// hidden tab. iOS suspends the media pipeline instead of pausing it: the
// element keeps reporting `paused === false` while no frame advances, with
// readyState and networkState stuck at 1 and no error event, and only a fresh
// load() restarts it (Apple developer forums, "HtmlVideoElement Suspended on
// iOS Safari"). WebKit also destroys the media player when a page enters the
// back/forward cache, which reaches the page as a non-fatal MEDIA_ERR_ABORTED
// after the restore (WebKit bug 319665). Neither state is visible in the
// element's flags, so playback is audited by sampling currentTime after every
// activation, and a picture that stops moving is rebuilt once. The hero is a
// loop, so a rebuild costs a frame, not the session.
const FRAME_AUDIT_MS = 1200;
const FRAME_AUDIT_STALLS = 3;
// A connection that is still fetching deserves longer than a pipeline that has
// stopped asking for anything at all.
const FRAME_AUDIT_PATIENT_STALLS = 6;

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
    let auditTimer: number | undefined;
    let marker = -1;
    let stalls = 0;
    let rebuilt = false;

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
    // A cancelled fetch is not a broken stream: entering the back/forward cache
    // destroys the media player and aborts the load inside it (WebKit bug
    // 319665), so the element reports MEDIA_ERR_ABORTED on restore. Rebuild
    // once for that; a second abort, or any other code, is final.
    const aborted = () => video.error?.code === MediaError.MEDIA_ERR_ABORTED && !rebuilt;
    const fail = () => {
      if (aborted()) {
        rebuild();
        return;
      }
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
    // load() is the documented cure for a suspended pipeline and the only way
    // back from an aborted load. One rebuild per stall: another would be a
    // request storm, and frames have to move before one is earned again.
    const rebuild = () => {
      if (disposed || failed || rebuilt) return;
      rebuilt = true;
      unload();
      void sync(true);
    };
    const clearAudit = () => {
      if (auditTimer !== undefined) window.clearTimeout(auditTimer);
      auditTimer = undefined;
    };
    const watch = () => {
      clearAudit();
      marker = video.currentTime;
      auditTimer = window.setTimeout(audit, FRAME_AUDIT_MS);
    };
    // `paused` is a flag, not evidence: a suspended pipeline holds one frame
    // forever while the element still claims to be playing, so playback is
    // proved with frames. Sampling currentTime costs one timer, and the audit
    // stops itself whenever the document is hidden or the stream is dead.
    const audit = () => {
      auditTimer = undefined;
      if (disposed || !wanted()) return;
      if (video.seeking || video.paused) {
        stalls = 0;
        watch();
        return;
      }
      if (video.currentTime !== marker) {
        marker = video.currentTime;
        stalls = 0;
        rebuilt = false;
        watch();
        return;
      }
      stalls += 1;
      // A slow connection reports LOADING with nothing buffered ahead; a
      // suspended pipeline reports IDLE and will never deliver another frame.
      const patient =
        video.networkState === HTMLMediaElement.NETWORK_LOADING &&
        video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA;
      if (stalls >= (patient ? FRAME_AUDIT_PATIENT_STALLS : FRAME_AUDIT_STALLS)) {
        rebuild();
        return;
      }
      watch();
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
    // Only a resume asks for playback unconditionally, because an element that
    // claims to be playing can still be suspended; play() is a no-op in the
    // spec when the element is genuinely playing.
    const attemptPlay = (resumed = false) => {
      if (!wanted() || playing || (!resumed && !video.paused)) return;
      const attempt = generation;
      playing = true;
      void video
        .play()
        .catch((error: unknown) => {
          if (attempt !== generation || !wanted()) return;
          // A superseded play() and a play() with nothing to play are not
          // refusals, and neither one is worth a retry ladder.
          if (error instanceof DOMException && error.name !== "NotAllowedError")
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
    const sync = async (resumed = false) => {
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
      attemptPlay(resumed);
    };
    // Registered on the media events that make playback possible.
    const ready = () => attemptPlay();
    // Every event that can grant playback (a gesture, a page shown again, a
    // motion preference change). After a background app switch the element can
    // claim to be playing from a frozen frame, so this asks for playback and
    // then audits frames instead of believing the flag.
    const activated = () => {
      step = 0;
      void sync(true);
      watch();
    };
    // A hidden document is not just an interrupted one: the platform suspends
    // the pipeline underneath the pause, so the next activation has to earn its
    // own recovery.
    const hidden = () => {
      rebuilt = false;
      clearAudit();
      void sync();
    };
    const visibility = () => {
      if (document.hidden) hidden();
      else activated();
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
    video.addEventListener("canplay", ready);
    video.addEventListener("loadeddata", ready);
    video.addEventListener("playing", started);
    video.addEventListener("pause", interrupted);
    video.addEventListener("error", fail);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", activated);
    motion.addEventListener("change", activated);
    for (const name of ACTIVATION_EVENTS)
      window.addEventListener(name, activated, { passive: true });
    void sync();
    watch();
    return () => {
      disposed = true;
      clearAudit();
      observer.disconnect();
      video.removeEventListener("canplay", ready);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("playing", started);
      video.removeEventListener("pause", interrupted);
      video.removeEventListener("error", fail);
      document.removeEventListener("visibilitychange", visibility);
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