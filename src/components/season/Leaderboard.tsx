import { Link } from "react-router";
import type { Id } from "../../../convex/_generated/dataModel";

type Standing = {
  _id: string;
  userId: Id<"users">;
  displayName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winPct: number;
};

export default function Leaderboard({
  standings,
  currentUserId,
}: {
  standings: Standing[];
  currentUserId?: Id<"users"> | null;
}) {
  if (standings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-raikes-black/50">
        No players yet
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-raikes-gray-dark">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-raikes-gray text-left text-xs font-medium uppercase tracking-wider text-raikes-black/50">
            <th className="px-4 py-3 w-12">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-center w-16">W</th>
            <th className="px-4 py-3 text-center w-16">L</th>
            <th className="px-4 py-3 text-center w-20">Win%</th>
            <th className="px-4 py-3 text-center w-16">GP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-raikes-gray-dark">
          {standings.map((player, i) => {
            const isCurrentUser = currentUserId && player.userId === currentUserId;
            return (
              <tr
                key={player._id}
                className={
                  isCurrentUser
                    ? "bg-raikes-red/5"
                    : i % 2 === 0
                      ? "bg-white"
                      : "bg-raikes-gray/50"
                }
              >
                <td className="px-4 py-3 font-medium">
                  {i === 0 && standings.length > 1 ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-raikes-red text-xs font-bold text-white">
                      {i + 1}
                    </span>
                  ) : (
                    <span className="pl-1.5 text-raikes-black/40">{i + 1}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link
                    to={`/players/${player.userId}`}
                    className="hover:text-raikes-red transition-colors"
                  >
                    {player.displayName}
                  </Link>
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-raikes-red">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center font-medium text-green-600">
                  {player.wins}
                </td>
                <td className="px-4 py-3 text-center font-medium text-raikes-red">
                  {player.losses}
                </td>
                <td className="px-4 py-3 text-center text-raikes-black/60">
                  {(player.winPct * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-3 text-center text-raikes-black/60">
                  {player.gamesPlayed}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
