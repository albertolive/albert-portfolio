export type Project = {
  slug: string;
  title: string;
  description: string;
  year: string;
  tech: string[];
  href: string;
  image: string;
  imageAlt: string;
  video: string;
};

export const projects: Project[] = [
  {
    slug: "esdeveniments",
    title: "esdeveniments.cat",
    description: "Catalonia events platform with a TypeScript frontend, Java backend, and automated metadata collection.",
    year: "2023",
    tech: ["TypeScript", "Java"],
    href: "https://esdeveniments.cat",
    image: "/images/projects/esdeveniments.png",
    imageAlt: "esdeveniments.cat homepage showing events across Catalonia",
    video: "/video/projects/esdeveniments.webm",
  },
  {
    slug: "eltempsavui",
    title: "eltempsavui.cat",
    description: "Local weather forecasts for Catalonia, built with Next.js and TypeScript.",
    year: "2026",
    tech: ["TypeScript", "Next.js"],
    href: "https://eltempsavui.cat",
    image: "/images/projects/eltempsavui.png",
    imageAlt: "El Temps Avui weather forecast",
    video: "/video/projects/eltempsavui.webm",
  },
  {
    slug: "culturacardedeu",
    title: "culturacardedeu.com",
    description: "Independent guide to cultural events and activities in Cardedeu.",
    year: "2023",
    tech: [],
    href: "https://culturacardedeu.com",
    image: "/images/projects/culturacardedeu.png",
    imageAlt: "Cultura Cardedeu cultural events banner",
    video: "/video/projects/culturacardedeu.webm",
  },
  {
    slug: "nowcast-cardedeu",
    title: "nowcast-cardedeu",
    description: "XGBoost rain nowcasting using radar, lightning, and AEMET weather data.",
    year: "2024",
    tech: ["Python", "XGBoost"],
    href: "https://github.com/albertolive/nowcast-cardedeu",
    image: "/images/projects/nowcast-cardedeu.png",
    imageAlt: "Plourà a Cardedeu rain forecast dashboard",
    video: "/video/projects/nowcast-cardedeu.webm",
  },
  {
    slug: "moveflow",
    title: "moveflow.app",
    description: "macOS menu bar app for movement reminders and sedentary-behavior tracking.",
    year: "2024",
    tech: ["Swift", "macOS"],
    href: "https://moveflow.app",
    image: "/images/projects/moveflow.png",
    imageAlt: "MoveFlow macOS movement reminder app",
    video: "/video/projects/moveflow.webm",
  },
  {
    slug: "breathing-timer",
    title: "Breathing Timer",
    description: "Guided breathing timer for Garmin watches.",
    year: "2026",
    tech: ["Monkey C", "Garmin"],
    href: "https://apps.garmin.com/apps/59828c15-7638-4e14-b871-47f0ce0c66f0",
    image: "/images/projects/breathing-timer.png",
    imageAlt: "Breathing Timer app for Garmin watches",
    video: "/video/projects/breathing-timer.webm",
  },
];

export type Projects = typeof projects;
