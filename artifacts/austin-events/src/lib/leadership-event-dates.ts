const LEADERSHIP_TIME_ZONE = "America/Chicago";

export function centralDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEADERSHIP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values["year"]}-${values["month"]}-${values["day"]}T${values["hour"]}:${values["minute"]}`;
}

export function centralDateTimeIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const targetUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let instant = new Date(targetUtc);

  // Convert the Austin wall-clock time to an instant without using the viewer's timezone.
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: LEADERSHIP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const observedUtc = Date.UTC(
      Number(values["year"]),
      Number(values["month"]) - 1,
      Number(values["day"]),
      Number(values["hour"]),
      Number(values["minute"]),
    );
    instant = new Date(instant.getTime() + targetUtc - observedUtc);
  }

  return centralDateTimeInput(instant.toISOString()) === value ? instant.toISOString() : null;
}

export function formatCentralDateLabel(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso);
  if (!Number.isFinite(start.getTime())) return "";

  const dateLabel = (date: Date) => new Intl.DateTimeFormat("en-US", {
    timeZone: LEADERSHIP_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timeLabel = (date: Date) => new Intl.DateTimeFormat("en-US", {
    timeZone: LEADERSHIP_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", {
    timeZone: LEADERSHIP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  if (!endIso) return `${dateLabel(start)} · ${timeLabel(start)} CT`;

  const end = new Date(endIso);
  if (!Number.isFinite(end.getTime())) return `${dateLabel(start)} · ${timeLabel(start)} CT`;
  if (dayKey(start) === dayKey(end)) {
    return `${dateLabel(start)} · ${timeLabel(start)}–${timeLabel(end)} CT`;
  }
  return `${dateLabel(start)} · ${timeLabel(start)} CT – ${dateLabel(end)} · ${timeLabel(end)} CT`;
}
