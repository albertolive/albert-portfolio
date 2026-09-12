export type ProjectSection = {
  label: string;
  href: string;
  video: string;
  image: string;
};

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
  /** Extra pages of the same site the card can preview; first entry is the default. */
  sections?: ProjectSection[];
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
    sections: [
      {
        label: "Inici",
        href: "https://esdeveniments.cat/",
        video: "/video/projects/esdeveniments.webm",
        image: "/images/projects/esdeveniments.png",
      },
      {
        label: "Agenda",
        href: "https://esdeveniments.cat/catalunya",
        video: "/video/projects/esdeveniments-agenda.webm",
        image: "/images/projects/esdeveniments-agenda.png",
      },
      {
        label: "Cap de setmana",
        href: "https://esdeveniments.cat/catalunya/cap-de-setmana",
        video: "/video/projects/esdeveniments-cap-de-setmana.webm",
        image: "/images/projects/esdeveniments-cap-de-setmana.png",
      },
      {
        label: "Notícies",
        href: "https://esdeveniments.cat/noticies",
        video: "/video/projects/esdeveniments-noticies.webm",
        image: "/images/projects/esdeveniments-noticies.png",
      },
    ],
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
    sections: [
      {
        label: "Portada",
        href: "https://eltempsavui.cat/",
        video: "/video/projects/eltempsavui.webm",
        image: "/images/projects/eltempsavui.png",
      },
      {
        label: "Conceptes",
        href: "https://eltempsavui.cat/conceptes",
        video: "/video/projects/eltempsavui-conceptes.webm",
        image: "/images/projects/eltempsavui-conceptes.png",
      },
    ],
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
    sections: [
      {
        label: "Agenda",
        href: "https://culturacardedeu.com/",
        video: "/video/projects/culturacardedeu.webm",
        image: "/images/projects/culturacardedeu.png",
      },
      {
        label: "Notícies",
        href: "https://culturacardedeu.com/noticies",
        video: "/video/projects/culturacardedeu-noticies.webm",
        image: "/images/projects/culturacardedeu-noticies.png",
      },
    ],
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
