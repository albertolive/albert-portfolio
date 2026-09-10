export type Project = {
  slug: string;
  title: string;
  description: string;
  year: string;
  href: string;
  image: string;
  imageAlt: string;
};

// C4: descriptions are one-line drafts; refine in content/projects.ts.
// L4–L8: URLs are the public repos/sites where they exist; opportunity-radar
// is private (href "#") pending an Albert-approved destination.
export const projects: Project[] = [
  {
    slug: "nowcast-cardedeu",
    title: "nowcast-cardedeu",
    description: "XGBoost rain nowcasting — 200+ features from radar, lightning and AEMET data, trained on my hometown's weather.",
    year: "2024",
    href: "https://github.com/albertolive/nowcast-cardedeu",
    image: "/images/projects/nowcast-cardedeu.png",
    imageAlt: "nowcast-cardedeu rain nowcasting project",
  },
  {
    slug: "esdeveniments",
    title: "esdeveniments.cat",
    description: "Catalunya's events platform — 10K monthly users, 194K yearly views. TypeScript frontend, Java backend, AI metadata scraper.",
    year: "2023",
    href: "https://esdeveniments.cat",
    image: "/images/projects/esdeveniments.png",
    imageAlt: "esdeveniments.cat events platform",
  },
  {
    slug: "moveflow",
    title: "moveflow.app",
    description: "macOS menubar app that nudges you off your chair — sedentary-behavior tracking built in Swift.",
    year: "2024",
    href: "https://moveflow.app",
    image: "/images/projects/moveflow.png",
    imageAlt: "moveflow.app macOS menubar app",
  },
  {
    slug: "culturacardedeu",
    title: "culturacardedeu.com",
    description: "Civic culture site for Cardedeu — what's on in town, built and maintained as a side project.",
    year: "2023",
    href: "https://culturacardedeu.com",
    image: "/images/projects/culturacardedeu.png",
    imageAlt: "culturacardedeu.com civic culture site",
  },
  {
    slug: "opportunity-radar",
    title: "opportunity-radar",
    description: "Weekly private radar that turns Google Trends, Autocomplete and Keyword Planner into GitHub issues.",
    year: "2025",
    href: "#",
    image: "/images/projects/opportunity-radar.png",
    imageAlt: "opportunity-radar trend scanning project",
  },
  {
    slug: "metamask-extension",
    title: "MetaMask Extension",
    description: "The web3 wallet in the browser — 13k+ stars, contributions while at Consensys.",
    year: "2022",
    href: "https://github.com/MetaMask/metamask-extension",
    image: "/images/projects/metamask-extension.png",
    imageAlt: "MetaMask Extension web3 wallet",
  },
];

export type Projects = typeof projects;
