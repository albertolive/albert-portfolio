import { site } from "./site";

// Ped.ro-shaped nested prose: a pill's hidden text is the sentence
// continuation (never repeating the pill word), and can itself contain
// more pills (recursive).
export type AboutSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "reveal"; id: string; label: string; children: AboutSegment[] };

function countReveals(segments: AboutSegment[]): number {
  return segments.reduce(
    (n, s) => n + (s.kind === "reveal" ? 1 + countReveals(s.children) : 0),
    0,
  );
}

// The closed prose stands on its own; each reveal adds a non-repeating
// continuation immediately after its label and may contain more reveals.
export const about: { paragraphs: AboutSegment[][] } = {
  paragraphs: [[
    {
      kind: "text",
      text: "I'm Albert Olivé Corbella, an ",
    },
    {
      kind: "reveal",
      id: "product-engineer",
      label: "AI product engineer",
      children: [
        {
          kind: "text",
          text: " who turns ambiguous problems into clear product decisions, brings customer needs, product direction, and ",
        },
        {
          kind: "reveal",
          id: "engineering-teams",
          label: "engineering teams",
          children: [{ kind: "text", text: " together to launch." }],
        },
      ],
    },
  ], [
    { kind: "text", text: " I'm based in " },
    {
      kind: "reveal",
      id: "cardedeu",
      label: "Cardedeu",
      children: [
        { kind: "text", text: ", near Barcelona, where I live with my " },
        {
          kind: "reveal",
          id: "family",
          label: "family",
          children: [
            { kind: "text", text: ", grow food, and keep " },
            {
              kind: "reveal",
              id: "chickens",
              label: "three chickens",
              children: [{ kind: "text", text: " for fresh eggs." }],
            },
          ],
        },
      ],
    },
  ], [
    { kind: "text", text: " My background includes " },
    {
      kind: "reveal",
      id: "engineering-leadership",
      label: "12 years of engineering leadership",
      children: [
        {
          kind: "text",
          text: " across startups and larger organizations, where I connect product strategy with technical delivery and focus on ",
        },
        {
          kind: "reveal",
          id: "production-focus",
          label: "bringing ideas into production",
          children: [{ kind: "text", text: " thoughtfully." }],
        },
      ],
    },
  ], [
    { kind: "text", text: " Now I build " },
    {
      kind: "reveal",
      id: "own-products",
      label: "AI-native products of my own",
      children: [
        { kind: "text", text: " around " },
        {
          kind: "reveal",
          id: "catalan-weather",
          label: "Catalan culture and local weather",
          children: [
            { kind: "text", text: ", including " },
            {
              kind: "reveal",
              id: "autonomous-tools",
              label: "useful tools",
              children: [{ kind: "text", text: " that operate autonomously in everyday life." }],
            },
          ],
        },
      ],
    },
    { kind: "text", text: " You can find my work on " },
    { kind: "link", text: "GitHub", href: site.github },
    { kind: "text", text: " and " },
    { kind: "link", text: "LinkedIn", href: site.linkedin },
    { kind: "text", text: ", or reach me by " },
    { kind: "link", text: "email", href: `mailto:${site.email}` },
    { kind: "text", text: "." },
  ]],
};

export const revealCount = about.paragraphs.reduce((total, paragraph) => total + countReveals(paragraph), 0);

export type About = typeof about;
