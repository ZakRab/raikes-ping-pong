import { Link } from "react-router";
import type { Doc } from "../../../convex/_generated/dataModel";

const statusStyles = {
  registration: "bg-blue-50 text-blue-600",
  active: "bg-green-50 text-green-600",
  completed: "bg-raikes-gray text-raikes-black/50",
};

const statusLabels = {
  registration: "Open",
  active: "Active",
  completed: "Completed",
};

export default function SeasonCard({
  season,
  playerCount,
}: {
  season: Doc<"seasons">;
  playerCount?: number;
}) {
  return (
    <Link
      to={`/seasons/${season._id}`}
      className="block rounded-lg border border-raikes-gray-dark bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-raikes-black">{season.name}</h3>
          <p className="mt-1 text-sm text-raikes-black/50">
            {season.startDate} — {season.endDate}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[season.status]}`}
        >
          {statusLabels[season.status]}
        </span>
      </div>
      <div className="mt-3 flex gap-4 text-sm text-raikes-black/50">
        {playerCount !== undefined && (
          <span>{playerCount} players</span>
        )}
        {season.status === "active" && (
          <span>
            Week {season.currentWeek}/{season.totalWeeks}
          </span>
        )}
        {season.totalWeeks > 0 && season.status !== "active" && (
          <span>{season.totalWeeks} weeks</span>
        )}
      </div>
    </Link>
  );
}
