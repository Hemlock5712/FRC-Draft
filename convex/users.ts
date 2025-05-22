import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create or update a user (for NextAuth integration)
export const upsertUser = mutation({
  args: {
    id: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...userData } = args;
    const now = new Date().toISOString();

    // If ID is provided, try to find the user
    if (id) {
      const existingUser = await ctx.db.query("users")
        .filter(q => q.eq(q.field("_id"), id))
        .first();

      if (existingUser) {
        // Update existing user
        await ctx.db.patch(existingUser._id, {
          ...userData,
          updatedAt: now,
        });
        return existingUser._id;
      }
    }

    // If email is provided, check if user exists with this email
    if (args.email) {
      const existingUserByEmail = await ctx.db.query("users")
        .filter(q => q.eq(q.field("email"), args.email))
        .first();

      if (existingUserByEmail) {
        // Update existing user by email
        await ctx.db.patch(existingUserByEmail._id, {
          ...userData,
          updatedAt: now,
        });
        return existingUserByEmail._id;
      }
    }

    // Create new user
    return await ctx.db.insert("users", {
      ...userData,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get user by ID
export const getUser = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("users")
      .filter(q => q.eq(q.field("_id"), args.id))
      .first();
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("users")
      .filter(q => q.eq(q.field("email"), args.email))
      .first();
  },
});

// Get user by username
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("users")
      .filter(q => q.eq(q.field("username"), args.username))
      .first();
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    id: v.string(), // This should be the Convex _id of the user
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    team: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...profileData } = args;
    const now = new Date().toISOString();

    // Ensure the user exists
    const existingUser = await ctx.db.query("users")
        .filter(q => q.eq(q.field("_id"), id))
        .first();

    if (!existingUser) {
      throw new Error("User not found");
    }

    // If username is being changed, ensure it's not taken by another user
    if (profileData.username && profileData.username !== existingUser.username) {
      const userByNewUsername = await ctx.db.query("users")
        .filter(q => q.eq(q.field("username"), profileData.username))
        .first();
      if (userByNewUsername) {
        throw new Error("Username already taken");
      }
    }

    await ctx.db.patch(existingUser._id, {
      ...profileData,
      updatedAt: now,
    });

    // Return the updated user data (or a subset)
    return await ctx.db.get(existingUser._id);
  },
}); 