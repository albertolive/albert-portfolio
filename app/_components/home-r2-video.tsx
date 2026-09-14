"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { homeR2 } from "@/lib/video";
import styles from "../page.module.css";

// R2 clone of jrands behavior (see HomeStream): muted autoplay loop,
// adaptive HLS (~4s segments), poster first frame, cover crop via
// the same .video class. Source is R2 (free, no viewer cap) instead
// of Cloudflare Stream.
export default function HomeR2Video() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || homeR2.src.includes("video.example.com")) return;
    // Mobile autoplay policies read the muted *property*; the JSX attribute
    // alone is unreliable there. Set both before touching src.
    v.muted = true;
    v.defaultMuted = true;
    const tryPlay = () => {
      v.play().catch(() => {});
    };
    // Autoplay can still be denied (low-power mode, data-saver): the first
    // tap anywhere then starts the hero. The video sits behind page content,
    // so listen on window, not on the element. One-shot, harmless elsewhere.
    window.addEventListener("pointerdown", tryPlay, { once: true });
    let h: Hls | null = null;
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = homeR2.src;
      // src is attached after mount; the autoPlay attribute may not fire on
      // it, so play explicitly once data can flow (native path, i.e. iOS).
      v.addEventListener("canplay", tryPlay, { once: true });
    } else if (Hls.isSupported()) {
      // Start near the top rendition (hero is fullscreen; default 500kbps
      // estimate would open on 480p and look pixelated), still adapts down.
      // (No minAutoBitrate: verified no-op — lowest rung's maxBitrate already
      // exceeds any floor below ~1.7M, and the ladder is flat anyway.)
      // capLevelToPlayerSize keeps small screens from wasting bandwidth.
      h = new Hls({
        maxBufferLength: 30,
        abrEwmaDefaultEstimate: 5_000_000,
        capLevelToPlayerSize: true,
      });
      h.loadSource(homeR2.src);
      h.attachMedia(v);
    }
    tryPlay();
    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      h?.destroy();
    };
  }, []);

  return (
    <video
      ref={ref}
      className={styles.video}
      poster={homeR2.poster}
      muted
      autoPlay
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
