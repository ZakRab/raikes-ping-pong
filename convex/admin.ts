import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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
