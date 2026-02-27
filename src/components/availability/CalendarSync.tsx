import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { parseAndMapCalendar } from "../../lib/icsParser";

export default function CalendarSync({
  savedUrl,
  onEventsChange,
}: {
  savedUrl: string | undefined;
  onEventsChange: (events: Record<string, string>) => void;
}) {
  const saveCalendarUrl = useMutation(api.availability.saveCalendarUrl);
  const fetchCalendarFeed = useAction(api.availability.fetchCalendarFeed);

  const [calendarUrl, setCalendarUrl] = useState("");
  const [urlLoaded, setUrlLoaded] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const [calendarError, setCalendarError] = useState("");
  const [busyCount, setBusyCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasAutoSynced = useRef(false);

  // Load saved URL
  useEffect(() => {
    if (savedUrl !== undefined && !urlLoaded) {
      if (savedUrl) {
        setCalendarUrl(savedUrl);
        setExpanded(true);
      }
      setUrlLoaded(true);
    }
  }, [savedUrl, urlLoaded]);

  const syncCalendar = useCallback(
    async (url: string) => {
      if (!url.trim()) return;
      setCalendarStatus("syncing");
      setCalendarError("");

      try {
        const result = await fetchCalendarFeed({ calendarUrl: url.trim() });
        if (result.error) {
          setCalendarStatus("error");
          setCalendarError(result.error);
          onEventsChange({});
          setBusyCount(0);
        } else if (result.icsText) {
          const events = parseAndMapCalendar(result.icsText);
          onEventsChange(events);
          setBusyCount(Object.keys(events).length);
          setCalendarStatus("synced");
        }
      } catch {
        setCalendarStatus("error");
        setCalendarError("Failed to sync calendar");
        onEventsChange({});
        setBusyCount(0);
      }
    },
    [fetchCalendarFeed, onEventsChange]
  );

  // Auto-sync when URL loads from DB
  useEffect(() => {
    if (urlLoaded && calendarUrl && !hasAutoSynced.current) {
      hasAutoSynced.current = true;
      syncCalendar(calendarUrl);
    }
  }, [urlLoaded, calendarUrl, syncCalendar]);

  const handleSave = useCallback(async () => {
    const trimmed = calendarUrl.trim();
    await saveCalendarUrl({ calendarUrl: trimmed });
    if (trimmed) {
      syncCalendar(trimmed);
    } else {
      onEventsChange({});
      setBusyCount(0);
      setCalendarStatus("idle");
    }
  }, [calendarUrl, saveCalendarUrl, syncCalendar, onEventsChange]);

  return (
    <div className="rounded-lg border border-raikes-gray-dark bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-sm font-medium text-raikes-black">
            Google Calendar
          </span>
          {calendarStatus === "synced" && busyCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {busyCount} busy slots
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-raikes-black/40 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-raikes-gray-dark px-4 pb-4 pt-3">
          <p className="mb-3 text-xs text-raikes-black/50">
            Import your Google Calendar to see your schedule on the availability
            grid.
          </p>

          <div className="flex gap-2">
            <input
              type="url"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              placeholder="Paste your calendar's secret ICS URL..."
              className="flex-1 rounded-md border border-raikes-gray-dark bg-raikes-gray px-3 py-2 text-sm text-raikes-black placeholder:text-raikes-black/30 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={handleSave}
              disabled={calendarStatus === "syncing"}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {calendarStatus === "syncing" ? "Syncing..." : "Sync"}
            </button>
          </div>

          {calendarStatus === "error" && calendarError && (
            <p className="mt-2 text-xs text-red-600">{calendarError}</p>
          )}

          {calendarStatus === "synced" && (
            <p className="mt-2 text-xs text-green-600">
              Calendar synced — {busyCount} busy slots found this week
            </p>
          )}

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800"
          >
            {showHelp ? "Hide instructions" : "How to find your ICS URL"}
          </button>

          {showHelp && (
            <div className="mt-2 rounded-md bg-blue-50 p-3 text-xs text-raikes-black/70">
              <ol className="list-inside list-decimal space-y-1.5">
                <li>
                  Open <span className="font-medium">Google Calendar</span> in
                  your browser
                </li>
                <li>
                  Click the <span className="font-medium">gear icon</span>{" "}
                  (Settings) in the top right
                </li>
                <li>
                  In the left sidebar, click on the calendar you want to share
                </li>
                <li>
                  Scroll to{" "}
                  <span className="font-medium">
                    "Secret address in iCal format"
                  </span>
                </li>
                <li>Copy the URL and paste it above</li>
              </ol>
              <p className="mt-2 text-raikes-black/50">
                This URL is read-only and private to you. It lets us see your
                events to display on the availability grid.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
