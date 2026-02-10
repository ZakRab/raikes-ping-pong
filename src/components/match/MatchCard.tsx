import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Match = {
  _id: Id<"matches">;
  player1Id: Id<"users">;
  player2Id: Id<"users">;
  player1Name: string;
  player2Name: string;
  winnerId?: Id<"users">;
  status: "scheduled" | "completed";
};

export default function MatchCard({
  match,
  currentUserId,
  isCurrentWeek,
}: {
  match: Match;
  currentUserId?: Id<"users"> | null;
  isCurrentWeek?: boolean;
}) {
  const [reporting, setReporting] = useState(false);
  const reportResult = useMutation(api.matches.reportResult);

  const isParticipant =
    currentUserId &&
    (match.player1Id === currentUserId || match.player2Id === currentUserId);

  const canReport = match.status === "scheduled" && isParticipant && isCurrentWeek !== false;

  const handleReport = async (winnerId: Id<"users">) => {
    try {
      await reportResult({ matchId: match._id, winnerId });
      setReporting(false);
    } catch (e) {
      console.error(e);
    }
  };

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
          <span className="text-xs font-medium text-raikes-black/30">VS</span>
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
        <div>
          {match.status === "completed" ? (
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
              Completed
            </span>
          ) : canReport && !reporting ? (
            <button
              onClick={() => setReporting(true)}
              className="rounded-md bg-raikes-red px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-raikes-red-dark"
            >
              Report Result
            </button>
          ) : !canReport ? (
            <span className="rounded-full bg-raikes-gray px-2.5 py-1 text-xs font-medium text-raikes-black/40">
              Scheduled
            </span>
          ) : null}
        </div>
      </div>

      {reporting && (
        <div className="mt-3 border-t border-raikes-gray-dark pt-3">
          <p className="mb-2 text-xs text-raikes-black/50">Who won?</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleReport(match.player1Id)}
              className="flex-1 rounded-md border border-raikes-gray-dark px-3 py-2 text-sm font-medium transition-colors hover:border-raikes-red hover:bg-raikes-red/5 hover:text-raikes-red"
            >
              {match.player1Name}
            </button>
            <button
              onClick={() => handleReport(match.player2Id)}
              className="flex-1 rounded-md border border-raikes-gray-dark px-3 py-2 text-sm font-medium transition-colors hover:border-raikes-red hover:bg-raikes-red/5 hover:text-raikes-red"
            >
              {match.player2Name}
            </button>
          </div>
          <button
            onClick={() => setReporting(false)}
            className="mt-2 text-xs text-raikes-black/40 hover:text-raikes-black"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
