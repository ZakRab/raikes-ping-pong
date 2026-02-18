import { internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const DAY_MAP: Record<number, string> = {
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
  0: "sun",
};

export const getMatchesForToday = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get today's day key in Central Time (DST-aware)
    const now = new Date();
    // Central Time: UTC-6 (CST) or UTC-5 (CDT)
    // CDT runs from second Sunday of March to first Sunday of November
    const year = now.getUTCFullYear();
    const marchFirst = new Date(Date.UTC(year, 2, 1));
    const marchSecondSunday = new Date(Date.UTC(year, 2, 8 + ((7 - marchFirst.getUTCDay()) % 7)));
    const novFirst = new Date(Date.UTC(year, 10, 1));
    const novFirstSunday = new Date(Date.UTC(year, 10, 1 + ((7 - novFirst.getUTCDay()) % 7)));
    const isDST = now >= marchSecondSunday && now < novFirstSunday;
    const centralOffsetHours = isDST ? -5 : -6;
    const centralTime = new Date(now.getTime() + (centralOffsetHours * 60 + now.getTimezoneOffset()) * 60000);
    const todayKey = DAY_MAP[centralTime.getDay()];

    // Find all active seasons
    const activeSeasons = await ctx.db
      .query("seasons")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const matchesToRemind: {
      player1Id: string;
      player2Id: string;
      player1GroupmeId?: string;
      player2GroupmeId?: string;
      player1Name: string;
      player2Name: string;
      scheduledTime: string;
    }[] = [];

    for (const season of activeSeasons) {
      const weekMatches = await ctx.db
        .query("matches")
        .withIndex("by_season_and_week", (q) =>
          q.eq("seasonId", season._id).eq("weekNumber", season.currentWeek)
        )
        .collect();

      for (const match of weekMatches) {
        if (match.status !== "scheduled" || match.scheduledDay !== todayKey) continue;
        if (!match.scheduledTime) continue;

        const p1 = await ctx.db.get(match.player1Id);
        const p2 = await ctx.db.get(match.player2Id);

        matchesToRemind.push({
          player1Id: match.player1Id,
          player2Id: match.player2Id,
          player1GroupmeId: p1?.groupmeUserId,
          player2GroupmeId: p2?.groupmeUserId,
          player1Name: p1?.name ?? "Unknown",
          player2Name: p2?.name ?? "Unknown",
          scheduledTime: match.scheduledTime,
        });
      }
    }

    return matchesToRemind;
  },
});

export const sendDayOfReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.runQuery(internal.matchReminders.getMatchesForToday);

    for (const match of matches) {
      const [hh, mm] = match.scheduledTime.split(":");
      const hour = parseInt(hh);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const timeStr = `${displayHour}:${mm} ${ampm}`;

      if (match.player1GroupmeId) {
        await ctx.runAction(internal.groupme.sendDirectMessage, {
          recipientId: match.player1GroupmeId,
          text: `Reminder: Your ping pong match vs ${match.player2Name} is today at ${timeStr}`,
        });
      }
      if (match.player2GroupmeId) {
        await ctx.runAction(internal.groupme.sendDirectMessage, {
          recipientId: match.player2GroupmeId,
          text: `Reminder: Your ping pong match vs ${match.player1Name} is today at ${timeStr}`,
        });
      }
    }
  },
});
