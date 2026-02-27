import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const inputResult = internalMutation({
  args: {
    matchId: v.id("matches"),
    player1Score: v.number(),
    player2Score: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.status !== "scheduled") throw new Error("Match already completed");

    const { player1Score, player2Score } = args;
    const validScores =
      (player1Score === 3 && player2Score >= 0 && player2Score <= 2) ||
      (player2Score === 3 && player1Score >= 0 && player1Score <= 2);
    if (!validScores) throw new Error("Invalid score");

    const winnerId = player1Score === 3 ? match.player1Id : match.player2Id;
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;

    await ctx.db.patch(args.matchId, {
      winnerId,
      player1Score,
      player2Score,
      status: "completed",
    });

    const winnerSP = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season_and_user", (q) =>
        q.eq("seasonId", match.seasonId).eq("userId", winnerId)
      )
      .first();
    if (winnerSP) {
      await ctx.db.patch(winnerSP._id, { wins: winnerSP.wins + 1 });
    }

    const loserSP = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season_and_user", (q) =>
        q.eq("seasonId", match.seasonId).eq("userId", loserId)
      )
      .first();
    if (loserSP) {
      await ctx.db.patch(loserSP._id, { losses: loserSP.losses + 1 });
    }

    const winnerName = winnerSP?.displayName ?? "Unknown";
    const loserName = loserSP?.displayName ?? "Unknown";
    const winnerScore = winnerId === match.player1Id ? player1Score : player2Score;
    const loserScore = winnerId === match.player1Id ? player2Score : player1Score;
    await ctx.scheduler.runAfter(0, internal.groupme.sendMessage, {
      text: `🏓 ${winnerName} beat ${loserName} ${winnerScore}-${loserScore}`,
    });

    return { winner: winnerName, loser: loserName, score: `${winnerScore}-${loserScore}` };
  },
});

export const makeAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (!user) throw new Error(`User with email ${args.email} not found`);
    await ctx.db.patch(user._id, { isAdmin: true });
    return { userId: user._id, name: user.name, email: user.email };
  },
});
