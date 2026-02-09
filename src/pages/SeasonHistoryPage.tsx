import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import SeasonCard from "../components/season/SeasonCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

export default function SeasonHistoryPage() {
  const seasons = useQuery(api.seasons.list, { status: "completed" });

  if (seasons === undefined) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-raikes-black">Season History</h1>
      <p className="mt-1 text-sm text-raikes-black/50">
        Browse past tournament seasons and final standings
      </p>

      {seasons.length === 0 ? (
        <EmptyState
          title="No completed seasons"
          description="Completed seasons will appear here"
        />
      ) : (
        <div className="mt-6 space-y-3">
          {seasons.map((season) => (
            <SeasonCard key={season._id} season={season} />
          ))}
        </div>
      )}
    </div>
  );
}
