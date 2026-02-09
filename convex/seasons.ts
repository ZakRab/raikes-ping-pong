import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { generateRoundRobinSchedule } from "./scheduling";

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("registration"),
        v.literal("active"),
        v.literal("completed")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("seasons")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("seasons").order("desc").collect();
  },
});

export const get = query({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, args) => {
    const season = await ctx.db.get(args.seasonId);
    if (!season) return null;

    const players = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .collect();

    return { ...season, playerCount: players.length };
  },
});

export const getStandings = query({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .collect();

    return players
      .map((p) => ({
        ...p,
        gamesPlayed: p.wins + p.losses,
        winPct: p.wins + p.losses > 0 ? p.wins / (p.wins + p.losses) : 0,
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winPct - a.winPct;
      });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    totalWeeks: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.isAdmin) throw new Error("Only admins can create seasons");

    const seasonId = await ctx.db.insert("seasons", {
      name: args.name,
      status: "registration",
      startDate: args.startDate,
      endDate: args.endDate,
      totalWeeks: args.totalWeeks,
      currentWeek: 0,
      createdBy: userId,
    });

    return seasonId;
  },
});

export const join = mutation({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const season = await ctx.db.get(args.seasonId);
    if (!season) throw new Error("Season not found");
    if (season.status !== "registration")
      throw new Error("Season is not accepting players");

    const existing = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season_and_user", (q) =>
        q.eq("seasonId", args.seasonId).eq("userId", userId)
      )
      .first();
    if (existing) throw new Error("Already joined this season");

    const user = await ctx.db.get(userId);
    const displayName = user?.name || user?.email || "Unknown Player";

    await ctx.db.insert("seasonPlayers", {
      seasonId: args.seasonId,
      userId,
      displayName,
      wins: 0,
      losses: 0,
    });
  },
});

export const start = mutation({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.isAdmin) throw new Error("Only admins can start seasons");
    const season = await ctx.db.get(args.seasonId);
    if (!season) throw new Error("Season not found");
    if (season.status !== "registration")
      throw new Error("Season is not in registration");

    const players = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
      .collect();

    if (players.length < 2)
      throw new Error("Need at least 2 players to start");

    const playerIds = players.map((p) => p.userId);
    const schedule = generateRoundRobinSchedule(playerIds, season.totalWeeks);

    for (const match of schedule) {
      await ctx.db.insert("matches", {
        seasonId: args.seasonId,
        weekNumber: match.weekNumber,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        status: "scheduled",
      });
    }

    await ctx.db.patch(args.seasonId, {
      status: "active",
      currentWeek: 1,
    });
  },
});

export const advanceWeek = mutation({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.isAdmin) throw new Error("Only admins can advance weeks");
    const season = await ctx.db.get(args.seasonId);
    if (!season) throw new Error("Season not found");
    if (season.currentWeek >= season.totalWeeks)
      throw new Error("Already at the last week");

    await ctx.db.patch(args.seasonId, {
      currentWeek: season.currentWeek + 1,
    });
  },
});

export const complete = mutation({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.isAdmin) throw new Error("Only admins can complete seasons");
    const season = await ctx.db.get(args.seasonId);
    if (!season) throw new Error("Season not found");

    await ctx.db.patch(args.seasonId, { status: "completed" });
  },
});
