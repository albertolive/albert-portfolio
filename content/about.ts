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

// C5/C6 (2026-09-11): aligned with the Sep 2026 CV — ex-IOTA framing,
// El Temps Avui as the current build, twelve years. Read with all pills
// closed the prose must still parse as full sentences; each reveal's text
// continues right after its label with no repetition.
export const about: { segments: AboutSegment[] } = {
  segments: [
    {
      kind: "text",
      text: "I'm Albert Olivé Corbella, an AI product engineer and engineering leader from ",
    },
    {
      kind: "reveal",
      id: "cardedeu",
      label: "Cardedeu",
      children: [
        {
          kind: "text",
          text: ", a town of twelve thousand people in the Vallès, forty minutes by train from Barcelona. I chose to move back here. It's where I run a culture site for my town, ",
        },
        {
          kind: "reveal",
          id: "culturacardedeu",
          label: "culturacardedeu.com",
          children: [
            {
              kind: "text",
              text: ", what's on in Cardedeu, curated by hand because nobody else was covering it",
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
              text: ", a nowcasting model that reads radar, lightning and weather-station data to say whether it will rain on my street in the next ninety minutes",
            },
          ],
        },
      ],
    },
    {
      kind: "text",
      text: ". I've spent twelve years building products from idea to production across startups and larger organizations, including a unicorn. I've led engineering teams along the way. For the last stretch I led ",
    },
    {
      kind: "reveal",
      id: "iota",
      label: "TWIN",
      children: [
        {
          kind: "text",
          text: ", the identity and data-spaces team at the IOTA Foundation, working on ",
        },
        {
          kind: "reveal",
          id: "dids",
          label: "DIDs",
          children: [
            {
              kind: "text",
              text: ", W3C decentralized identifiers and verifiable credentials. They let people and organizations hold their own identifiers instead of renting them from a platform",
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
      text: ". These days I build AI-native products on my own, most recently ",
    },
    {
      kind: "reveal",
      id: "el-temps-avui",
      label: "El Temps Avui",
      children: [
        {
          kind: "text",
          text: ", an autonomous system that researches, writes and publishes a daily weather briefing in Catalan across the web, email, Telegram and WhatsApp. It draws on twelve years of expert forecasts, checks every issue before publishing and runs with no human in the daily loop",
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
    { kind: "text", text: ". On the side I founded and run " },
    {
      kind: "reveal",
      id: "esdeveniments",
      label: "esdeveniments.cat",
      children: [
        {
          kind: "text",
          text: ", the events platform for all of Catalonia. It serves 10,000+ monthly users and reached 194,000 views in the last 12 months. Its TypeScript frontend and Java backend are fed by an ",
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
      text: ". I build fast and finish what I start. Recent work includes a menubar app and a rain forecaster for my street. Catalan and Spanish native, English full professional. I work remotely from Catalonia, based in Cardedeu. Say hi: ",
    },
  ],
};

export const revealCount = countReveals(about.segments);

export type About = typeof about;
