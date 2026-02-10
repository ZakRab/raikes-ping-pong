import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const getForWeek = query({
  args: {
    seasonId: v.id("seasons"),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_season_and_week", (q) =>
        q.eq("seasonId", args.seasonId).eq("weekNumber", args.weekNumber)
      )
      .collect();

    const playerCache = new Map<string, string>();
    const getPlayerName = async (userId: string) => {
      if (playerCache.has(userId)) return playerCache.get(userId)!;
      const sp = await ctx.db
        .query("seasonPlayers")
        .withIndex("by_season_and_user", (q) =>
          q.eq("seasonId", args.seasonId).eq("userId", userId as any)
        )
        .first();
      const name = sp?.displayName ?? "Unknown";
      playerCache.set(userId, name);
      return name;
    };

    return Promise.all(
      matches.map(async (match) => ({
        ...match,
        player1Name: await getPlayerName(match.player1Id),
        player2Name: await getPlayerName(match.player2Id),
      }))
    );
  },
});

export const getForPlayer = query({
  args: {
    seasonId: v.id("seasons"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const asP1 = await ctx.db
      .query("matches")
      .withIndex("by_season_and_player1", (q) =>
        q.eq("seasonId", args.seasonId).eq("player1Id", args.userId)
      )
      .collect();

    const asP2 = await ctx.db
      .query("matches")
      .withIndex("by_season_and_player2", (q) =>
        q.eq("seasonId", args.seasonId).eq("player2Id", args.userId)
      )
      .collect();

    const all = [...asP1, ...asP2].sort(
      (a, b) => a.weekNumber - b.weekNumber
    );

    const playerCache = new Map<string, string>();
    const getPlayerName = async (userId: string) => {
      if (playerCache.has(userId)) return playerCache.get(userId)!;
      const sp = await ctx.db
        .query("seasonPlayers")
        .withIndex("by_season_and_user", (q) =>
          q.eq("seasonId", args.seasonId).eq("userId", userId as any)
        )
        .first();
      const name = sp?.displayName ?? "Unknown";
      playerCache.set(userId, name);
      return name;
    };

    return Promise.all(
      all.map(async (match) => ({
        ...match,
        player1Name: await getPlayerName(match.player1Id),
        player2Name: await getPlayerName(match.player2Id),
      }))
    );
  },
});

export const reportResult = mutation({
  args: {
    matchId: v.id("matches"),
    player1Score: v.number(),
    player2Score: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.status !== "scheduled")
      throw new Error("Match already completed");

    // Check reporter is a participant or season creator
    const season = await ctx.db.get(match.seasonId);
    if (!season) throw new Error("Season not found");
    const isParticipant =
      match.player1Id === userId || match.player2Id === userId;
    const isCreator = season.createdBy === userId;
    if (!isParticipant && !isCreator)
      throw new Error("Only match participants or the season creator can report results");

    // Only allow reporting results for the current week
    if (match.weekNumber !== season.currentWeek)
      throw new Error("Results can only be reported for the current week");

    // Validate scores: best of 5, winner must have 3, loser 0-2
    const { player1Score, player2Score } = args;
    const validScores =
      (player1Score === 3 && player2Score >= 0 && player2Score <= 2) ||
      (player2Score === 3 && player1Score >= 0 && player1Score <= 2);
    if (!validScores)
      throw new Error("Invalid score: winner must have 3 games, loser 0-2");

    const winnerId = player1Score === 3 ? match.player1Id : match.player2Id;
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;

    // Update match
    await ctx.db.patch(args.matchId, {
      winnerId,
      player1Score,
      player2Score,
      reportedBy: userId,
      status: "completed",
    });

    // Update winner stats
    const winnerSP = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season_and_user", (q) =>
        q.eq("seasonId", match.seasonId).eq("userId", winnerId)
      )
      .first();
    if (winnerSP) {
      await ctx.db.patch(winnerSP._id, { wins: winnerSP.wins + 1 });
    }

    // Update loser stats
    const loserSP = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season_and_user", (q) =>
        q.eq("seasonId", match.seasonId).eq("userId", loserId)
      )
      .first();
    if (loserSP) {
      await ctx.db.patch(loserSP._id, { losses: loserSP.losses + 1 });
    }
  },
});
