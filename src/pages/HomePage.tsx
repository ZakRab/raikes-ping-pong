import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import SeasonCard from "../components/season/SeasonCard";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function HomePage() {
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const seasons = useQuery(api.seasons.list, {});
  const isAdmin = viewer?.isAdmin === true;

  if (seasons === undefined) return <LoadingSpinner />;

  const activeSeasons = seasons.filter((s) => s.status === "active");
  const registrationSeasons = seasons.filter(
    (s) => s.status === "registration"
  );
  const completedSeasons = seasons
    .filter((s) => s.status === "completed")
    .slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-raikes-black">
            Raikes Ping Pong
          </h1>
          <p className="mt-1 text-sm text-raikes-black/50">
            Round-robin tournament for Raikes students
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/seasons/new"
            className="rounded-md bg-raikes-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-raikes-red-dark"
          >
            New Season
          </Link>
        )}
      </div>

      {activeSeasons.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-raikes-black/40">
            Active Seasons
          </h2>
          <div className="space-y-3">
            {activeSeasons.map((season) => (
              <SeasonCard key={season._id} season={season} />
            ))}
          </div>
        </section>
      )}

      {registrationSeasons.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-raikes-black/40">
            Open for Registration
          </h2>
          <div className="space-y-3">
            {registrationSeasons.map((season) => (
              <SeasonCard key={season._id} season={season} />
            ))}
          </div>
        </section>
      )}

      {completedSeasons.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-raikes-black/40">
              Recent Seasons
            </h2>
            <Link
              to="/history"
              className="text-sm font-medium text-raikes-red hover:text-raikes-red-dark"
            >
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {completedSeasons.map((season) => (
              <SeasonCard key={season._id} season={season} />
            ))}
          </div>
        </section>
      )}

      {seasons.length === 0 && (
        <div className="mt-16 text-center">
          <h2 className="text-lg font-medium text-raikes-black">
            No seasons yet
          </h2>
          <p className="mt-1 text-sm text-raikes-black/50">
            {isAuthenticated
              ? "No seasons running yet. Check back soon!"
              : "Sign in to join tournaments."}
          </p>
        </div>
      )}
    </div>
  );
}
