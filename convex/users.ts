import { query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get all season participations
    const participations = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Enrich with season info
    const seasons = await Promise.all(
      participations.map(async (sp) => {
        const season = await ctx.db.get(sp.seasonId);
        return {
          ...sp,
          seasonName: season?.name ?? "Unknown",
          seasonStatus: season?.status ?? "completed",
        };
      })
    );

    // Get all matches for this player
    const allMatches1 = await Promise.all(
      participations.map((sp) =>
        ctx.db
          .query("matches")
          .withIndex("by_season_and_player1", (q) =>
            q.eq("seasonId", sp.seasonId).eq("player1Id", args.userId)
          )
          .collect()
      )
    );
    const allMatches2 = await Promise.all(
      participations.map((sp) =>
        ctx.db
          .query("matches")
          .withIndex("by_season_and_player2", (q) =>
            q.eq("seasonId", sp.seasonId).eq("player2Id", args.userId)
          )
          .collect()
      )
    );

    const matches = [...allMatches1.flat(), ...allMatches2.flat()];

    // Resolve opponent names
    const playerCache = new Map<string, string>();
    const getPlayerName = async (userId: string, seasonId: string) => {
      const key = `${seasonId}:${userId}`;
      if (playerCache.has(key)) return playerCache.get(key)!;
      const allSP = await ctx.db
        .query("seasonPlayers")
        .withIndex("by_season_and_user", (q) =>
          q.eq("seasonId", seasonId as any).eq("userId", userId as any)
        )
        .first();
      const name = allSP?.displayName ?? "Unknown";
      playerCache.set(key, name);
      return name;
    };

    const recentMatches = await Promise.all(
      matches
        .filter((m) => m.status === "completed")
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, 20)
        .map(async (m) => {
          const opponentId =
            m.player1Id === args.userId ? m.player2Id : m.player1Id;
          const season = await ctx.db.get(m.seasonId);
          return {
            ...m,
            opponentName: await getPlayerName(opponentId, m.seasonId),
            opponentId,
            seasonName: season?.name ?? "Unknown",
            won: m.winnerId === args.userId,
          };
        })
    );

    const totalWins = participations.reduce((sum, p) => sum + p.wins, 0);
    const totalLosses = participations.reduce((sum, p) => sum + p.losses, 0);

    return {
      name: user.name || user.email || "Unknown",
      email: user.email,
      totalWins,
      totalLosses,
      totalGames: totalWins + totalLosses,
      winPct:
        totalWins + totalLosses > 0
          ? totalWins / (totalWins + totalLosses)
          : 0,
      seasons,
      recentMatches,
    };
  },
});
