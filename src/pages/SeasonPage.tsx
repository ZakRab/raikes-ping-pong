import { useState } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import Leaderboard from "../components/season/Leaderboard";
import WeeklySchedule from "../components/season/WeeklySchedule";
import LoadingSpinner from "../components/common/LoadingSpinner";

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
  const completeSeason = useMutation(api.seasons.complete);

  const [tab, setTab] = useState<"standings" | "schedule">("standings");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
          {season.status === "active" && isAdmin && (
            <>
              {season.currentWeek < season.totalWeeks && (
                <button
                  onClick={() =>
                    handleAction(() =>
                      advanceWeek({ seasonId: season._id })
                    )
                  }
                  disabled={actionLoading}
                  className="rounded-md border border-raikes-gray-dark px-3 py-1.5 text-sm font-medium transition-colors hover:bg-raikes-gray disabled:opacity-50"
                >
                  Advance Week
                </button>
              )}
              <button
                onClick={() =>
                  handleAction(() =>
                    completeSeason({ seasonId: season._id })
                  )
                }
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
          </div>

          <div className="mt-6">
            {tab === "standings" ? (
              <Leaderboard
                standings={standings}
                currentUserId={currentUserId}
              />
            ) : (
              <WeeklySchedule
                seasonId={season._id}
                weekNumber={displayWeek || 1}
                totalWeeks={season.totalWeeks}
                currentUserId={currentUserId}
                onWeekChange={setSelectedWeek}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
