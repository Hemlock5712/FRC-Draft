import { mutation, query, internalMutation, internalQuery, QueryCtx, internalAction, ActionCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Define interfaces for sync function returns
interface SyncResult {
  success: boolean;
  teamsCreated: number;
  teamsUpdated: number;
  totalTeams: number;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

interface ImportResult {
  id: string;
  action: "created" | "updated";
}

interface TBATeam {
  team_number: number;
  nickname?: string;
  city?: string;
  state_prov?: string;
  country?: string;
  rookie_year?: number;
  website?: string;
}

// List all teams
export const listTeams = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teams").collect();
  },
});

// Query to find teams without cities (for debugging)
export const getTeamsWithoutCities = query({
  args: {},
  handler: async (ctx) => {
    const allTeams = await ctx.db.query("teams").collect();
    const teamsWithoutCities = allTeams.filter(team => 
      !team.city || team.city.trim() === ""
    );
    
    return {
      totalTeams: allTeams.length,
      teamsWithoutCities: teamsWithoutCities.length,
      sampleTeamsWithoutCities: teamsWithoutCities.slice(0, 10), // Show first 10 as examples
    };
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

// Internal import teams function
const importTeamsInternal = async (ctx: any, teams: any[]): Promise<ImportResult[]> => {
  const now = new Date().toISOString();
  const results: ImportResult[] = [];

  for (const team of teams) {
    const existingTeam = await ctx.db.query("teams")
      .withIndex("by_teamId", (q: any) => q.eq("teamId", team.teamId))
      .first();

    if (existingTeam) {
      // Update existing team (at this point we know team has a valid city since it passed filtering)
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
};

// Internal Mutation to process a CHUNK of teams
export const processFetchedTeams = internalMutation({
  args: { teamsToImport: v.array(v.any()) }, 
  handler: async (ctx: MutationCtx, args: { teamsToImport: TBATeam[] }): Promise<Partial<SyncResult>> => {
    const startTime = Date.now();
    console.log(`Mutation (processFetchedTeams): Received chunk of ${args.teamsToImport.length} teams for initial processing.`);
    
    const mappedTeams = args.teamsToImport.map(team => ({
      teamId: `frc${team.team_number}`,
      teamNumber: team.team_number,
      name: team.nickname || `Team ${team.team_number}`,
      city: team.city === null ? undefined : team.city, 
      stateProv: team.state_prov === null ? undefined : team.state_prov,
      country: team.country === null ? undefined : team.country,
      rookieYear: team.rookie_year === null ? undefined : team.rookie_year,
      website: team.website === null ? undefined : team.website,
    }));

    const teamsWithCity = mappedTeams.filter(team => team.city && team.city.trim() !== "");
    const teamsWithoutCity = mappedTeams.filter(team => !team.city || team.city.trim() === "");
    
    console.log(`Mutation (processFetchedTeams): ${teamsWithCity.length} teams remaining after filtering for city.`);
    console.log(`Mutation (processFetchedTeams): ${teamsWithoutCity.length} teams filtered out due to missing city.`);

    // Handle teams that had cities removed - delete them from our database
    let deletedCount = 0;
    for (const teamWithoutCity of teamsWithoutCity) {
      const existingTeam = await ctx.db.query("teams")
        .withIndex("by_teamId", (q: any) => q.eq("teamId", teamWithoutCity.teamId))
        .first();
      
      if (existingTeam) {
        await ctx.db.delete(existingTeam._id);
        deletedCount++;
        console.log(`Mutation (processFetchedTeams): Deleted team ${teamWithoutCity.teamId} (${teamWithoutCity.name}) - no longer has city`);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Mutation (processFetchedTeams): Deleted ${deletedCount} teams that lost their city data.`);
    }

    if (teamsWithCity.length === 0) {
        console.log("Mutation (processFetchedTeams): Chunk has no teams with a city to import.");
        return {
           success: true,
           teamsCreated: 0,
           teamsUpdated: 0,
           totalTeams: 0, 
         };
    }
    
    try {
      console.log(`Mutation (processFetchedTeams): Importing chunk of ${teamsWithCity.length} teams...`);
      const importResults = await importTeamsInternal(ctx, teamsWithCity);

      const created = importResults.filter(r => r.action === "created").length;
      const updated = importResults.filter(r => r.action === "updated").length;
      
      const processingTime = Date.now() - startTime;
      console.log(`Mutation (processFetchedTeams): Chunk import complete. Created: ${created}, Updated: ${updated}, Processing time: ${processingTime}ms`);
      
      return {
        success: true,
        teamsCreated: created,
        teamsUpdated: updated,
        totalTeams: teamsWithCity.length, 
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`Mutation (processFetchedTeams): Error during chunk import (${processingTime}ms):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during chunk processing",
        teamsCreated: 0,
        teamsUpdated: 0,
        totalTeams: teamsWithCity.length, 
      };
    }
  }
});

// Import teams from an external source (public API)
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
  handler: async (ctx, args): Promise<ImportResult[]> => {
    const sanitizedTeams = args.teams.map(team => ({
      ...team,
      name: team.name || `Team ${team.teamNumber}`,
      city: team.city === null ? undefined : team.city,
      stateProv: team.stateProv === null ? undefined : team.stateProv,
      country: team.country === null ? undefined : team.country,
      rookieYear: team.rookieYear === null ? undefined : team.rookieYear,
      website: team.website === null ? undefined : team.website,
    }));

    const teamsWithCity = sanitizedTeams.filter(team => team.city && team.city.trim() !== "");
    console.log(`Mutation (importTeams): Importing ${teamsWithCity.length} teams after filtering for city.`);
    
    if (teamsWithCity.length === 0) return [];
    return await importTeamsInternal(ctx, teamsWithCity);
  },
});

// Add sample teams for testing (temporary)
export const addSampleTeams = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleTeams = [
      // Ensure sample data doesn't use null for optional string/number fields.
      // Your current sample data is okay because it uses strings or omits fields (implicitly undefined).
      {
        teamId: "frc254",
        teamNumber: 254,
        name: "The Cheesy Poofs",
        city: "San Jose",
        stateProv: "California",
        country: "USA",
        rookieYear: 1999,
        website: "https://www.team254.com",
      },
      // ... (other sample teams are similarly fine)
      {
        teamId: "frc148",
        teamNumber: 148,
        name: "Robowranglers",
        city: "Greenville",
        stateProv: "Texas",
        country: "USA",
        rookieYear: 1996,
        website: "https://www.robowranglers148.com",
      },
      {
        teamId: "frc1323",
        teamNumber: 1323,
        name: "MadTown Robotics",
        city: "Madison",
        stateProv: "Wisconsin",
        country: "USA",
        rookieYear: 2004,
        website: "https://www.madtownrobotics.com",
      },
      {
        teamId: "frc1678",
        teamNumber: 1678,
        name: "Citrus Circuits",
        city: "Davis",
        stateProv: "California",
        country: "USA",
        rookieYear: 2005,
        website: "https://www.citruscircuits.org",
      },
      {
        teamId: "frc973",
        teamNumber: 973,
        name: "Greybots",
        city: "Atascadero",
        stateProv: "California",
        country: "USA",
        rookieYear: 2002,
        website: "https://www.team973.com",
      }
    ];
    const sanitizedSampleTeams = sampleTeams.map(team => ({
        ...team,
        city: team.city === null ? undefined : team.city,
        stateProv: team.stateProv === null ? undefined : team.stateProv,
        country: team.country === null ? undefined : team.country,
        rookieYear: team.rookieYear === null ? undefined : team.rookieYear, 
        website: team.website === null ? undefined : team.website,
    }));

    const teamsWithCity = sanitizedSampleTeams.filter(team => team.city && team.city.trim() !== "");
    console.log(`Mutation (addSampleTeams): Importing ${teamsWithCity.length} sample teams after filtering for city.`);

    if (teamsWithCity.length === 0) return [];
    return await importTeamsInternal(ctx, teamsWithCity);
  },
});

// Public sync function for HTTP API calls
export const syncTeamsFromTBAPublic = mutation({
  args: {},
  // Updated return type to reflect initiation status
  handler: async (ctx: MutationCtx): Promise<{ success: boolean; message: string; skipped?: boolean; reason?: string; error?: string }> => {
    console.log("Public Mutation (syncTeamsFromTBAPublic): Initiating team sync process...");
    // Call the internal initiation function
    const initiationResult = await ctx.runMutation(internal.teams.syncTeamsFromTBA, {});
    console.log("Public Mutation (syncTeamsFromTBAPublic): Initiation call completed.", initiationResult);
    return initiationResult;
  },
});

const MAX_TEAMS_PER_CHUNK = 50; // Reduced to prevent mutation timeouts

// Action to fetch teams from The Blue Alliance API and process in chunks
export const fetchTeamsFromTBAAction = internalAction({
  args: {},
  handler: async (ctx: ActionCtx): Promise<void> => {
    // IMPORTANT: Hardcoded API key for testing. REMOVE BEFORE COMMITTING/DEPLOYING TO PRODUCTION.
    // IT IS A SIGNIFICANT SECURITY RISK.
    const TBA_API_KEY = "S9pKISELpsVQTZR9m1DGG2oDsLn8EtyI5Kh8fhM3yqSsoQvAkJFY2y8DcYQd8fA8"; // process.env.TBA_API_KEY;
    const TBA_BASE_URL = "https://www.thebluealliance.com/api/v3";

    if (!TBA_API_KEY) {
      console.error("Action: TBA_API_KEY is not set.");
      await ctx.scheduler.runAfter(0, internal.teams.finalizeTeamSync, { errorMessage: "TBA_API_KEY not set" });
      throw new Error("TBA_API_KEY environment variable is not set and no hardcoded key found.");
    }

    let currentChunk: TBATeam[] = [];
    let totalTeamsFetched = 0;
    let page = 0;
    let consecutiveEmptyPages = 0;
    const MAX_EMPTY_PAGES = 3;
    const MAX_TOTAL_PAGES_TO_CHECK = 500; // Safeguard

    console.log("Action (fetchTeamsFromTBAAction): Starting fetch from TBA, processing in chunks.");

    while (consecutiveEmptyPages < MAX_EMPTY_PAGES && page < MAX_TOTAL_PAGES_TO_CHECK) {
      try {
        const response = await fetch(`${TBA_BASE_URL}/teams/${page}/simple`, {
          headers: { 'X-TBA-Auth-Key': TBA_API_KEY },
        });
        console.log(`Action: Fetched TBA page ${page}, Status: ${response.status}`);

        if (!response.ok) {
          if (response.status === 404) {
            consecutiveEmptyPages++;
          } else {
            console.error(`Action: TBA API error on page ${page}: ${response.status} ${response.statusText}`);
            consecutiveEmptyPages++; 
          }
          page++;
          continue;
        }

        const pageTeams: TBATeam[] = await response.json();
        if (!pageTeams || pageTeams.length === 0) {
          consecutiveEmptyPages++;
        } else {
          consecutiveEmptyPages = 0;
          currentChunk.push(...pageTeams.map(team => ({
            team_number: team.team_number,
            nickname: team.nickname,
            city: team.city,
            state_prov: team.state_prov,
            country: team.country,
            rookie_year: team.rookie_year,
          })));
          totalTeamsFetched += pageTeams.length;

          if (currentChunk.length >= MAX_TEAMS_PER_CHUNK) {
            console.log(`Action: Chunk ready with ${currentChunk.length} teams. Scheduling for processing.`);
            await ctx.scheduler.runAfter(0, internal.teams.processFetchedTeams, { teamsToImport: currentChunk });
            currentChunk = []; // Reset for next chunk
          }
        }
        page++;
      } catch (error) {
        console.error(`Action: Error fetching or processing TBA page ${page}:`, error);
        consecutiveEmptyPages++;
        page++; 
      }
    }

    // Process any remaining teams in the last chunk
    if (currentChunk.length > 0) {
      console.log(`Action: Processing final chunk with ${currentChunk.length} teams.`);
      await ctx.scheduler.runAfter(0, internal.teams.processFetchedTeams, { teamsToImport: currentChunk });
    }

    console.log(`Action: Finished fetching all pages from TBA. Total teams fetched: ${totalTeamsFetched}.`);
    // Schedule the finalization step after all chunks have been scheduled for processing
    await ctx.scheduler.runAfter(0, internal.teams.finalizeTeamSync, { totalTeamsFetched });
    console.log("Action: Scheduled finalizeTeamSync.");
  }
});

// New Internal Mutation to finalize the sync process
export const finalizeTeamSync = internalMutation({
  args: { totalTeamsFetched: v.optional(v.number()), errorMessage: v.optional(v.string()) },
  handler: async (ctx: MutationCtx, args): Promise<void> => {
    console.log("Mutation (finalizeTeamSync): Finalizing team sync process.");
    if (args.errorMessage) {
        console.error(`Mutation (finalizeTeamSync): Sync finalized with error: ${args.errorMessage}`);
    }
    if (args.totalTeamsFetched !== undefined) {
        console.log(`Mutation (finalizeTeamSync): Total teams fetched by action: ${args.totalTeamsFetched}`);
    }

    const syncState = await ctx.db.query("syncStates")
        .filter(q => q.eq(q.field("type"), "teams"))
        .first();

    if (syncState) {
        await ctx.db.patch(syncState._id, {
            syncInProgress: false,
            lastSyncTime: new Date().toISOString(), // Mark completion time
            updatedAt: new Date().toISOString(),
            // Optionally store errorMessage or totalTeamsFetched if your schema supports it
        });
        console.log("Mutation (finalizeTeamSync): syncState updated, syncInProgress set to false.");
    } else {
        console.error("Mutation (finalizeTeamSync): syncState not found. Cannot mark sync as complete.");
    }
    // This mutation might return void or a simple status
  }
});

// Internal sync function that can be called by cron jobs - INITIATES THE PROCESS
export const syncTeamsFromTBA = internalMutation({
  args: {},
  handler: async (ctx: MutationCtx): Promise<{ success: boolean; message: string; skipped?: boolean; reason?: string; error?: string }> => {
    console.log("Mutation (syncTeamsFromTBA - initiator): Starting team sync process...");
    const useLocalTestData = (await ctx.runQuery(internal.teams.getEnvironmentVariable, { name: "CONVEX_TEST_USE_LOCAL_TBA_DATA" })) === "true";

    let syncState = await ctx.db.query("syncStates")
        .filter(q => q.eq(q.field("type"), "teams"))
        .first();
    const now = Date.now();
    const isoNow = new Date(now).toISOString();
    if (syncState?.syncInProgress) {
      const lastSyncDate = new Date(syncState.lastSyncTime).getTime();
      if (now - lastSyncDate > 60 * 60 * 1000) { 
        console.warn("Mutation (syncTeamsFromTBA - initiator): Sync has been in progress for over an hour. Resetting state.");
        if (syncState) { 
            await ctx.db.patch(syncState._id, { syncInProgress: false, updatedAt: isoNow });
        }
      } else {
        console.log("Mutation (syncTeamsFromTBA - initiator): Sync is already in progress and not stalled. Skipping.");
        return { success: false, skipped: true, reason: "Sync already in progress.", message: "Sync process skipped." };
      }
    }
    if (!syncState) {
      await ctx.db.insert("syncStates", {
        type: "teams", lastSyncTime: isoNow, syncInProgress: true, createdAt: isoNow, updatedAt: isoNow,
      });
      console.log("Mutation (syncTeamsFromTBA - initiator): Created new syncState, marked as in progress.");
    } else {
      await ctx.db.patch(syncState._id, {
        syncInProgress: true, lastSyncTime: isoNow, updatedAt: isoNow,
      });
      console.log("Mutation (syncTeamsFromTBA - initiator): Updated existing syncState, marked as in progress.");
    }
    
    if (useLocalTestData) {
      console.log("Mutation (syncTeamsFromTBA - initiator): Using local data. Scheduling processing & finalization.");
      const sampleTeams: TBATeam[] = [
          { team_number: 1, nickname: "Local Test Team 1", city: "Testville", state_prov: "TS", country: "TST", rookie_year: 2000, website: "http://test.com/1" },
          { team_number: 2, nickname: "Local Test Team 2", city: "Testburg", state_prov: "TS", country: "TST", rookie_year: 2001, website: "http://test.com/2" },
      ];
      try {
        // For local data, process all at once, then finalize.
        await ctx.scheduler.runAfter(0, internal.teams.processFetchedTeams, { teamsToImport: sampleTeams });
        // Schedule finalization to run shortly after processing is expected to complete for local data.
        await ctx.scheduler.runAfter(50, internal.teams.finalizeTeamSync, { totalTeamsFetched: sampleTeams.length }); // Small delay for processing
        return { success: true, message: "Local data sync process initiated (single chunk + finalize)." };
      } catch (error: any) {
        console.error("Mutation (syncTeamsFromTBA - initiator): Failed to schedule for local data.", error);
        const currentSyncState = await ctx.db.query("syncStates").filter(q => q.eq(q.field("type"), "teams")).first();
        if (currentSyncState) {
            await ctx.db.patch(currentSyncState._id, { syncInProgress: false, updatedAt: new Date().toISOString() });
        }
        return { success: false, error: "Failed to schedule local data processing.", message: "Sync initiation failed." };
      }
    } else {
      console.log("Mutation (syncTeamsFromTBA - initiator): Scheduling action to fetch and chunk teams from TBA API...");
      try {
        await ctx.scheduler.runAfter(0, internal.teams.fetchTeamsFromTBAAction, {});
        return { success: true, message: "TBA data fetch and chunking process initiated." };
      } catch (error: any) {
        console.error("Mutation (syncTeamsFromTBA - initiator): Failed to schedule fetchTeamsFromTBAAction.", error);
        const currentSyncState = await ctx.db.query("syncStates").filter(q => q.eq(q.field("type"), "teams")).first();
        if (currentSyncState) {
            await ctx.db.patch(currentSyncState._id, { syncInProgress: false, updatedAt: new Date().toISOString() });
        }
        return { success: false, error: "Failed to schedule TBA data fetching action.", message: "Sync initiation failed." };
      }
    }
  },
});

// Helper to get environment variables (internal query)
export const getEnvironmentVariable = internalQuery({
  args: { name: v.string() },
  handler: async (_ctx: QueryCtx, args: { name: string }): Promise<string | undefined> => {
    // In a real Convex deployment, you'd get this from process.env
    // For local testing, you might need to adjust how you set/get these
    // if process.env isn't directly available or updated dynamically for queries
    // For now, this is a placeholder. In actual Convex, use Dashboard > Settings > Environment Variables
    // This query will allow the mutation to read it.
    // Note: Directly accessing process.env in a query might not work as expected
    // due to the query execution environment.
    // A more robust way for local testing is to set this via `npx convex env set MY_VAR my_value`
    // and then for deployed Convex, set it in the dashboard.
    // This example assumes `process.env` is accessible, which might need specific setup for local dev.
    // A common pattern is to have a way to *push* env vars to Convex.
    // For the purpose of this modification, we'll assume `CONVEX_TEST_USE_LOCAL_TBA_DATA`
    // can be read. If not, the alternative is to pass it as an argument or use a config table.

    // Correct way to access Convex environment variables:
    return process.env[args.name];
  }
});

// Mutation to remove teams without cities (cleanup function)
export const removeTeamsWithoutCities = mutation({
  args: {},
  handler: async (ctx) => {
    const allTeams = await ctx.db.query("teams").collect();
    const teamsWithoutCities = allTeams.filter(team => 
      !team.city || team.city.trim() === ""
    );
    
    console.log(`Found ${teamsWithoutCities.length} teams without cities to remove`);
    
    let removedCount = 0;
    for (const team of teamsWithoutCities) {
      await ctx.db.delete(team._id);
      removedCount++;
    }
    
    console.log(`Removed ${removedCount} teams without cities`);
    return {
      removedCount,
      totalTeamsRemaining: allTeams.length - removedCount
    };
  },
});