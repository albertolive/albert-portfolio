import type { Metadata } from "next";
import { site } from "@/content/site";

export function pageMetadata({
  title,
  description,
  path,
}: {
  title?: string;
  description: string;
  path: string;
}): Metadata {
  const ogTitle = title ? `${title} — ${site.name}` : `${site.name} — ${site.shortTitle}`;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title: ogTitle,
      description,
      siteName: site.name,
      locale: "en_US",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${site.name} — ${site.shortTitle}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}
