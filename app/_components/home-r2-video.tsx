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
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = homeR2.src;
    } else if (Hls.isSupported()) {
      // Start near the top rendition (hero is fullscreen; default 500kbps
      // estimate would open on 480p and look pixelated), still adapts down.
      // (No minAutoBitrate: verified no-op — lowest rung's maxBitrate already
      // exceeds any floor below ~1.7M, and the ladder is flat anyway.)
      // capLevelToPlayerSize keeps small screens from wasting bandwidth.
      const h = new Hls({
        maxBufferLength: 30,
        abrEwmaDefaultEstimate: 5_000_000,
        capLevelToPlayerSize: true,
      });
      h.loadSource(homeR2.src);
      h.attachMedia(v);
      return () => h.destroy();
    }
    v.play().catch(() => {});
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
