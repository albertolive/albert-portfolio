// Experience data — sourced from Albert's Sep 2026 CV.
// Rendered on /experience; the single source of truth for the hiring surface.
export type CVCompany = {
  name: string;
  href?: string;
  span: string;
  role: string;
  summary: string;
  tags: string[];
  logo: string;
};

export const experience: CVCompany[] = [
  {
    name: "esdeveniments.cat",
    href: "https://esdeveniments.cat",
    span: "Apr 2023 — Present",
    role: "Founder",
    summary: "I built Catalonia’s cultural events platform end to end. It serves 10K+ monthly users and reached 194K views in 12 months.",
    tags: ["TypeScript", "Next.js", "LLMs", "ETL", "Redis", "AWS"],
    logo: "/images/experience/esdeveniments.png",
  },
  {
    name: "IOTA Foundation",
    href: "https://www.iota.org",
    span: "Feb 2025 — Jul 2026",
    role: "Senior Solution Architect, TWIN",
    summary: "At TWIN, I led partner integrations and architecture for DIDs, verifiable credentials, data spaces and trade platforms.",
    tags: ["TypeScript", "Next.js", "DIDs", "W3C VC", "DCATv3", "ERC-3643"],
    logo: "/images/experience/iota.png",
  },
  {
    name: "Consensys",
    href: "https://consensys.io",
    span: "May 2022 — Nov 2024",
    role: "Senior Web3 Full Stack Engineer",
    summary: "Built MetaMask Institutional: secure QR connections, modular SDK packages and MetaMerge.",
    tags: ["TypeScript", "React", "Node.js", "Solidity", "WebSocket", "AWS"],
    logo: "/images/experience/consensys.png",
  },
  {
    name: "letgo",
    href: "https://www.letgo.com",
    span: "May 2017 — May 2022",
    role: "Engineering Manager",
    summary: "Engineering grew from 1 to 250+ people while letgo became a unicorn and merged with OLX. I led its B2B car-dealer product in Turkey and the US.",
    tags: ["React", "Redux", "GraphQL", "Node.js", "AWS", "Leadership"],
    logo: "/images/experience/letgo.png",
  },
  {
    name: "CornerJob",
    href: "https://www.cornerjob.com",
    span: "Oct 2015 — May 2017",
    role: "Full-stack Developer",
    summary: "I joined as the seventh employee, led HTML5 work on the enterprise recruitment app and contributed to its backend.",
    tags: ["React", "Node.js", "Redux", "Jest", "Elasticsearch", "AWS"],
    logo: "/images/experience/cornerjob.png",
  },
  {
    name: "Ideaknow",
    href: "https://www.ideaknow.com",
    span: "Mar 2014 — Oct 2015",
    role: "Front-end HTML5 and Mobile Software Engineer",
    summary: "For Banc Sabadell, I built the mobile web application and integrated it into its native apps.",
    tags: ["JavaScript", "HTML5", "CSS3", "Backbone.js", "Handlebars.js"],
    logo: "/images/experience/ideaknow.png",
  },
  {
    name: "BCNscience",
    span: "Oct 2013 — Feb 2014",
    role: "Full-stack Developer",
    summary: "Developed full-stack mobile apps and worked on their interface design.",
    tags: ["Full stack", "Mobile", "UI design"],
    logo: "/images/experience/bcnscience.png",
  },
];

export type CVEducation = {
  school: string;
  program: string;
  period: string;
};

export const education: CVEducation[] = [
  {
    school: "Universitat Politècnica de Catalunya",
    program: "Mobile Business and Mobile Apps, Computer Software Engineering",
    period: "2013 — 2014",
  },
  {
    school: "Escoles Universitàries Gimbernat i Tomàs Cerdà",
    program: "Computer Engineering University Degree, Computer Engineering",
    period: "2009 — 2013",
  },
  {
    school: "Taller Ginebró",
    program: "Higher Degree in Application of Computer Systems",
    period: "2007 — 2009",
  },
  {
    school: "Taller Ginebró",
    program: "Middle Degree in Application of Computer Systems",
    period: "2004 — 2006",
  },
];

export const languages = ["Catalan, native", "Spanish, native", "English, full professional"];
