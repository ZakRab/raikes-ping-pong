import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const getMyAvailability = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("playerAvailability")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
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
