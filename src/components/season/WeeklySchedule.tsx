import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import MatchCard from "../match/MatchCard";
import LoadingSpinner from "../common/LoadingSpinner";

export default function WeeklySchedule({
  seasonId,
  weekNumber,
  totalWeeks,
  currentWeek,
  currentUserId,
  onWeekChange,
  seasonStartDate,
  isAdmin,
}: {
  seasonId: Id<"seasons">;
  weekNumber: number;
  totalWeeks: number;
  currentWeek: number;
  currentUserId?: Id<"users"> | null;
  onWeekChange: (week: number) => void;
  seasonStartDate?: string;
  isAdmin?: boolean;
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
          {[...matches]
            .sort((a, b) => {
              // Current user's matches first
              const aIsMine =
                currentUserId &&
                (a.player1Id === currentUserId || a.player2Id === currentUserId);
              const bIsMine =
                currentUserId &&
                (b.player1Id === currentUserId || b.player2Id === currentUserId);
              if (aIsMine && !bIsMine) return -1;
              if (!aIsMine && bIsMine) return 1;

              // Scheduled matches before TBD
              const aScheduled = a.scheduledDay && a.scheduledTime;
              const bScheduled = b.scheduledDay && b.scheduledTime;
              if (aScheduled && !bScheduled) return -1;
              if (!aScheduled && bScheduled) return 1;

              // Sort scheduled matches chronologically
              if (aScheduled && bScheduled) {
                const dayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
                const aDayIdx = dayOrder.indexOf(a.scheduledDay!);
                const bDayIdx = dayOrder.indexOf(b.scheduledDay!);
                if (aDayIdx !== bDayIdx) return aDayIdx - bDayIdx;
                return a.scheduledTime!.localeCompare(b.scheduledTime!);
              }

              return 0;
            })
            .map((match) => (
              <MatchCard
                key={match._id}
                match={match}
                currentUserId={currentUserId}
                isCurrentWeek={weekNumber === currentWeek}
                seasonStartDate={seasonStartDate}
                calendarWeek={weekNumber}
                isAdmin={isAdmin}
              />
            ))}
        </div>
      )}
    </div>
  );
}
