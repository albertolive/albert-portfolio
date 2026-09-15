import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import SiteNav from "../_components/site-nav";

export const metadata = pageMetadata({
  title: "Friends",
  description: "Personal websites of real people and projects I admire.",
  path: "/friends",
});

export default function FriendsPage() {
  return (
    <div>
      <SiteNav active="friends" tone="light" />
      <main>
        <h1>Friends</h1>
        <p>I haven’t added any friends yet. This page will collect personal sites of people I like.</p>
        <p>
          This is a /friends page, inspired by <a href="https://slashfriends.org" target="_blank" rel="noopener noreferrer">slashfriends.org</a> and <a href="https://nickgray.net" target="_blank" rel="noopener noreferrer">Nick Gray</a>.
        </p>
        <p>
          <Link href="/">← Home</Link>
        </p>
      </main>
    </div>
  );
}
