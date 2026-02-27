const START_HOUR = 8;
const END_HOUR = 22;
const SLOT_MINUTES = 30;

const ICAL_DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const JS_DAY_TO_GRID: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

interface RawEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  dtstartParams: Record<string, string>;
  dtendParams: Record<string, string>;
  rrule: string | null;
}

interface ExpandedEvent {
  summary: string;
  start: Date;
  end: Date;
}

function unfoldLines(lines: string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (result.length > 0) {
        result[result.length - 1] += line.substring(1);
      }
    } else {
      result.push(line);
    }
  }
  return result;
}

function parsePropLine(line: string): {
  value: string;
  params: Record<string, string>;
} {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return { value: "", params: {} };
  const beforeColon = line.substring(0, colonIdx);
  const value = line.substring(colonIdx + 1);

  const params: Record<string, string> = {};
  const parts = beforeColon.split(";");
  for (let i = 1; i < parts.length; i++) {
    const eqIdx = parts[i].indexOf("=");
    if (eqIdx !== -1) {
      params[parts[i].substring(0, eqIdx)] = parts[i].substring(eqIdx + 1);
    }
  }

  return { value, params };
}

function parseICSDate(value: string, params: Record<string, string>): Date {
  if (params.VALUE === "DATE" || value.length === 8) {
    const y = parseInt(value.substring(0, 4));
    const m = parseInt(value.substring(4, 6)) - 1;
    const d = parseInt(value.substring(6, 8));
    return new Date(y, m, d);
  }

  const y = parseInt(value.substring(0, 4));
  const m = parseInt(value.substring(4, 6)) - 1;
  const d = parseInt(value.substring(6, 8));
  const hh = parseInt(value.substring(9, 11));
  const mm = parseInt(value.substring(11, 13));
  const ss = parseInt(value.substring(13, 15)) || 0;

  if (value.endsWith("Z")) {
    return new Date(Date.UTC(y, m, d, hh, mm, ss));
  }

  // Treat TZID times as local (works correctly when user is in the same timezone)
  return new Date(y, m, d, hh, mm, ss);
}

function parseRRule(rrule: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of rrule.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx !== -1) {
      parts[part.substring(0, eqIdx)] = part.substring(eqIdx + 1);
    }
  }
  return parts;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseICSText(icsText: string): RawEvent[] {
  const lines = unfoldLines(icsText.split(/\r?\n/));
  const events: RawEvent[] = [];

  let inEvent = false;
  let current: Partial<RawEvent> & { exdates?: string[] } = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
    } else if (line === "END:VEVENT") {
      if (current.dtstart) {
        events.push({
          summary: current.summary || "Busy",
          dtstart: current.dtstart,
          dtend: current.dtend || current.dtstart,
          dtstartParams: current.dtstartParams || {},
          dtendParams: current.dtendParams || {},
          rrule: current.rrule || null,
        });
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith("DTSTART")) {
        const { value, params } = parsePropLine(line);
        current.dtstart = value;
        current.dtstartParams = params;
      } else if (line.startsWith("DTEND")) {
        const { value, params } = parsePropLine(line);
        current.dtend = value;
        current.dtendParams = params;
      } else if (line.startsWith("SUMMARY:")) {
        current.summary = line
          .substring(8)
          .replace(/\\n/g, " ")
          .replace(/\\,/g, ",")
          .replace(/\\\\/g, "\\");
      } else if (line.startsWith("SUMMARY;")) {
        // SUMMARY with params like SUMMARY;LANGUAGE=en:Event Name
        const { value } = parsePropLine(line);
        current.summary = value
          .replace(/\\n/g, " ")
          .replace(/\\,/g, ",")
          .replace(/\\\\/g, "\\");
      } else if (line.startsWith("RRULE:")) {
        current.rrule = line.substring(6);
      }
    }
  }

  return events;
}

export function expandEventsForWeek(rawEvents: RawEvent[]): ExpandedEvent[] {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const expanded: ExpandedEvent[] = [];

  for (const event of rawEvents) {
    const start = parseICSDate(event.dtstart, event.dtstartParams);
    const end = parseICSDate(event.dtend, event.dtendParams);
    const duration = end.getTime() - start.getTime();

    if (!event.rrule) {
      if (start < weekEnd && end > weekStart) {
        expanded.push({ summary: event.summary, start, end });
      }
      continue;
    }

    const rule = parseRRule(event.rrule);
    const freq = rule.FREQ;

    let until: Date | null = null;
    if (rule.UNTIL) {
      until = parseICSDate(rule.UNTIL, {});
      if (until < weekStart) continue;
    }

    if (start > weekEnd) continue;

    if (freq === "WEEKLY") {
      const byDay = rule.BYDAY?.split(",") || [];

      if (byDay.length > 0) {
        for (const dayCode of byDay) {
          const cleanCode = dayCode.replace(/[^A-Z]/g, "");
          const jsDay = ICAL_DAY_MAP[cleanCode];
          if (jsDay === undefined) continue;

          const dayDate = new Date(weekStart);
          let offset = jsDay - 1; // 1=Monday is the week start
          if (offset < 0) offset += 7;
          dayDate.setDate(weekStart.getDate() + offset);

          const occStart = new Date(dayDate);
          occStart.setHours(
            start.getHours(),
            start.getMinutes(),
            start.getSeconds()
          );

          if (occStart < start) continue;
          if (until && occStart > until) continue;
          if (occStart >= weekEnd) continue;

          const occEnd = new Date(occStart.getTime() + duration);
          expanded.push({ summary: event.summary, start: occStart, end: occEnd });
        }
      } else {
        const origDay = start.getDay();
        const dayDate = new Date(weekStart);
        let offset = origDay - 1;
        if (offset < 0) offset += 7;
        dayDate.setDate(weekStart.getDate() + offset);

        const occStart = new Date(dayDate);
        occStart.setHours(
          start.getHours(),
          start.getMinutes(),
          start.getSeconds()
        );

        if (
          occStart >= start &&
          (!until || occStart <= until) &&
          occStart < weekEnd
        ) {
          const occEnd = new Date(occStart.getTime() + duration);
          expanded.push({ summary: event.summary, start: occStart, end: occEnd });
        }
      }
    } else if (freq === "DAILY") {
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + d);

        const occStart = new Date(dayDate);
        occStart.setHours(
          start.getHours(),
          start.getMinutes(),
          start.getSeconds()
        );

        if (occStart < start) continue;
        if (until && occStart > until) continue;

        const occEnd = new Date(occStart.getTime() + duration);
        expanded.push({ summary: event.summary, start: occStart, end: occEnd });
      }
    }
  }

  return expanded;
}

export function mapEventsToSlots(
  events: ExpandedEvent[]
): Record<string, string> {
  const busySlots: Record<string, string> = {};

  for (const event of events) {
    // Walk through the event in slot-sized increments
    const current = new Date(event.start);
    current.setSeconds(0, 0);
    // Round down to nearest slot boundary
    const min = current.getMinutes();
    current.setMinutes(min < 30 ? 0 : 30);

    while (current < event.end) {
      const day = JS_DAY_TO_GRID[current.getDay()];
      const hour = current.getHours();
      const slotMin = current.getMinutes();

      if (day && hour >= START_HOUR && hour < END_HOUR) {
        const hh = String(hour).padStart(2, "0");
        const mm = String(slotMin).padStart(2, "0");
        const key = `${day}-${hh}:${mm}`;
        if (!busySlots[key]) {
          busySlots[key] = event.summary;
        }
      }

      current.setMinutes(current.getMinutes() + SLOT_MINUTES);
    }
  }

  return busySlots;
}

export function parseAndMapCalendar(
  icsText: string
): Record<string, string> {
  const raw = parseICSText(icsText);
  const expanded = expandEventsForWeek(raw);
  return mapEventsToSlots(expanded);
}

