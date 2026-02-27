import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import Leaderboard from "../components/season/Leaderboard";
import WeeklySchedule from "../components/season/WeeklySchedule";
import RulesContent from "../components/season/RulesContent";
import AvailabilityGrid from "../components/availability/AvailabilityGrid";
import CalendarSync from "../components/availability/CalendarSync";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { formatScheduledTime } from "../lib/time";

export default function SeasonPage() {
  const { seasonId } = useParams();
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const season = useQuery(
    api.seasons.get,
    seasonId ? { seasonId: seasonId as Id<"seasons"> } : "skip"
  );
  const standings = useQuery(
    api.seasons.getStandings,
    seasonId ? { seasonId: seasonId as Id<"seasons"> } : "skip"
  );

  const joinSeason = useMutation(api.seasons.join);
  const startSeason = useMutation(api.seasons.start);
  const advanceWeek = useMutation(api.seasons.advanceWeek);
  const rerunScheduler = useMutation(api.seasons.rerunScheduler);
  const completeSeason = useMutation(api.seasons.complete);

  const unplayedCount = useQuery(
    api.matches.getUnplayedCount,
    seasonId && season?.status === "active"
      ? { seasonId: seasonId as Id<"seasons">, weekNumber: season.currentWeek }
      : "skip"
  );

  const nextMatch = useQuery(
    api.matches.getNextForPlayer,
    seasonId && viewer?._id
      ? { seasonId: seasonId as Id<"seasons">, userId: viewer._id }
      : "skip"
  );

  const myAvailability = useQuery(api.availability.getMyAvailability);
  const saveAvailability = useMutation(api.availability.saveAvailability);

  const [tab, setTab] = useState<"standings" | "schedule" | "rules" | "availability">("standings");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [localSlots, setLocalSlots] = useState<Record<string, number> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [calendarEvents, setCalendarEvents] = useState<Record<string, string>>({});

  // Sync from server when availability loads
  useEffect(() => {
    if (myAvailability !== undefined && localSlots === null) {
      setLocalSlots((myAvailability?.slots as Record<string, number>) ?? {});
    }
  }, [myAvailability, localSlots]);

  const handleSlotsChange = useCallback(
    (newSlots: Record<string, number>) => {
      setLocalSlots(newSlots);
      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        await saveAvailability({ slots: newSlots });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 1000);
    },
    [saveAvailability]
  );

  if (season === undefined || standings === undefined) {
    return <LoadingSpinner />;
  }

  if (season === null) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-medium text-raikes-black">
          Season not found
        </h2>
      </div>
    );
  }

  const currentUserId = viewer?._id ?? null;
  const isAdmin = viewer?.isAdmin === true;
  const isJoined = standings.some((p) => p.userId === currentUserId);
  const displayWeek = selectedWeek ?? season.currentWeek;
  const hasAvailability = myAvailability?.slots && Object.keys(myAvailability.slots as Record<string, number>).length > 0;
  const showAvailabilityBanner = isAuthenticated && isJoined && season.status === "active" && myAvailability !== undefined && !hasAvailability;

  const handleAction = async (action: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await action();
    } catch (e: any) {
      alert(e.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-raikes-black">
            {season.name}
          </h1>
          <p className="mt-1 text-sm text-raikes-black/50">
            {season.startDate} — {season.endDate}
            {season.status === "active" && (
              <span className="ml-3">
                Week {season.currentWeek} of {season.totalWeeks}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {season.status === "registration" && (
            <>
              {isAuthenticated && !isJoined && (
                <button
                  onClick={() =>
                    handleAction(() =>
                      joinSeason({ seasonId: season._id })
                    )
                  }
                  disabled={actionLoading}
                  className="rounded-md bg-raikes-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-raikes-red-dark disabled:opacity-50"
                >
                  Join Season
                </button>
              )}
              {isJoined && (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                  Joined
                </span>
              )}
              {isAdmin && standings.length >= 2 && (
                <button
                  onClick={() =>
                    handleAction(() =>
                      startSeason({ seasonId: season._id })
                    )
                  }
                  disabled={actionLoading}
                  className="rounded-md border border-raikes-gray-dark px-4 py-2 text-sm font-medium transition-colors hover:bg-raikes-gray disabled:opacity-50"
                >
                  Start Season
                </button>
              )}
            </>
          )}
          {season.status === "active" && isAuthenticated && !isJoined && (
            <button
              onClick={() =>
                handleAction(() =>
                  joinSeason({ seasonId: season._id })
                )
              }
              disabled={actionLoading}
              className="rounded-md bg-raikes-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-raikes-red-dark disabled:opacity-50"
            >
              Join Season
            </button>
          )}
          {season.status === "active" && isAdmin && (
            <>
              <button
                onClick={() => {
                  if (!window.confirm("Re-run the scheduler? This will clear and reassign all unplayed match times for this week.")) return;
                  handleAction(() =>
                    rerunScheduler({ seasonId: season._id })
                  );
                }}
                disabled={actionLoading}
                className="rounded-md border border-raikes-gray-dark px-3 py-1.5 text-sm font-medium transition-colors hover:bg-raikes-gray disabled:opacity-50"
              >
                Re-run Scheduler
              </button>
              {season.currentWeek < season.totalWeeks && (
                <button
                  onClick={() => {
                    const unplayed = unplayedCount ?? 0;
                    const msg = unplayed > 0
                      ? `Advance to week ${season.currentWeek + 1}? There are ${unplayed} unplayed matches this week that will no longer be reportable.`
                      : `Advance to week ${season.currentWeek + 1}? Any unplayed matches from this week can no longer have results reported.`;
                    if (!window.confirm(msg)) return;
                    handleAction(() =>
                      advanceWeek({ seasonId: season._id })
                    );
                  }}
                  disabled={actionLoading}
                  className="rounded-md border border-raikes-gray-dark px-3 py-1.5 text-sm font-medium transition-colors hover:bg-raikes-gray disabled:opacity-50"
                >
                  Advance Week
                </button>
              )}
              <button
                onClick={() => {
                  if (!window.confirm("End this season? This cannot be undone.")) return;
                  handleAction(() =>
                    completeSeason({ seasonId: season._id })
                  );
                }}
                disabled={actionLoading}
                className="rounded-md border border-raikes-gray-dark px-3 py-1.5 text-sm font-medium text-raikes-red transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                End Season
              </button>
            </>
          )}
          {season.status === "completed" && (
            <span className="rounded-full bg-raikes-gray px-3 py-1 text-xs font-medium text-raikes-black/50">
              Completed
            </span>
          )}
        </div>
      </div>

      {showAvailabilityBanner && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Set your weekly availability so matches can be auto-scheduled for you.
          </p>
          <button
            onClick={() => setTab("availability")}
            className="ml-4 shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
          >
            Set Availability
          </button>
        </div>
      )}

      {nextMatch && season.status === "active" && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="text-sm text-blue-800">
            <span className="font-medium">Your Next Match:</span>{" "}
            vs {nextMatch.opponentName} —{" "}
            {formatScheduledTime(nextMatch.scheduledDay, nextMatch.scheduledTime) || "Time TBD"}
            {nextMatch.totalCount > 1 && (
              <span className="ml-2 text-blue-600">
                +{nextMatch.totalCount - 1} more this week
              </span>
            )}
          </div>
        </div>
      )}

      {/* Registration player list */}
      {season.status === "registration" && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-raikes-black/40">
            Registered Players ({season.playerCount})
          </h2>
          {standings.length === 0 ? (
            <p className="text-sm text-raikes-black/50">
              No players registered yet. Be the first!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {standings.map((p) => (
                <span
                  key={p._id}
                  className="rounded-full bg-raikes-gray px-3 py-1 text-sm"
                >
                  {p.displayName}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs for active/completed seasons */}
      {season.status !== "registration" && (
        <>
          <div className="mt-6 flex gap-1 border-b border-raikes-gray-dark">
            <button
              onClick={() => setTab("standings")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === "standings"
                  ? "border-b-2 border-raikes-red text-raikes-red"
                  : "text-raikes-black/40 hover:text-raikes-black/60"
              }`}
            >
              Standings
            </button>
            <button
              onClick={() => setTab("schedule")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === "schedule"
                  ? "border-b-2 border-raikes-red text-raikes-red"
                  : "text-raikes-black/40 hover:text-raikes-black/60"
              }`}
            >
              Schedule
            </button>
            <button
              onClick={() => setTab("rules")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === "rules"
                  ? "border-b-2 border-raikes-red text-raikes-red"
                  : "text-raikes-black/40 hover:text-raikes-black/60"
              }`}
            >
              Rules
            </button>
            {isAuthenticated && isJoined && (
              <button
                onClick={() => setTab("availability")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "availability"
                    ? "border-b-2 border-raikes-red text-raikes-red"
                    : "text-raikes-black/40 hover:text-raikes-black/60"
                }`}
              >
                Availability
              </button>
            )}
          </div>

          <div className="mt-6">
            {tab === "standings" ? (
              <Leaderboard
                standings={standings}
                currentUserId={currentUserId}
              />
            ) : tab === "schedule" ? (
              <WeeklySchedule
                seasonId={season._id}
                weekNumber={displayWeek || 1}
                totalWeeks={season.totalWeeks}
                currentWeek={season.currentWeek}
                currentUserId={currentUserId}
                onWeekChange={setSelectedWeek}
                seasonStartDate={season.startDate}
                isAdmin={isAdmin}
              />
            ) : tab === "rules" ? (
              <RulesContent />
            ) : tab === "availability" && localSlots !== null ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-raikes-black/60">
                    Set your weekly availability for match scheduling
                  </h2>
                  <span className="text-xs text-raikes-black/40">
                    {saveStatus === "saving"
                      ? "Saving..."
                      : saveStatus === "saved"
                        ? "Saved"
                        : ""}
                  </span>
                </div>
                <div className="mb-4">
                  <CalendarSync
                    savedUrl={
                      (myAvailability as Record<string, unknown> | null | undefined)
                        ?.calendarUrl as string | undefined
                    }
                    onEventsChange={setCalendarEvents}
                  />
                </div>
                <AvailabilityGrid
                  slots={localSlots}
                  onChange={handleSlotsChange}
                  calendarEvents={
                    Object.keys(calendarEvents).length > 0
                      ? calendarEvents
                      : undefined
                  }
                />
              </div>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        </>
      )}
    </div>
  );
}
