export type ContributionDay = {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  count: number | null;
  label: string | null;
};

export type ContributionCalendar = {
  days: ContributionDay[];
  total: number | null;
};

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function textContent(value: string) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function attributes(value: string) {
  const result: Record<string, string> = {};
  for (const match of value.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) result[match[1]] = decodeEntities(match[3]);
  return result;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function contributionCount(label: string | null) {
  if (!label) return null;
  if (/^No contributions? on /i.test(label)) return 0;
  const match = label.match(/^([\d,]+) contributions? on /i);
  if (!match) return null;
  const count = Number(match[1].replaceAll(",", ""));
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function parseGitHubContributions(html: string): ContributionCalendar {
  const labels = new Map<string, string>();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/gi)) {
    const id = attributes(match[1]).for;
    if (id) labels.set(id, textContent(match[2]));
  }

  const byDate = new Map<string, ContributionDay>();
  for (const match of html.matchAll(/<td\b([^>]*)>/gi)) {
    const attrs = attributes(match[1]);
    const level = Number(attrs["data-level"]);
    if (!validDate(attrs["data-date"] ?? "") || !Number.isInteger(level) || level < 0 || level > 4) continue;
    const label = attrs.id ? labels.get(attrs.id) ?? null : null;
    const date = attrs["data-date"];
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        level: level === 0 ? 0 : level === 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 4,
        count: contributionCount(label),
        label,
      });
    }
  }

  const heading = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => textContent(match[1]))
    .find((value) => /[\d,]+ contributions? in the last year/i.test(value));
  const totalMatch = heading?.match(/([\d,]+) contributions? in the last year/i);
  const parsedTotal = totalMatch ? Number(totalMatch[1].replaceAll(",", "")) : null;
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const allCountsKnown = days.length > 0 && days.every((day) => day.count !== null);

  return {
    days,
    total: parsedTotal !== null && Number.isSafeInteger(parsedTotal)
      ? parsedTotal
      : allCountsKnown
        ? days.reduce((sum, day) => sum + (day.count ?? 0), 0)
        : null,
  };
}
