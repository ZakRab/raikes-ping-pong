import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { auth } from "./auth";
import { generateRoundRobinSchedule } from "./scheduling";
import { autoScheduleMatches } from "./autoScheduler";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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
    if (season.status === "completed")
      throw new Error("Season is already completed");

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

    // If season is active, generate matches for remaining weeks
    if (season.status === "active") {
      const otherPlayers = await ctx.db
        .query("seasonPlayers")
        .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
        .collect();

      // Exclude the player who just joined (they were just inserted above)
      const opponents = otherPlayers.filter((p) => p.userId !== userId);
      const remainingWeeks = season.totalWeeks - season.currentWeek + 1;

      if (opponents.length > 0 && remainingWeeks > 0) {
        // Distribute opponents across remaining weeks as evenly as possible
        const startWeek = season.currentWeek;
        for (let i = 0; i < opponents.length; i++) {
          const weekNumber = startWeek + (i % remainingWeeks);
          await ctx.db.insert("matches", {
            seasonId: args.seasonId,
            weekNumber,
            player1Id: userId,
            player2Id: opponents[i].userId,
            status: "scheduled",
          });
        }

        // Auto-schedule the current week's new matches
        await scheduleWeekMatches(ctx, args.seasonId, season.currentWeek);
      }
    }
  },
});

async function scheduleWeekMatches(ctx: MutationCtx, seasonId: Id<"seasons">, weekNumber: number) {
  const weekMatches = await ctx.db
    .query("matches")
    .withIndex("by_season_and_week", (q) =>
      q.eq("seasonId", seasonId).eq("weekNumber", weekNumber)
    )
    .collect();

  if (weekMatches.length === 0) return;

  // Collect unique player IDs
  const playerIds = new Set<string>();
  for (const m of weekMatches) {
    playerIds.add(m.player1Id);
    playerIds.add(m.player2Id);
  }

  // Fetch availability for involved players
  const availabilityMap = new Map<string, Record<string, number>>();
  for (const pid of playerIds) {
    const avail = await ctx.db
      .query("playerAvailability")
      .withIndex("by_user", (q) => q.eq("userId", pid as Id<"users">))
      .first();
    if (avail?.slots) {
      availabilityMap.set(pid, avail.slots as Record<string, number>);
    }
  }

  const results = autoScheduleMatches(weekMatches, availabilityMap);

  const DAY_LABELS: Record<string, string> = {
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
  };

  for (const result of results) {
    await ctx.db.patch(result.matchId, {
      scheduledDay: result.scheduledDay,
      scheduledTime: result.scheduledTime,
    });

    // DM both players about their scheduled match
    const match = weekMatches.find((m) => m._id === result.matchId);
    if (!match) continue;

    const p1 = await ctx.db.get(match.player1Id);
    const p2 = await ctx.db.get(match.player2Id);
    const [hh, mm] = result.scheduledTime.split(":");
    const hour = parseInt(hh);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const timeStr = `${DAY_LABELS[result.scheduledDay] ?? result.scheduledDay} ${displayHour}:${mm} ${ampm}`;

    if (p1?.groupmeUserId) {
      await ctx.scheduler.runAfter(0, internal.groupme.sendDirectMessage, {
        recipientId: p1.groupmeUserId,
        text: `Your ping pong match vs ${p2?.name ?? "Unknown"} is scheduled for ${timeStr}`,
      });
    }
    if (p2?.groupmeUserId) {
      await ctx.scheduler.runAfter(0, internal.groupme.sendDirectMessage, {
        recipientId: p2.groupmeUserId,
        text: `Your ping pong match vs ${p1?.name ?? "Unknown"} is scheduled for ${timeStr}`,
      });
    }
  }
}

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

    // Auto-schedule week 1 matches
    await scheduleWeekMatches(ctx, args.seasonId, 1);
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

    const newWeek = season.currentWeek + 1;
    await ctx.db.patch(args.seasonId, {
      currentWeek: newWeek,
    });

    // Auto-schedule new week's matches
    await scheduleWeekMatches(ctx, args.seasonId, newWeek);

    // Notify GroupMe
    await ctx.scheduler.runAfter(0, internal.groupme.sendMessage, {
      text: `📅 Week ${newWeek} of ${season.totalWeeks} has begun!`,
    });
  },
});

export const rerunScheduler = mutation({
  args: { seasonId: v.id("seasons") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.isAdmin) throw new Error("Only admins can re-run the scheduler");

    const season = await ctx.db.get(args.seasonId);
    if (!season) throw new Error("Season not found");
    if (season.status !== "active") throw new Error("Season is not active");

    const weekMatches = await ctx.db
      .query("matches")
      .withIndex("by_season_and_week", (q) =>
        q.eq("seasonId", args.seasonId).eq("weekNumber", season.currentWeek)
      )
      .collect();

    // Clear scheduledDay/scheduledTime on unplayed matches
    for (const match of weekMatches) {
      if (match.status === "scheduled") {
        await ctx.db.patch(match._id, {
          scheduledDay: undefined,
          scheduledTime: undefined,
        });
      }
    }

    // Re-run the auto-scheduler
    await scheduleWeekMatches(ctx, args.seasonId, season.currentWeek);
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


