"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import styles from "../page.module.css";

type ProjectPreviewProps = {
  image: string;
  imageAlt: string;
  video: string;
};

export default function ProjectPreview({ image, imageAlt, video }: ProjectPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hovering = useRef(false);
  const [playing, setPlaying] = useState(false);

  function handlePointerEnter(event: PointerEvent<HTMLSpanElement>) {
    if (
      event.pointerType !== "mouse" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;

    const element = videoRef.current;
    if (!element) return;

    hovering.current = true;
    if (!element.src) element.src = video;
    element.play().then(() => {
      if (hovering.current) {
        setPlaying(true);
      } else {
        element.pause();
        element.currentTime = 0;
      }
    }).catch(() => undefined);
  }

  function handlePointerLeave() {
    hovering.current = false;
    setPlaying(false);
    const element = videoRef.current;
    if (!element) return;
    element.pause();
    element.currentTime = 0;
  }

  return (
    <span className={styles.imageWrap} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      <Image
        className={styles.image}
        src={image}
        alt={imageAlt}
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        draggable={false}
      />
      <video
        ref={videoRef}
        className={`${styles.video} ${playing ? styles.videoVisible : ""}`}
        data-src={video}
        muted
        loop
        playsInline
        preload="none"
        poster={image}
        aria-hidden="true"
      />
    </span>
  );
}
