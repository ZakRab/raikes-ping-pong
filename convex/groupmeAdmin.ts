import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { auth } from "./auth";

export const getGroupMeMappings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.isAdmin) throw new Error("Only admins can view GroupMe mappings");

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name ?? u.email ?? "Unknown",
      email: u.email,
      groupmeUserId: u.groupmeUserId,
      isMapped: !!u.groupmeUserId,
    }));
  },
});

export const setGroupMeUserId = mutation({
  args: {
    userId: v.id("users"),
    groupmeUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await auth.getUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await ctx.db.get(callerId);
    if (!caller?.isAdmin) throw new Error("Only admins can set GroupMe IDs");

    await ctx.db.patch(args.userId, {
      groupmeUserId: args.groupmeUserId || undefined,
    });
  },
});

export const getGroupMembers = action({
  args: {},
  handler: async (ctx): Promise<{ userId: string; nickname: string }[]> => {
    const members: { userId: string; nickname: string }[] =
      await ctx.runAction(internal.groupme.fetchGroupMembers);
    return members ?? [];
  },
});

export const autoMatchGroupMe = action({
  args: {},
  handler: async (ctx): Promise<{ matched: number; total: number }> => {
    const members: { userId: string; nickname: string }[] =
      await ctx.runAction(internal.groupme.fetchGroupMembers);
    if (!members || members.length === 0) return { matched: 0, total: 0 };

    const result: { matched: number; total: number } =
      await ctx.runMutation(internal.groupmeAdmin.performAutoMatch, {
        members,
      });
    return result;
  },
});

export const performAutoMatch = internalMutation({
  args: {
    members: v.array(v.object({ userId: v.string(), nickname: v.string() })),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    let matched = 0;

    for (const user of users) {
      if (user.groupmeUserId) continue; // Already mapped

      const userName = (user.name ?? "").toLowerCase().trim();
      if (!userName) continue;

      // Try to match by name
      const match = args.members.find((m) => {
        const nickname = m.nickname.toLowerCase().trim();
        return (
          nickname === userName ||
          nickname.includes(userName) ||
          userName.includes(nickname)
        );
      });

      if (match) {
        await ctx.db.patch(user._id, { groupmeUserId: match.userId });
        matched++;
      }
    }

    return { matched, total: args.members.length };
  },
});
