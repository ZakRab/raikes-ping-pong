import { useParams, Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function PlayerPage() {
  const { userId } = useParams();
  const profile = useQuery(
    api.users.getProfile,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  if (profile === undefined) return <LoadingSpinner />;

  if (profile === null) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-medium text-raikes-black">
          Player not found
        </h2>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-raikes-red text-xl font-bold text-white">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-raikes-black">
            {profile.name}
          </h1>
          <p className="text-sm text-raikes-black/50">
            {profile.totalGames} games played across {profile.seasons.length}{" "}
            season{profile.seasons.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Overall stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-raikes-gray-dark bg-white p-4 text-center">
          <p className="text-2xl font-bold text-raikes-black">
            {profile.totalWins}
          </p>
          <p className="text-xs font-medium text-raikes-black/40">Wins</p>
        </div>
        <div className="rounded-lg border border-raikes-gray-dark bg-white p-4 text-center">
          <p className="text-2xl font-bold text-raikes-black">
            {profile.totalLosses}
          </p>
          <p className="text-xs font-medium text-raikes-black/40">Losses</p>
        </div>
        <div className="rounded-lg border border-raikes-gray-dark bg-white p-4 text-center">
          <p className="text-2xl font-bold text-raikes-black">
            {profile.totalGames}
          </p>
          <p className="text-xs font-medium text-raikes-black/40">
            Games Played
          </p>
        </div>
        <div className="rounded-lg border border-raikes-gray-dark bg-white p-4 text-center">
          <p className="text-2xl font-bold text-raikes-red">
            {(profile.winPct * 100).toFixed(0)}%
          </p>
          <p className="text-xs font-medium text-raikes-black/40">Win Rate</p>
        </div>
      </div>

      {/* Season history */}
      {profile.seasons.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-raikes-black/40">
            Seasons
          </h2>
          <div className="overflow-hidden rounded-lg border border-raikes-gray-dark">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-raikes-gray text-left text-xs font-medium uppercase tracking-wider text-raikes-black/50">
                  <th className="px-4 py-3">Season</th>
                  <th className="px-4 py-3 text-center w-16">W</th>
                  <th className="px-4 py-3 text-center w-16">L</th>
                  <th className="px-4 py-3 text-center w-20">Win%</th>
                  <th className="px-4 py-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-raikes-gray-dark">
                {profile.seasons.map((s) => {
                  const gp = s.wins + s.losses;
                  const pct = gp > 0 ? ((s.wins / gp) * 100).toFixed(0) : "0";
                  return (
                    <tr key={s._id} className="bg-white hover:bg-raikes-gray/30">
                      <td className="px-4 py-3">
                        <Link
                          to={`/seasons/${s.seasonId}`}
                          className="font-medium text-raikes-black hover:text-raikes-red"
                        >
                          {s.seasonName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-green-600">
                        {s.wins}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-raikes-red">
                        {s.losses}
                      </td>
                      <td className="px-4 py-3 text-center text-raikes-black/60">
                        {pct}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.seasonStatus === "active"
                              ? "bg-green-50 text-green-600"
                              : s.seasonStatus === "registration"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-raikes-gray text-raikes-black/50"
                          }`}
                        >
                          {s.seasonStatus === "active"
                            ? "Active"
                            : s.seasonStatus === "registration"
                              ? "Open"
                              : "Done"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent matches */}
      {profile.recentMatches.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-raikes-black/40">
            Recent Matches
          </h2>
          <div className="space-y-2">
            {profile.recentMatches.map((m) => (
              <div
                key={m._id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  m.won
                    ? "border-green-200 bg-green-50/50"
                    : "border-red-200 bg-red-50/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      m.won
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {m.won ? "W" : "L"}
                  </span>
                  <span className="text-sm">
                    vs{" "}
                    <Link
                      to={`/players/${m.opponentId}`}
                      className="font-medium text-raikes-black hover:text-raikes-red"
                    >
                      {m.opponentName}
                    </Link>
                  </span>
                </div>
                <span className="text-xs text-raikes-black/40">
                  {m.seasonName} · Week {m.weekNumber}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
