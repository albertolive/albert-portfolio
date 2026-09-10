export const site = {
  name: "Albert Olivé Corbella",
  // C1: title variant pending Albert's pick (see CONTENT-NEEDED.md)
  title: "Engineering leader · Staff/Senior AI Engineer · Forward Deployed Engineer",
  shortTitle: "Engineering leader & full-stack builder",
  location: "Cardedeu, Catalonia",
  timezone: "Europe/Madrid",
  description:
    "Portfolio of Albert Olivé Corbella — engineering leader and full-stack builder. TWIN @ IOTA Foundation, founder @ esdeveniments.cat, ex-MetaMask, ex-letgo.",
  // L1: replace with the approved public email before deploy
  email: "PLACEHOLDER-EMAIL",
  // L2/L3: replace with approved public profile URLs before deploy
  linkedin: "https://www.linkedin.com/in/PLACEHOLDER",
  github: "https://github.com/PLACEHOLDER",
} as const;

export type Site = typeof site;
