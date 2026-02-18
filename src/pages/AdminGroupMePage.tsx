import { useState } from "react";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import LoadingSpinner from "../components/common/LoadingSpinner";

type GroupMeMember = { userId: string; nickname: string };

export default function AdminGroupMePage() {
  const { isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);
  const mappings = useQuery(
    api.groupmeAdmin.getGroupMeMappings,
    isAuthenticated && viewer?.isAdmin ? {} : "skip"
  );
  const setGroupMeUserId = useMutation(api.groupmeAdmin.setGroupMeUserId);
  const autoMatch = useAction(api.groupmeAdmin.autoMatchGroupMe);
  const fetchMembers = useAction(api.groupmeAdmin.getGroupMembers);

  const [editingId, setEditingId] = useState<Id<"users"> | null>(null);
  const [editValue, setEditValue] = useState("");
  const [autoMatchResult, setAutoMatchResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gmMembers, setGmMembers] = useState<GroupMeMember[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  if (!isAuthenticated || viewer === undefined) return <LoadingSpinner />;
  if (!viewer?.isAdmin) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-medium text-raikes-black">
          Admin access required
        </h2>
      </div>
    );
  }

  if (mappings === undefined) return <LoadingSpinner />;

  const handleAutoMatch = async () => {
    setLoading(true);
    try {
      const result = await autoMatch();
      setAutoMatchResult(`Matched ${result.matched} users from ${result.total} GroupMe members`);
    } catch (e: any) {
      setAutoMatchResult(e.message || "Auto-match failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = async (userId: Id<"users">, currentValue: string | undefined) => {
    setEditingId(userId);
    setEditValue(currentValue || "");

    // Fetch GroupMe members if we haven't yet
    if (!gmMembers) {
      setMembersLoading(true);
      try {
        const members = await fetchMembers();
        setGmMembers(members);
      } catch {
        setGmMembers([]);
      } finally {
        setMembersLoading(false);
      }
    }
  };

  const handleSave = async (userId: Id<"users">) => {
    await setGroupMeUserId({ userId, groupmeUserId: editValue });
    setEditingId(null);
    setEditValue("");
  };

  // Find the nickname for a given GroupMe user ID
  const getNickname = (gmId: string | undefined) => {
    if (!gmId || !gmMembers) return null;
    return gmMembers.find((m) => m.userId === gmId)?.nickname;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-raikes-black">
            GroupMe Mapping
          </h1>
          <p className="mt-1 text-sm text-raikes-black/50">
            Map app users to GroupMe accounts for DM notifications
          </p>
        </div>
        <button
          onClick={handleAutoMatch}
          disabled={loading}
          className="rounded-md bg-raikes-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-raikes-red-dark disabled:opacity-50"
        >
          {loading ? "Matching..." : "Auto-Match"}
        </button>
      </div>

      {autoMatchResult && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {autoMatchResult}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-raikes-gray-dark">
        <table className="w-full">
          <thead>
            <tr className="border-b border-raikes-gray-dark bg-raikes-gray">
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-raikes-black/50">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-raikes-black/50">
                Email
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-raikes-black/50">
                GroupMe Member
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-raikes-black/50">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-raikes-gray-dark bg-white">
            {mappings.map((user) => (
              <tr key={user._id}>
                <td className="px-4 py-3 text-sm font-medium text-raikes-black">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-sm text-raikes-black/60">
                  {user.email || "—"}
                </td>
                <td className="px-4 py-3">
                  {editingId === user._id ? (
                    membersLoading ? (
                      <span className="text-xs text-raikes-black/40">Loading members...</span>
                    ) : (
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full rounded-md border border-raikes-gray-dark px-2 py-1.5 text-sm"
                        autoFocus
                      >
                        <option value="">— None —</option>
                        {(gmMembers ?? []).map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.nickname}
                          </option>
                        ))}
                      </select>
                    )
                  ) : user.isMapped ? (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
                      {getNickname(user.groupmeUserId) || user.groupmeUserId}
                    </span>
                  ) : (
                    <span className="rounded-full bg-raikes-gray px-2.5 py-1 text-xs font-medium text-raikes-black/40">
                      Unmapped
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === user._id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSave(user._id)}
                        className="rounded-md bg-raikes-red px-2.5 py-1 text-xs font-medium text-white hover:bg-raikes-red-dark"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditValue(""); }}
                        className="text-xs text-raikes-black/40 hover:text-raikes-black"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(user._id, user.groupmeUserId)}
                      className="text-xs font-medium text-raikes-red hover:text-raikes-red-dark"
                    >
                      {user.isMapped ? "Change" : "Assign"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
