import Image from "next/image";
import WaterField from "../projects/_components/water-field";
import styles from "./page.module.css";

export default function PrototypePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}><p>water study / choose a direction</p><h1 className={styles.heading}>Which world feels most real?</h1></header>
      <div className={styles.grid}>
        <section className={styles.scene}><WaterField className={styles.water} /><div className={styles.card}><Image src="/images/projects/nowcast-cardedeu.png" alt="nowcast project" fill sizes="40vw" /></div><strong>01 / animated water</strong><span>Shader, sand, caustics, pointer ripples.</span></section>
        <section className={`${styles.scene} ${styles.photo}`}><div className={styles.card}><Image src="/images/projects/nowcast-cardedeu.png" alt="nowcast project" fill sizes="40vw" /></div><strong>02 / photographed coast</strong><span>Real texture, no simulation.</span></section>
        <section className={`${styles.scene} ${styles.hybrid}`}><WaterField className={styles.water} /><div className={styles.card}><Image src="/images/projects/nowcast-cardedeu.png" alt="nowcast project" fill sizes="40vw" /></div><div className={styles.label}><strong>03 / hybrid depth</strong><span>Animated water with a calmer, deeper composition.</span></div></section>
      </div>
    </main>
  );
}
