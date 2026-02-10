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
  player1Score?: number;
  player2Score?: number;
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
  const [p1Score, setP1Score] = useState<number | null>(null);
  const [p2Score, setP2Score] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reportResult = useMutation(api.matches.reportResult);

  const isParticipant =
    currentUserId &&
    (match.player1Id === currentUserId || match.player2Id === currentUserId);

  const canReport = match.status === "scheduled" && isParticipant && isCurrentWeek !== false;

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
      setError(e.message || "Failed to report");
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
    </div>
  );
}
