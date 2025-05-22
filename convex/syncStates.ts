import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get sync state by type
export const getSyncState = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("syncStates")
      .filter(q => q.eq(q.field("type"), args.type))
      .first();
  },
});

// Update or create sync state
export const upsertSyncState = mutation({
  args: {
    type: v.string(),
    syncInProgress: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const existingState = await ctx.db.query("syncStates")
      .filter(q => q.eq(q.field("type"), args.type))
      .first();

    if (existingState) {
      await ctx.db.patch(existingState._id, {
        syncInProgress: args.syncInProgress,
        updatedAt: now,
        ...(args.syncInProgress ? {} : { lastSyncTime: now }),
      });
      return existingState._id;
    }

    return await ctx.db.insert("syncStates", {
      type: args.type,
      syncInProgress: args.syncInProgress,
      lastSyncTime: now,
      createdAt: now,
      updatedAt: now,
    });
  },
}); 