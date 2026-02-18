const DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function formatScheduledTime(day?: string, time?: string): string | null {
  if (!day || !time) return null;
  const [hh, mm] = time.split(":");
  const hour = parseInt(hh);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${DAY_LABELS[day] ?? day} ${display}:${mm} ${ampm}`;
}
