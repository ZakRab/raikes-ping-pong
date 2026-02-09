import { internalMutation } from "./_generated/server";
import { generateRoundRobinSchedule } from "./scheduling";

const TEST_PLAYERS = [
  "Alex Chen",
  "Jordan Rivera",
  "Sam Patel",
  "Morgan Lee",
  "Casey Brooks",
  "Riley Quinn",
  "Taylor Singh",
  "Avery Kim",
  "Jamie Zhao",
  "Drew Martinez",
];

export const seedTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Create test user accounts
    const userIds = [];
    for (const name of TEST_PLAYERS) {
      const email = `${name.toLowerCase().replace(" ", ".")}@test.raikes.edu`;
      // Check if user already exists
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      if (existing) {
        userIds.push(existing._id);
      } else {
        const userId = await ctx.db.insert("users", {
          name,
          email,
        });
        userIds.push(userId);
      }
    }

    // Create a test season
    const seasonId = await ctx.db.insert("seasons", {
      name: "Spring 2026",
      status: "registration",
      startDate: "2026-02-09",
      endDate: "2026-05-15",
      totalWeeks: 14,
      currentWeek: 0,
      createdBy: userIds[0],
    });

    // Add all players to the season
    for (let i = 0; i < userIds.length; i++) {
      await ctx.db.insert("seasonPlayers", {
        seasonId,
        userId: userIds[i],
        displayName: TEST_PLAYERS[i],
        wins: 0,
        losses: 0,
      });
    }

    // Start the season - generate schedule
    const schedule = generateRoundRobinSchedule(userIds, 14);
    for (const match of schedule) {
      await ctx.db.insert("matches", {
        seasonId,
        weekNumber: match.weekNumber,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        status: "scheduled",
      });
    }

    // Set season to active
    await ctx.db.patch(seasonId, {
      status: "active",
      currentWeek: 1,
    });

    // Simulate some results for weeks 1-2 to make it interesting
    const week1Matches = await ctx.db
      .query("matches")
      .withIndex("by_season_and_week", (q) =>
        q.eq("seasonId", seasonId).eq("weekNumber", 1)
      )
      .collect();

    for (const match of week1Matches) {
      // Random winner
      const winnerId = Math.random() > 0.5 ? match.player1Id : match.player2Id;
      const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;

      await ctx.db.patch(match._id, {
        winnerId,
        reportedBy: winnerId,
        status: "completed",
      });

      // Update stats
      const winnerSP = await ctx.db
        .query("seasonPlayers")
        .withIndex("by_season_and_user", (q) =>
          q.eq("seasonId", seasonId).eq("userId", winnerId)
        )
        .first();
      if (winnerSP) {
        await ctx.db.patch(winnerSP._id, { wins: winnerSP.wins + 1 });
      }

      const loserSP = await ctx.db
        .query("seasonPlayers")
        .withIndex("by_season_and_user", (q) =>
          q.eq("seasonId", seasonId).eq("userId", loserId)
        )
        .first();
      if (loserSP) {
        await ctx.db.patch(loserSP._id, { losses: loserSP.losses + 1 });
      }
    }

    return { seasonId, playerCount: userIds.length, matchCount: schedule.length };
  },
});
