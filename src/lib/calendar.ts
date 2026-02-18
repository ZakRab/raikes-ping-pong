type CalendarEvent = {
  title: string;
  seasonStartDate: string; // "YYYY-MM-DD"
  currentWeek: number;
  scheduledDay: string; // "mon", "tue", etc.
  scheduledTime: string; // "HH:MM"
};

const DAY_DOW: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function computeEventDate(event: CalendarEvent): Date {
  const [year, month, day] = event.seasonStartDate.split("-").map(Number);
  const startDate = new Date(year, month - 1, day);

  // Compute day offset from actual start day-of-week
  const startDow = startDate.getDay(); // 0=Sun, 1=Mon, ...
  const targetDow = DAY_DOW[event.scheduledDay] ?? 0;
  const dayOffset = (targetDow - startDow + 7) % 7;
  const weekOffset = (event.currentWeek - 1) * 7;
  startDate.setDate(startDate.getDate() + weekOffset + dayOffset);

  // Set time
  const [hh, mm] = event.scheduledTime.split(":").map(Number);
  startDate.setHours(hh, mm, 0, 0);

  return startDate;
}

function formatGoogleDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const start = computeEventDate(event);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min match

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    details: "Raikes Ping Pong League match",
    location: "Raikes School",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
