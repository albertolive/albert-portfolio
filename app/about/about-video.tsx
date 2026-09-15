"use client";

import { useEffect, useRef } from "react";
import { aboutVideo, REDUCED_MOTION_QUERY } from "@/lib/video";
import Grain from "./grain";
import styles from "./page.module.css";

export default function AboutVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia(REDUCED_MOTION_QUERY);
    video.muted = true;
    video.defaultMuted = true;
    let generation = 0;

    const hideVideo = () => {
      video.dataset.ready = "false";
    };
    const showVideo = () => {
      if (!motion.matches && !document.hidden && !video.paused) video.dataset.ready = "true";
    };
    const stopVideo = () => {
      generation += 1;
      hideVideo();
      video.pause();
      video.replaceChildren();
      video.load();
    };
    const syncMotion = () => {
      stopVideo();
      if (motion.matches || document.hidden) return;
      for (const source of aboutVideo.sources) {
        const element = document.createElement("source");
        element.src = source.src;
        element.type = source.type;
        video.append(element);
      }
      video.load();
      const attempt = generation;
      void video.play().catch(() => {
        if (attempt === generation) hideVideo();
      });
    };

    video.addEventListener("playing", showVideo);
    video.addEventListener("pause", hideVideo);
    video.addEventListener("error", hideVideo);
    motion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    syncMotion();

    return () => {
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      video.removeEventListener("playing", showVideo);
      video.removeEventListener("pause", hideVideo);
      video.removeEventListener("error", hideVideo);
      stopVideo();
    };
  }, []);

  return (
    <div className={styles.videoWrap} aria-hidden="true">
      <div
        className={styles.videoMedia}
        style={{ backgroundImage: aboutVideo.poster ? `url("${aboutVideo.poster}")` : undefined }}
      >
        <video
          ref={ref}
          className={styles.videoBg}
          poster={aboutVideo.poster}
          muted
          loop={aboutVideo.loop}
          playsInline
          preload={aboutVideo.preload}
          disablePictureInPicture
        />
        <Grain />
      </div>
    </div>
  );
}
