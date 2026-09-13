import { homeStream } from "@/lib/video";
import styles from "../page.module.css";

// Homepage adaptive-streaming provider boundary (plan Phase 2.6-2.7). The
// Cloudflare Stream iframe is preserved — measurements have not proven
// native delivery insufficient — and isolated here so the page never depends
// on provider details. Crop/loading states live in page.module.css (.frame).
// User decision 2026-09-12: no pause control. The stream is meaningful page
// content, so the page pairs it with a visually-hidden text equivalent.
export default function HomeStream() {
  return (
    <iframe
      className={styles.video}
      src={homeStream.embedUrl}
      title={homeStream.title}
      aria-hidden="true"
      tabIndex={-1}
      allow="autoplay; encrypted-media"
    />
  );
}
