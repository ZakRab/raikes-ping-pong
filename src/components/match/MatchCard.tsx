import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatScheduledTime } from "../../lib/time";
import { buildGoogleCalendarUrl } from "../../lib/calendar";
import AvailabilityOverlapModal from "./AvailabilityOverlapModal";

const DAY_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

function formatTimeLabel(time: string) {
  const [hh, mm] = time.split(":");
  const hour = parseInt(hh);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${mm} ${ampm}`;
}

type Match = {
  _id: Id<"matches">;
  player1Id: Id<"users">;
  player2Id: Id<"users">;
  player1Name: string;
  player2Name: string;
  winnerId?: Id<"users">;
  player1Score?: number;
  player2Score?: number;
  status: "scheduled" | "completed";
  scheduledDay?: string;
  scheduledTime?: string;
  weekNumber: number;
};

export default function MatchCard({
  match,
  currentUserId,
  isCurrentWeek,
  seasonStartDate,
  calendarWeek,
  isAdmin,
}: {
  match: Match;
  currentUserId?: Id<"users"> | null;
  isCurrentWeek?: boolean;
  seasonStartDate?: string;
  calendarWeek?: number;
  isAdmin?: boolean;
}) {
  const [reporting, setReporting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [showOverlap, setShowOverlap] = useState(false);

  const [p1Score, setP1Score] = useState<number | null>(null);
  const [p2Score, setP2Score] = useState<number | null>(null);
  const [reschedSlot, setReschedSlot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reportResult = useMutation(api.matches.reportResult);
  const rescheduleMatch = useMutation(api.matches.rescheduleMatch);
  const undoResult = useMutation(api.matches.undoResult);
  const validSlots = useQuery(
    api.matches.getValidRescheduleSlots,
    rescheduling ? { matchId: match._id } : "skip"
  );

  const isParticipant =
    currentUserId &&
    (match.player1Id === currentUserId || match.player2Id === currentUserId);

  const canReport = match.status === "scheduled" && isParticipant && isCurrentWeek !== false;
  const canReschedule = match.status === "scheduled" && isParticipant && isCurrentWeek !== false;
  const isTBD = match.status === "scheduled" && !match.scheduledDay && !match.scheduledTime;
  const isScheduled = match.status === "scheduled" && match.scheduledDay && match.scheduledTime;

  const handleReport = async () => {
    if (p1Score === null || p2Score === null) {
      setError("Enter both scores");
      return;
    }
    const valid =
      (p1Score === 3 && p2Score >= 0 && p2Score <= 2) ||
      (p2Score === 3 && p1Score >= 0 && p1Score <= 2);
    if (!valid) {
      setError("Winner must have 3, loser 0-2");
      return;
    }
    try {
      await reportResult({
        matchId: match._id,
        player1Score: p1Score,
        player2Score: p2Score,
      });
      setReporting(false);
      setError(null);
    } catch (e: any) {
      setError(e.data || e.message || "Failed to report");
    }
  };

  const handleReschedule = async () => {
    if (!reschedSlot) return;
    const [day, time] = reschedSlot.split("|");
    try {
      await rescheduleMatch({
        matchId: match._id,
        scheduledDay: day,
        scheduledTime: time,
      });
      setRescheduling(false);
      setReschedSlot("");
      setError(null);
    } catch (e: any) {
      setError(e.data || e.message || "Failed to reschedule");
    }
  };

  const handleAddToCalendar = () => {
    if (!seasonStartDate || !calendarWeek || !match.scheduledDay || !match.scheduledTime) return;
    const opponentName = currentUserId === match.player1Id ? match.player2Name : match.player1Name;
    window.open(
      buildGoogleCalendarUrl({
        title: `Ping Pong: vs ${opponentName}`,
        seasonStartDate,
        currentWeek: calendarWeek,
        scheduledDay: match.scheduledDay,
        scheduledTime: match.scheduledTime,
      }),
      "_blank"
    );
  };

  const handleUndo = async () => {
    try {
      await undoResult({ matchId: match._id });
    } catch (e: any) {
      setError(e.data || e.message || "Failed to undo");
    }
  };

  const scoreButtons = (current: number | null, onChange: (v: number) => void) =>
    [0, 1, 2, 3].map((n) => (
      <button
        key={n}
        onClick={() => { onChange(n); setError(null); }}
        className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
          current === n
            ? "bg-raikes-red text-white"
            : "border border-raikes-gray-dark hover:border-raikes-red hover:text-raikes-red"
        }`}
      >
        {n}
      </button>
    ));

  return (
    <div className="rounded-lg border border-raikes-gray-dark bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`font-medium ${
              match.winnerId === match.player1Id
                ? "text-green-600"
                : match.winnerId === match.player2Id
                  ? "text-raikes-black/40"
                  : ""
            }`}
          >
            {match.player1Name}
          </span>
          {match.status === "completed" && match.player1Score != null && match.player2Score != null ? (
            <span className="text-sm font-semibold tabular-nums text-raikes-black/60">
              {match.player1Score} – {match.player2Score}
            </span>
          ) : (
            <span className="text-xs font-medium text-raikes-black/30">VS</span>
          )}
          <span
            className={`font-medium ${
              match.winnerId === match.player2Id
                ? "text-green-600"
                : match.winnerId === match.player1Id
                  ? "text-raikes-black/40"
                  : ""
            }`}
          >
            {match.player2Name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {match.status === "scheduled" && (
            formatScheduledTime(match.scheduledDay, match.scheduledTime) ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                {formatScheduledTime(match.scheduledDay, match.scheduledTime)}
              </span>
            ) : (
              <span className="text-xs text-raikes-black/30">Time TBD</span>
            )
          )}
          {/* Google Calendar button */}
          {isScheduled && seasonStartDate && calendarWeek && (
            <button
              onClick={handleAddToCalendar}
              className="rounded p-1 text-raikes-black/30 transition-colors hover:bg-raikes-gray hover:text-raikes-black/60"
              title="Add to Google Calendar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {match.status === "completed" ? (
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
                Completed
              </span>
              {isAdmin && (
                <button
                  onClick={handleUndo}
                  className="rounded-md border border-raikes-gray-dark px-2 py-1 text-xs font-medium text-raikes-black/40 transition-colors hover:bg-raikes-gray hover:text-raikes-black"
                >
                  Undo
                </button>
              )}
            </div>
          ) : canReport && !reporting && !rescheduling ? (
            <div className="flex items-center gap-1.5">
              {canReschedule && (
                <button
                  onClick={() => { setRescheduling(true); setError(null); }}
                  className="rounded-md border border-raikes-gray-dark px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-raikes-gray"
                >
                  Reschedule
                </button>
              )}
              <button
                onClick={() => setReporting(true)}
                className="rounded-md bg-raikes-red px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-raikes-red-dark"
              >
                Report Result
              </button>
            </div>
          ) : !canReport && !rescheduling ? (
            <span className="rounded-full bg-raikes-gray px-2.5 py-1 text-xs font-medium text-raikes-black/40">
              Scheduled
            </span>
          ) : null}
          {/* Overlap button for TBD matches */}
          {isTBD && isParticipant && (
            <button
              onClick={() => setShowOverlap(!showOverlap)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                showOverlap
                  ? "border-blue-300 bg-blue-50 text-blue-600"
                  : "border-raikes-gray-dark hover:bg-raikes-gray"
              }`}
            >
              View Availability
            </button>
          )}
        </div>
      </div>

      {/* Reschedule form */}
      {rescheduling && (
        <div className="mt-3 border-t border-raikes-gray-dark pt-3">
          {validSlots === undefined ? (
            <p className="text-xs text-raikes-black/40">Loading available times...</p>
          ) : validSlots.length === 0 ? (
            <div>
              <p className="text-xs text-raikes-black/50">No overlapping availability found.</p>
              <button
                onClick={() => { setRescheduling(false); setError(null); }}
                className="mt-2 text-xs text-raikes-black/40 hover:text-raikes-black"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <select
                value={reschedSlot}
                onChange={(e) => setReschedSlot(e.target.value)}
                className="rounded-md border border-raikes-gray-dark px-2 py-1.5 text-sm"
              >
                <option value="">Pick a time...</option>
                {validSlots.map((s) => (
                  <option key={`${s.day}|${s.time}`} value={`${s.day}|${s.time}`}>
                    {DAY_LABELS[s.day] ?? s.day} {formatTimeLabel(s.time)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleReschedule}
                disabled={!reschedSlot}
                className="rounded-md bg-raikes-red px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-raikes-red-dark disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => { setRescheduling(false); setReschedSlot(""); setError(null); }}
                className="text-xs text-raikes-black/40 hover:text-raikes-black"
              >
                Cancel
              </button>
            </div>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-500">{error}</p>
          )}
        </div>
      )}

      {/* Report result form */}
      {reporting && (
        <div className="mt-3 border-t border-raikes-gray-dark pt-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="mb-1.5 text-xs font-medium text-raikes-black/50">
                {match.player1Name}
              </p>
              <div className="flex gap-1.5">
                {scoreButtons(p1Score, setP1Score)}
              </div>
            </div>
            <div className="flex-1">
              <p className="mb-1.5 text-xs font-medium text-raikes-black/50">
                {match.player2Name}
              </p>
              <div className="flex gap-1.5">
                {scoreButtons(p2Score, setP2Score)}
              </div>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-500">{error}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleReport}
              disabled={p1Score === null || p2Score === null}
              className="rounded-md bg-raikes-red px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-raikes-red-dark disabled:opacity-40"
            >
              Submit
            </button>
            <button
              onClick={() => { setReporting(false); setP1Score(null); setP2Score(null); setError(null); }}
              className="text-xs text-raikes-black/40 hover:text-raikes-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* General error (e.g. from undo) */}
      {error && !reporting && !rescheduling && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {/* Availability overlap */}
      {showOverlap && (
        <div className="mt-3 border-t border-raikes-gray-dark pt-3">
          <AvailabilityOverlapModal
            player1Id={match.player1Id}
            player2Id={match.player2Id}
            player1Name={match.player1Name}
            player2Name={match.player2Name}
          />
        </div>
      )}
    </div>
  );
}
