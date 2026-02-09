import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import MatchCard from "../match/MatchCard";
import LoadingSpinner from "../common/LoadingSpinner";

export default function WeeklySchedule({
  seasonId,
  weekNumber,
  totalWeeks,
  currentUserId,
  onWeekChange,
}: {
  seasonId: Id<"seasons">;
  weekNumber: number;
  totalWeeks: number;
  currentUserId?: Id<"users"> | null;
  onWeekChange: (week: number) => void;
}) {
  const matches = useQuery(api.matches.getForWeek, {
    seasonId,
    weekNumber,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => onWeekChange(weekNumber - 1)}
          disabled={weekNumber <= 1}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-raikes-black/60 transition-colors hover:bg-raikes-gray disabled:opacity-30 disabled:hover:bg-transparent"
        >
          Prev
        </button>
        <span className="text-sm font-medium">
          Week {weekNumber} of {totalWeeks}
        </span>
        <button
          onClick={() => onWeekChange(weekNumber + 1)}
          disabled={weekNumber >= totalWeeks}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-raikes-black/60 transition-colors hover:bg-raikes-gray disabled:opacity-30 disabled:hover:bg-transparent"
        >
          Next
        </button>
      </div>

      {matches === undefined ? (
        <LoadingSpinner />
      ) : matches.length === 0 ? (
        <p className="py-8 text-center text-sm text-raikes-black/50">
          No matches scheduled for this week
        </p>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => (
            <MatchCard
              key={match._id}
              match={match}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
