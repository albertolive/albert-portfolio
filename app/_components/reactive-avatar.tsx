import Image from "next/image";
import styles from "./site-nav.module.css";

export default function ReactiveAvatar() {
  return (
    <span className={styles.avatarScene} aria-hidden="true">
      <span className={styles.avatarPortrait}>
        <Image
          src="/avatar.png"
          alt=""
          width={32}
          height={32}
          className={styles.brandAvatar}
        />
      </span>
    </span>
  );
}
