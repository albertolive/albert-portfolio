// Ped.ro-shaped nested prose: a pill's hidden text is the sentence
// continuation (never repeating the pill word), and can itself contain
// more pills (recursive).
export type AboutSegment =
  | { kind: "text"; text: string }
  | { kind: "reveal"; id: string; label: string; children: AboutSegment[] };

function countReveals(segments: AboutSegment[]): number {
  return segments.reduce(
    (n, s) => n + (s.kind === "reveal" ? 1 + countReveals(s.children) : 0),
    0,
  );
}

// C5/C6: about prose and hidden texts are drafts; review before deploy.
// Read with all pills closed the prose must still parse as full sentences;
// each reveal's text continues right after its label with no repetition.
export const about: { segments: AboutSegment[] } = {
  segments: [
    {
      kind: "text",
      text: "I'm Albert Olivé Corbella, an engineering leader and full-stack builder from ",
    },
    {
      kind: "reveal",
      id: "cardedeu",
      label: "Cardedeu",
      children: [
        {
          kind: "text",
          text: " — a town of twelve thousand people in the Vallès, forty minutes by train from Barcelona. I came back to live here on purpose: it's where I run a culture site for my town, ",
        },
        {
          kind: "reveal",
          id: "culturacardedeu",
          label: "culturacardedeu.com",
          children: [
            {
              kind: "text",
              text: " — what's on in Cardedeu, curated by hand: theatre, concerts, festivals, because nobody else was doing it",
            },
          ],
        },
        { kind: "text", text: ", and where I try to predict " },
        {
          kind: "reveal",
          id: "rain",
          label: "the rain",
          children: [
            {
              kind: "text",
              text: " — a nowcasting model that reads radar, lightning and weather-station data to say, for the next ninety minutes, whether it will rain on my street",
            },
          ],
        },
      ],
    },
    {
      kind: "text",
      text: ". I've shipped software for over ten years. These days I lead ",
    },
    {
      kind: "reveal",
      id: "twin",
      label: "TWIN",
      children: [
        {
          kind: "text",
          text: ", the IOTA Foundation team building identity and data spaces. I work on ",
        },
        {
          kind: "reveal",
          id: "dids",
          label: "DIDs",
          children: [
            {
              kind: "text",
              text: " — W3C decentralized identifiers and verifiable credentials, the plumbing that lets people and organizations hold their own identifiers instead of renting them from a platform",
            },
          ],
        },
        {
          kind: "text",
          text: ", interoperability between ecosystems, and the AI tooling around them",
        },
      ],
    },
    {
      kind: "text",
      text: ". Before that I was at MetaMask (Consensys), building web3 tooling for organizations, and at letgo I scaled an engineering team from ",
    },
    {
      kind: "reveal",
      id: "letgo",
      label: "one to 250+",
      children: [
        {
          kind: "text",
          text: " engineers, growing with the company as letgo became a unicorn and then merged with OLX. I joined as the seventh employee at CornerJob and grew with that team too",
        },
      ],
    },
    { kind: "text", text: ". On the side I found and run " },
    {
      kind: "reveal",
      id: "esdeveniments",
      label: "esdeveniments.cat",
      children: [
        {
          kind: "text",
          text: ", the events platform for all of Catalonia — ten thousand monthly users, a TypeScript frontend, a Java backend, and an ",
        },
        {
          kind: "reveal",
          id: "ai-scraper",
          label: "AI scraper",
          children: [
            {
              kind: "text",
              text: " that reads sixty town councils' sites and keeps the event listings fresh without anyone typing them in",
            },
          ],
        },
      ],
    },
    {
      kind: "text",
      text: ". I build fast, measure, and finish things — a menubar app, a rain-forecaster, a culture site for my town. I speak Catalan, Spanish and English, and I work remote from Catalonia. Say hi: ",
    },
  ],
};

export const revealCount = countReveals(about.segments);

export type About = typeof about;
