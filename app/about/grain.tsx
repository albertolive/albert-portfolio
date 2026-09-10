import styles from "./page.module.css";

// SVG film-grain overlay — ped.ro texture, zero assets.
// feTurbulence .8 / 4 octaves, saturate 0, opacity .2, fixed inset-0.
export default function Grain() {
  return (
    <svg className={styles.grain} aria-hidden="true" focusable="false">
      <filter id="noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.8"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  );
}
