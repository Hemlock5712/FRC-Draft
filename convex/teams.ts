import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List all teams
export const listTeams = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teams").collect();
  },
});

// Get a team by ID
export const getTeam = query({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("teams")
      .filter(q => q.eq(q.field("teamId"), args.teamId))
      .first();
  },
});

// Get a team by team number
export const getTeamByNumber = query({
  args: { teamNumber: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.query("teams")
      .filter(q => q.eq(q.field("teamNumber"), args.teamNumber))
      .first();
  },
});

// List teams with search and pagination
export const listTeamsWithSearchAndPagination = query({
  args: {
    search: v.optional(v.string()),
    paginationOpts: v.optional(v.any()),
    page: v.optional(v.number()),
    itemsPerPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchStr = args.search?.trim() || "";
    const page = args.page || 1;
    const itemsPerPage = args.itemsPerPage || 24;
    
    // Get all teams that match our filters
    let query = ctx.db.query("teams").withIndex("by_teamNumber");
    
    // Collect all matches for counting and pagination
    let allTeams = await query.collect();
    
    // If there's a search term, filter results
    if (searchStr !== "") {
      const searchNum = parseInt(searchStr);
      const isNum = !isNaN(searchNum);
      
      // Filter in memory for better substring matching
      allTeams = allTeams.filter(team => {
        // Convert team number to string for substring matching
        const teamNumberStr = team.teamNumber.toString();
        
        // If search is numeric, check if team number contains it as substring
        if (isNum && teamNumberStr.includes(searchStr)) {
          return true;
        }
        
        // Always check if name contains search string (case insensitive)
        if (team.name.toLowerCase().includes(searchStr.toLowerCase())) {
          return true;
        }
        
        // No match
        return false;
      });
    }
    
    // Sort teams by team number
    allTeams.sort((a, b) => a.teamNumber - b.teamNumber);
    
    // Calculate the total number of pages
    const totalTeams = allTeams.length;
    const totalPages = Math.ceil(totalTeams / itemsPerPage);
    
    // Get the current page of teams
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const teamsPage = allTeams.slice(startIndex, endIndex);
    
    return {
      teams: teamsPage,
      totalTeams,
      totalPages,
      currentPage: page
    };
  },
});

// Import teams from an external source
export const importTeams = mutation({
  args: {
    teams: v.array(
      v.object({
        teamId: v.string(),
        teamNumber: v.number(),
        name: v.string(),
        city: v.optional(v.string()),
        stateProv: v.optional(v.string()),
        country: v.optional(v.string()),
        rookieYear: v.optional(v.number()),
        website: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const results = [];

    for (const team of args.teams) {
      const existingTeam = await ctx.db.query("teams")
        .filter(q => q.eq(q.field("teamId"), team.teamId))
        .first();

      if (existingTeam) {
        // Update existing team
        await ctx.db.patch(existingTeam._id, {
          ...team,
          updatedAt: now,
        });
        results.push({ id: existingTeam._id, action: "updated" });
      } else {
        // Create new team
        const id = await ctx.db.insert("teams", {
          ...team,
          createdAt: now,
          updatedAt: now,
        });
        results.push({ id, action: "created" });
      }
    }

    return results;
  },
}); 