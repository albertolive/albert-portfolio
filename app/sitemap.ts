import type { MetadataRoute } from "next";
import { site } from "@/content/site";

const routes = ["", "/experience", "/projects", "/about"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${site.url}${route}`,
  }));
}
