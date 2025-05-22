import { mutation } from "./_generated/server";

// Migration to set the nextPickOrder field on existing draftRooms
export const migrateNextPickOrder = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all draft rooms
    const draftRooms = await ctx.db.query("draftRooms").collect();
    
    // Update each room with nextPickOrder if not already set
    for (const room of draftRooms) {
      if (room.nextPickOrder === undefined) {
        // Get all participants for this room to determine current nextPickOrder
        const participants = await ctx.db.query("draftParticipants")
          .withIndex("by_draft_room", q => q.eq("draftRoomId", room._id))
          .collect();
          
        // Set nextPickOrder to participants.length + 1 (or 2 if no participants)
        const nextPickOrder = participants.length > 0 ? participants.length + 1 : 2;
        
        // Update the draft room
        await ctx.db.patch(room._id, {
          nextPickOrder,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    
    return { message: "Migration completed successfully" };
  },
}); 