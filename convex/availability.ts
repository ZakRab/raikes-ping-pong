import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const getMyAvailability = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const avail = await ctx.db
      .query("playerAvailability")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!avail) return null;

    return avail;
  },
});

export const getAvailabilityForPlayers = query({
  args: {
    player1Id: v.id("users"),
    player2Id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const p1Avail = await ctx.db
      .query("playerAvailability")
      .withIndex("by_user", (q) => q.eq("userId", args.player1Id))
      .first();

    const p2Avail = await ctx.db
      .query("playerAvailability")
      .withIndex("by_user", (q) => q.eq("userId", args.player2Id))
      .first();

    const p1Slots = (p1Avail?.slots as Record<string, number>) ?? {};
    const p2Slots = (p2Avail?.slots as Record<string, number>) ?? {};

    // Compute overlap: slots where both players are available
    const overlapSlots: Record<string, boolean> = {};
    for (const key of Object.keys(p1Slots)) {
      if (p1Slots[key] > 0 && p2Slots[key] > 0) {
        overlapSlots[key] = true;
      }
    }

    return {
      player1Slots: p1Slots,
      player2Slots: p2Slots,
      overlapSlots,
    };
  },
});

export const saveAvailability = mutation({
  args: {
    slots: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("playerAvailability")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        slots: args.slots,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("playerAvailability", {
        userId,
        slots: args.slots,
        updatedAt: Date.now(),
      });
    }
  },
});

export const saveCalendarUrl = mutation({
  args: {
    calendarUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("playerAvailability")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        calendarUrl: args.calendarUrl || undefined,
      });
    } else {
      await ctx.db.insert("playerAvailability", {
        userId,
        slots: {},
        calendarUrl: args.calendarUrl || undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

export const fetchCalendarFeed = action({
  args: {
    calendarUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (
      !args.calendarUrl.startsWith("https://") &&
      !args.calendarUrl.startsWith("http://")
    ) {
      return { icsText: null, error: "Invalid URL: must start with https://" };
    }

    try {
      const response = await fetch(args.calendarUrl);
      if (!response.ok) {
        return {
          icsText: null,
          error: `Failed to fetch calendar (${response.status})`,
        };
      }

      const text = await response.text();
      if (!text.includes("BEGIN:VCALENDAR")) {
        return {
          icsText: null,
          error: "Not a valid iCalendar feed",
        };
      }

      return { icsText: text, error: null };
    } catch (e: unknown) {
      return {
        icsText: null,
        error: `Failed to fetch calendar: ${e instanceof Error ? e.message : "unknown error"}`,
      };
    }
  },
});

