import { site } from "@/content/site";
import styles from "../page.module.css";
import { parseGitHubContributions, type ContributionDay } from "./github-contributions";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

async function getContributions() {
  try {
    const response = await fetch("https://github.com/users/albertolive/contributions", {
      cache: "force-cache",
      headers: { Accept: "text/html", "User-Agent": "albertolive-portfolio" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return null;
    const calendar = parseGitHubContributions(await response.text());
    return calendar.days.length >= 300 ? calendar : null;
  } catch {
    return null;
  }
}

function utcDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function labelFor(day: ContributionDay) {
  if (day.label) return day.label;
  const count = day.count === null ? "Contribution count unavailable" : `${day.count} ${day.count === 1 ? "contribution" : "contributions"}`;
  return `${count} on ${dateFormatter.format(utcDate(day.date))}`;
}

export default async function ContributionCalendar() {
  const calendar = await getContributions();
  const days = calendar?.days ?? [];
  const byDate = new Map(days.map((day) => [day.date, day]));
  const first = days[0] ? utcDate(days[0].date) : null;
  const last = days.at(-1) ? utcDate(days.at(-1)!.date) : null;
  const start = first ? new Date(first) : null;
  const end = last ? new Date(last) : null;
  if (start) start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  if (end) end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));
  const weeks = start && end ? Math.round((end.valueOf() - start.valueOf()) / 604_800_000) + 1 : 0;
  const rows = Array.from({ length: 7 }, (_, weekday) =>
    Array.from({ length: weeks }, (_, week) => {
      const date = new Date(start!);
      date.setUTCDate(date.getUTCDate() + week * 7 + weekday);
      return byDate.get(date.toISOString().slice(0, 10)) ?? null;
    }),
  );
  const months = Array.from({ length: weeks }, (_, week) => {
    const date = new Date(start!);
    date.setUTCDate(date.getUTCDate() + week * 7);
    const previous = new Date(date);
    previous.setUTCDate(previous.getUTCDate() - 7);
    return week === 0 || date.getUTCMonth() !== previous.getUTCMonth() ? monthFormatter.format(date) : "";
  });

  return (
    <section className={styles.contributions} aria-labelledby="contributions-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.kicker}>Open source, over time</p>
          <h2 id="contributions-title">GitHub contributions</h2>
        </div>
        <a href={site.github} target="_blank" rel="noopener noreferrer">@albertolive <span aria-hidden="true">↗</span></a>
      </div>
      {calendar && first && last ? (
        <div className={styles.calendarCard}>
          <p className={styles.calendarSummary}>
            <strong>{calendar.total === null ? "Contributions" : `${calendar.total.toLocaleString("en-US")} contributions`}</strong>
            <span>{dateFormatter.format(first)} – {dateFormatter.format(last)}</span>
          </p>
          <div className={styles.calendarScroll} tabIndex={0} aria-label="Scrollable contribution calendar">
            <table className={styles.calendar}>
              <thead><tr><th aria-hidden="true" /><>{months.map((month, index) => <th key={`${month}-${index}`} scope="col">{month}</th>)}</></tr></thead>
              <tbody>
                {rows.map((row, weekday) => (
                  <tr key={weekday}>
                    <th scope="row">{weekday === 1 ? "Mon" : weekday === 3 ? "Wed" : weekday === 5 ? "Fri" : ""}</th>
                    {row.map((day, week) => day ? (
                      <td key={day.date} className={styles[`level${day.level}`]} title={labelFor(day)} aria-label={labelFor(day)} />
                    ) : <td key={week} className={styles.calendarBlank} aria-hidden="true" />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.legend} aria-label="Contribution intensity from less to more">
            <span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i className={styles[`level${level}`]} key={level} />)}<span>More</span>
          </div>
        </div>
      ) : (
        <p className={styles.calendarUnavailable}>GitHub contributions are temporarily unavailable. <a href={site.github} target="_blank" rel="noopener noreferrer">View the profile instead ↗</a></p>
      )}
    </section>
  );
}
