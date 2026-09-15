export const site = {
  url: "https://albertolive.corbella.cat",
  name: "Albert Olivé Corbella",
  // C1 resolved (2026-09-11): CV headline, ex-IOTA framing.
  title: "Senior AI Product Engineer · Building AI-native products from idea to production",
  shortTitle: "Senior AI Product Engineer",
  role: "Senior AI Product Engineer",
  status: "Open to work",
  location: "Cardedeu (Barcelona), Catalonia",
  timezone: "Europe/Madrid",
  description:
    "Portfolio of Albert Olivé Corbella, senior AI product engineer building AI-native products end to end. Founder @ esdeveniments.cat. Ex-MetaMask (Consensys), ex-IOTA Foundation, ex-letgo.",
  // L1 resolved (2026-09-11): public email from the CV.
  email: "albertolivecorbella@gmail.com",
  linkedin: "https://www.linkedin.com/in/albertolivecorbella/",
  github: "https://github.com/albertolive",
} as const;

export type Site = typeof site;
