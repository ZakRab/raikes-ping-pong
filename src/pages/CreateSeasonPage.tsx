import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";

function calcWeeks(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
}

export default function CreateSeasonPage() {
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const navigate = useNavigate();
  const createSeason = useMutation(api.seasons.create);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalWeeks = useMemo(() => calcWeeks(startDate, endDate), [startDate, endDate]);

  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  if (viewer && !viewer.isAdmin) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (totalWeeks < 1) {
      setError("End date must be after start date");
      return;
    }
    setLoading(true);

    try {
      const seasonId = await createSeason({
        name,
        startDate,
        endDate,
        totalWeeks,
      });
      navigate(`/seasons/${seasonId}`);
    } catch (e: any) {
      setError(e.message || "Failed to create season");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-4">
      <h1 className="text-2xl font-bold text-raikes-black">New Season</h1>
      <p className="mt-1 text-sm text-raikes-black/50">
        Create a new ping-pong tournament season
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-raikes-black/70">
            Season Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spring 2026"
            className="mt-1 w-full rounded-md border border-raikes-gray-dark px-3 py-2 text-sm outline-none transition-colors focus:border-raikes-red"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-raikes-black/70">
              Start Date
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-raikes-gray-dark px-3 py-2 text-sm outline-none transition-colors focus:border-raikes-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-raikes-black/70">
              End Date
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-raikes-gray-dark px-3 py-2 text-sm outline-none transition-colors focus:border-raikes-red"
            />
          </div>
        </div>

        {totalWeeks > 0 && (
          <p className="text-sm text-raikes-black/50">
            {totalWeeks} week{totalWeeks !== 1 ? "s" : ""} calculated from dates
          </p>
        )}

        {error && <p className="text-sm text-raikes-red">{error}</p>}

        <button
          type="submit"
          disabled={loading || totalWeeks < 1}
          className="w-full rounded-md bg-raikes-red py-2.5 text-sm font-medium text-white transition-colors hover:bg-raikes-red-dark disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Season"}
        </button>
      </form>
    </div>
  );
}
