import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
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

export const getNextForPlayer = query({
  args: {
    seasonId: v.id("seasons"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const season = await ctx.db.get(args.seasonId);
    if (!season || season.status !== "active") return null;

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

    const currentWeekMatches = [...asP1, ...asP2].filter(
      (m) => m.weekNumber === season.currentWeek && m.status === "scheduled"
    );

    if (currentWeekMatches.length === 0) return null;

    // Sort: scheduled time first, then TBD
    const dayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    currentWeekMatches.sort((a, b) => {
      const aHasTime = a.scheduledDay && a.scheduledTime;
      const bHasTime = b.scheduledDay && b.scheduledTime;
      if (aHasTime && !bHasTime) return -1;
      if (!aHasTime && bHasTime) return 1;
      if (aHasTime && bHasTime) {
        const aDayIdx = dayOrder.indexOf(a.scheduledDay!);
        const bDayIdx = dayOrder.indexOf(b.scheduledDay!);
        if (aDayIdx !== bDayIdx) return aDayIdx - bDayIdx;
        return a.scheduledTime!.localeCompare(b.scheduledTime!);
      }
      return 0;
    });

    const first = currentWeekMatches[0];
    const opponentId =
      first.player1Id === args.userId ? first.player2Id : first.player1Id;

    const sp = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season_and_user", (q) =>
        q.eq("seasonId", args.seasonId).eq("userId", opponentId)
      )
      .first();

    return {
      matchId: first._id,
      opponentName: sp?.displayName ?? "Unknown",
      scheduledDay: first.scheduledDay,
      scheduledTime: first.scheduledTime,
      totalCount: currentWeekMatches.length,
    };
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
    if (!userId) throw new ConvexError("Not authenticated");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new ConvexError("Match not found");
    if (match.status !== "scheduled")
      throw new ConvexError("Match already completed");

    // Check reporter is a participant or season creator
    const season = await ctx.db.get(match.seasonId);
    if (!season) throw new ConvexError("Season not found");
    const isParticipant =
      match.player1Id === userId || match.player2Id === userId;
    const isCreator = season.createdBy === userId;
    if (!isParticipant && !isCreator)
      throw new ConvexError("Only match participants or the season creator can report results");

    // Only allow reporting results for the current week
    if (match.weekNumber !== season.currentWeek)
      throw new ConvexError("Results can only be reported for the current week");

    // Validate scores: best of 5, winner must have 3, loser 0-2
    const { player1Score, player2Score } = args;
    const validScores =
      (player1Score === 3 && player2Score >= 0 && player2Score <= 2) ||
      (player2Score === 3 && player1Score >= 0 && player1Score <= 2);
    if (!validScores)
      throw new ConvexError("Invalid score: winner must have 3 games, loser 0-2");

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

    // Notify GroupMe
    const winnerName = winnerSP?.displayName ?? "Unknown";
    const loserName = loserSP?.displayName ?? "Unknown";
    const winnerScore = winnerId === match.player1Id ? player1Score : player2Score;
    const loserScore = winnerId === match.player1Id ? player2Score : player1Score;
    const scoreStr = `${winnerScore}-${loserScore}`;
    await ctx.scheduler.runAfter(0, internal.groupme.sendMessage, {
      text: `🏓 ${winnerName} beat ${loserName} ${scoreStr}`,
    });

    // DM both players
    const winner = await ctx.db.get(winnerId);
    const loser = await ctx.db.get(loserId);
    if (winner?.groupmeUserId) {
      await ctx.scheduler.runAfter(0, internal.groupme.sendDirectMessage, {
        recipientId: winner.groupmeUserId,
        text: `Result recorded: You beat ${loserName} ${scoreStr}`,
      });
    }
    if (loser?.groupmeUserId) {
      await ctx.scheduler.runAfter(0, internal.groupme.sendDirectMessage, {
        recipientId: loser.groupmeUserId,
        text: `Result recorded: ${winnerName} beat you ${scoreStr}`,
      });
    }
  },
});

export const undoResult = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.isAdmin) throw new ConvexError("Admin access required");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new ConvexError("Match not found");
    if (match.status !== "completed")
      throw new ConvexError("Match is not completed");

    // Decrement winner's wins
    if (match.winnerId) {
      const winnerSP = await ctx.db
        .query("seasonPlayers")
        .withIndex("by_season_and_user", (q) =>
          q.eq("seasonId", match.seasonId).eq("userId", match.winnerId!)
        )
        .first();
      if (winnerSP) {
        await ctx.db.patch(winnerSP._id, { wins: Math.max(0, winnerSP.wins - 1) });
      }
    }

    // Decrement loser's losses
    const loserId = match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
    const loserSP = await ctx.db
      .query("seasonPlayers")
      .withIndex("by_season_and_user", (q) =>
        q.eq("seasonId", match.seasonId).eq("userId", loserId)
      )
      .first();
    if (loserSP) {
      await ctx.db.patch(loserSP._id, { losses: Math.max(0, loserSP.losses - 1) });
    }

    // Reset match to scheduled
    await ctx.db.patch(args.matchId, {
      status: "scheduled",
      winnerId: undefined,
      player1Score: undefined,
      player2Score: undefined,
      reportedBy: undefined,
    });
  },
});

export const getUnplayedCount = query({
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
    return matches.filter((m) => m.status === "scheduled").length;
  },
});

export const getValidRescheduleSlots = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return [];

    const season = await ctx.db.get(match.seasonId);
    if (!season) return [];

    // Get both players' availability
    const p1Avail = await ctx.db
      .query("playerAvailability")
      .withIndex("by_user", (q) => q.eq("userId", match.player1Id))
      .first();
    const p2Avail = await ctx.db
      .query("playerAvailability")
      .withIndex("by_user", (q) => q.eq("userId", match.player2Id))
      .first();

    const p1Slots = (p1Avail?.slots as Record<string, number>) ?? {};
    const p2Slots = (p2Avail?.slots as Record<string, number>) ?? {};

    // Get all other matches this week to find conflicts
    const weekMatches = await ctx.db
      .query("matches")
      .withIndex("by_season_and_week", (q) =>
        q.eq("seasonId", match.seasonId).eq("weekNumber", match.weekNumber)
      )
      .collect();

    // Build sets of blocked slots: table conflicts + player conflicts
    const tableSlots = new Set<string>();
    const player1Slots = new Set<string>();
    const player2Slots = new Set<string>();
    for (const other of weekMatches) {
      if (other._id === args.matchId || other.status === "completed") continue;
      if (!other.scheduledDay || !other.scheduledTime) continue;
      const slot = `${other.scheduledDay}-${other.scheduledTime}`;
      tableSlots.add(slot);
      if (other.player1Id === match.player1Id || other.player2Id === match.player1Id) {
        player1Slots.add(slot);
      }
      if (other.player1Id === match.player2Id || other.player2Id === match.player2Id) {
        player2Slots.add(slot);
      }
    }

    // Generate all valid slots: both available, no table conflict, no player conflict
    const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const validSlots: { day: string; time: string }[] = [];

    for (const day of DAYS) {
      for (let hour = 8; hour < 22; hour++) {
        for (let min = 0; min < 60; min += 30) {
          const hh = String(hour).padStart(2, "0");
          const mm = String(min).padStart(2, "0");
          const time = `${hh}:${mm}`;
          const key = `${day}-${time}`;

          if ((p1Slots[key] ?? 0) <= 0) continue;
          if ((p2Slots[key] ?? 0) <= 0) continue;
          if (tableSlots.has(key)) continue;
          if (player1Slots.has(key)) continue;
          if (player2Slots.has(key)) continue;

          validSlots.push({ day, time });
        }
      }
    }

    return validSlots;
  },
});

export const rescheduleMatch = mutation({
  args: {
    matchId: v.id("matches"),
    scheduledDay: v.string(),
    scheduledTime: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new ConvexError("Match not found");
    if (match.status !== "scheduled")
      throw new ConvexError("Match already completed");

    const isParticipant =
      match.player1Id === userId || match.player2Id === userId;
    if (!isParticipant)
      throw new ConvexError("Only match participants can reschedule");

    const season = await ctx.db.get(match.seasonId);
    if (!season) throw new ConvexError("Season not found");
    if (match.weekNumber !== season.currentWeek)
      throw new ConvexError("Can only reschedule current week matches");

    // Check table conflict: no other match at the same slot in the same week
    const weekMatches = await ctx.db
      .query("matches")
      .withIndex("by_season_and_week", (q) =>
        q.eq("seasonId", match.seasonId).eq("weekNumber", match.weekNumber)
      )
      .collect();

    for (const other of weekMatches) {
      if (other._id === args.matchId) continue;
      if (other.scheduledDay === args.scheduledDay && other.scheduledTime === args.scheduledTime) {
        throw new ConvexError("Table conflict: another match is already scheduled at that time");
      }
    }

    await ctx.db.patch(args.matchId, {
      scheduledDay: args.scheduledDay,
      scheduledTime: args.scheduledTime,
    });

    // DM the opponent (not the person who rescheduled)
    const opponentId = userId === match.player1Id ? match.player2Id : match.player1Id;
    const opponent = await ctx.db.get(opponentId);
    const reschedUser = await ctx.db.get(userId);
    const reschedName = reschedUser?.name ?? "Unknown";

    const DAY_LABELS: Record<string, string> = {
      mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
    };
    const [hh, mm] = args.scheduledTime.split(":");
    const hour = parseInt(hh);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const timeStr = `${DAY_LABELS[args.scheduledDay] ?? args.scheduledDay} ${displayHour}:${mm} ${ampm}`;

    if (opponent?.groupmeUserId) {
      await ctx.scheduler.runAfter(0, internal.groupme.sendDirectMessage, {
        recipientId: opponent.groupmeUserId,
        text: `${reschedName} rescheduled your ping pong match to ${timeStr}`,
      });
    }
  },
});
