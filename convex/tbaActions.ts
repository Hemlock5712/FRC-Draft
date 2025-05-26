import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// TBA API Configuration
const TBA_BASE_URL = "https://www.thebluealliance.com/api/v3";
const TBA_AUTH_KEY = "S9pKISELpsVQTZR9m1DGG2oDsLn8EtyI5Kh8fhM3yqSsoQvAkJFY2y8DcYQd8fA8";

// TBA API Interfaces
interface TBAEvent {
  key: string;
  name: string;
  event_code: string;
  event_type: number;
  district?: {
    abbreviation: string;
    display_name: string;
    key: string;
    year: number;
  };
  city: string;
  state_prov: string;
  country: string;
  start_date: string;
  end_date: string;
  year: number;
  week?: number;
}

interface TBATeam {
  key: string;
  team_number: number;
  nickname: string;
  name: string;
  city: string;
  state_prov: string;
  country: string;
}

interface TBAMatch {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: {
      score: number;
      team_keys: string[];
      dq_team_keys?: string[];
      surrogate_team_keys?: string[];
    };
    blue: {
      score: number;
      team_keys: string[];
      dq_team_keys?: string[];
      surrogate_team_keys?: string[];
    };
  };
  score_breakdown?: any;
  time?: number;
  actual_time?: number;
  predicted_time?: number;
  post_result_time?: number;
}

// Action to fetch events for a specific year and week from TBA
export const fetchTBAEventsAction = action({
  args: {
    year: v.number(),
    week: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!TBA_AUTH_KEY) {
      throw new Error("TBA_AUTH_KEY environment variable not set. Please add your TBA API key to your environment variables.");
    }

    try {
      const url = `${TBA_BASE_URL}/events/${args.year}`;
      const response = await fetch(url, {
        headers: {
          'X-TBA-Auth-Key': TBA_AUTH_KEY,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`TBA API error: ${response.status} ${response.statusText}`);
      }

      const events: TBAEvent[] = await response.json();
      
      // Filter by week if specified
      if (args.week !== undefined) {
        return events.filter(event => event.week === args.week);
      }
      
      return events;
    } catch (error) {
      console.error('Error fetching TBA events:', error);
      throw error;
    }
  },
});

// Action to fetch teams for a specific event from TBA
export const fetchTBAEventTeamsAction = action({
  args: {
    eventKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!TBA_AUTH_KEY) {
      throw new Error("TBA_AUTH_KEY environment variable not set");
    }

    try {
      const url = `${TBA_BASE_URL}/event/${args.eventKey}/teams`;
      const response = await fetch(url, {
        headers: {
          'X-TBA-Auth-Key': TBA_AUTH_KEY,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`TBA API error: ${response.status} ${response.statusText}`);
      }

      const teams: TBATeam[] = await response.json();
      return teams;
    } catch (error) {
      console.error(`Error fetching teams for event ${args.eventKey}:`, error);
      throw error;
    }
  },
});

// Action to fetch matches for a specific event from TBA
export const fetchTBAEventMatchesAction = action({
  args: {
    eventKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!TBA_AUTH_KEY) {
      throw new Error("TBA_AUTH_KEY environment variable not set");
    }

    try {
      const url = `${TBA_BASE_URL}/event/${args.eventKey}/matches`;
      const response = await fetch(url, {
        headers: {
          'X-TBA-Auth-Key': TBA_AUTH_KEY,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`TBA API error: ${response.status} ${response.statusText}`);
      }

      const matches: TBAMatch[] = await response.json();
      return matches.filter(match => match.alliances.red.score !== -1 && match.alliances.blue.score !== -1);
    } catch (error) {
      console.error(`Error fetching matches for event ${args.eventKey}:`, error);
      throw error;
    }
  },
});

// Action to test TBA API connectivity
export const testTBAConnectionAction = action({
  args: {},
  handler: async (ctx, args) => {
    try {
      if (!TBA_AUTH_KEY) {
        return {
          success: false,
          message: "TBA_AUTH_KEY environment variable not set. Please add your TBA API key to .env.local file.",
          hasApiKey: false,
        };
      }

      // Test with a simple API call to get 2024 events (should be fast)
      const url = `${TBA_BASE_URL}/events/2024/simple`;
      const response = await fetch(url, {
        headers: {
          'X-TBA-Auth-Key': TBA_AUTH_KEY,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `TBA API error: ${response.status} ${response.statusText}. Check your API key.`,
          hasApiKey: true,
          statusCode: response.status,
        };
      }

      const events = await response.json();
      
      return {
        success: true,
        message: `✅ TBA API connection successful! Found ${events.length} events for 2024.`,
        hasApiKey: true,
        statusCode: response.status,
        eventCount: events.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        hasApiKey: !!TBA_AUTH_KEY,
      };
    }
  },
});

// Action to fetch real TBA data for a specific week and process it
export const fetchRealTBADataAction = action({
  args: {
    year: v.number(),
    week: v.number(),
    maxEvents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxEvents = args.maxEvents; // No default limit - process all events if not specified
    
    try {
      // Fetch events for the specified week using direct fetch (not internal action)
      if (!TBA_AUTH_KEY) {
        throw new Error("TBA_AUTH_KEY environment variable not set. Please add your TBA API key to your environment variables.");
      }

      const url = `${TBA_BASE_URL}/events/${args.year}`;
      const response = await fetch(url, {
        headers: {
          'X-TBA-Auth-Key': TBA_AUTH_KEY,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`TBA API error: ${response.status} ${response.statusText}`);
      }

      const allEvents: TBAEvent[] = await response.json();
      const events = allEvents.filter(event => event.week === args.week);
      
      if (events.length === 0) {
        return {
          success: false,
          message: `No events found for ${args.year} Week ${args.week}`,
          eventsProcessed: 0,
          teamsProcessed: 0,
          performancesCreated: 0,
        };
      }

      // Limit events to process (only if maxEvents is specified)
      const eventsToProcess = maxEvents ? events.slice(0, maxEvents) : events;
      let teamsProcessed = 0;
      let performancesCreated = 0;

      for (const event of eventsToProcess) {
        try {
          // Fetch teams for this event
          const teamsUrl = `${TBA_BASE_URL}/event/${event.key}/teams`;
          const teamsResponse = await fetch(teamsUrl, {
            headers: {
              'X-TBA-Auth-Key': TBA_AUTH_KEY,
              'Accept': 'application/json',
            },
          });

          if (!teamsResponse.ok) {
            console.error(`Error fetching teams for ${event.key}: ${teamsResponse.status}`);
            continue;
          }

          const teams: TBATeam[] = await teamsResponse.json();
          
          // Fetch matches for this event
          const matchesUrl = `${TBA_BASE_URL}/event/${event.key}/matches`;
          const matchesResponse = await fetch(matchesUrl, {
            headers: {
              'X-TBA-Auth-Key': TBA_AUTH_KEY,
              'Accept': 'application/json',
            },
          });

          if (!matchesResponse.ok) {
            console.error(`Error fetching matches for ${event.key}: ${matchesResponse.status}`);
            continue;
          }

          const allMatches: TBAMatch[] = await matchesResponse.json();
          const matches = allMatches.filter(match => match.alliances.red.score !== -1 && match.alliances.blue.score !== -1);
          
          if (matches.length === 0) {
            console.log(`No completed matches found for event ${event.key}`);
            continue;
          }

          // Filter teams to only include the fields we need
          const filteredTeams = teams.map(team => ({
            key: team.key,
            team_number: team.team_number,
            nickname: team.nickname,
            name: team.name,
            city: team.city,
            state_prov: team.state_prov,
            country: team.country,
          }));

                // Process teams and create performance records via mutation
      const processResult: { teamsProcessed: number; performancesCreated: number } = await ctx.runMutation(internal.playerManagement.processEventDataFromTBA, {
            eventKey: event.key,
            year: args.year,
            week: args.week,
            teams: filteredTeams,
            matches: matches,
          });

          teamsProcessed += processResult.teamsProcessed;
          performancesCreated += processResult.performancesCreated;
        } catch (eventError) {
          console.error(`Error processing event ${event.key}:`, eventError);
          // Continue with next event
        }
      }

      // Calculate weekly scores after processing all events
      let weeklyScoresCalculated = 0;
      if (performancesCreated > 0) {
        try {
          const weeklyScoreResults = await ctx.runMutation(internal.playerManagement.calculateWeeklyScores, {
            year: args.year,
            week: args.week,
          });
          weeklyScoresCalculated = weeklyScoreResults.length;
        } catch (weeklyScoreError) {
          console.error('Error calculating weekly scores:', weeklyScoreError);
        }
      }

      return {
        success: true,
        message: `✅ Processed real TBA data for ${args.year} Week ${args.week}`,
        eventsProcessed: eventsToProcess.length,
        eventsFound: events.length,
        teamsProcessed,
        performancesCreated,
        weeklyScoresCalculated,
        eventDetails: eventsToProcess.map((e: TBAEvent) => ({
          key: e.key,
          name: e.name,
          location: `${e.city}, ${e.state_prov}`,
        })),
      };
    } catch (error) {
      console.error('Error fetching TBA data:', error);
      return {
        success: false,
        message: `❌ Error fetching TBA data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        eventsProcessed: 0,
        teamsProcessed: 0,
        performancesCreated: 0,
        weeklyScoresCalculated: 0,
      };
    }
  },
});

// Debug action to test team performance calculation
export const debugTeamPerformanceAction = action({
  args: {
    eventKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!TBA_AUTH_KEY) {
      throw new Error("TBA_AUTH_KEY environment variable not set");
    }

    try {
      // Fetch teams for this event
      const teamsUrl = `${TBA_BASE_URL}/event/${args.eventKey}/teams`;
      const teamsResponse = await fetch(teamsUrl, {
        headers: {
          'X-TBA-Auth-Key': TBA_AUTH_KEY,
          'Accept': 'application/json',
        },
      });

      if (!teamsResponse.ok) {
        throw new Error(`Error fetching teams: ${teamsResponse.status}`);
      }

      const teams: TBATeam[] = await teamsResponse.json();
      
      // Fetch matches for this event
      const matchesUrl = `${TBA_BASE_URL}/event/${args.eventKey}/matches`;
      const matchesResponse = await fetch(matchesUrl, {
        headers: {
          'X-TBA-Auth-Key': TBA_AUTH_KEY,
          'Accept': 'application/json',
        },
      });

      if (!matchesResponse.ok) {
        throw new Error(`Error fetching matches: ${matchesResponse.status}`);
      }

      const allMatches: TBAMatch[] = await matchesResponse.json();
      const matches = allMatches.filter(match => match.alliances.red.score !== -1 && match.alliances.blue.score !== -1);
      
      // Test with first team
      const firstTeam = teams[0];
      if (!firstTeam) {
        return { error: "No teams found" };
      }

      // Count matches for this team
      const teamMatches = matches.filter(match => 
        match.alliances?.red?.team_keys?.includes(firstTeam.key) || 
        match.alliances?.blue?.team_keys?.includes(firstTeam.key)
      );

      // Count qualification matches
      const qualMatches = teamMatches.filter(match => match.comp_level === 'qm');
      const playoffMatches = teamMatches.filter(match => match.comp_level !== 'qm');

      // Get sample team keys from first few matches
      const sampleTeamKeys = matches.slice(0, 3).flatMap(match => [
        ...(match.alliances?.red?.team_keys || []),
        ...(match.alliances?.blue?.team_keys || [])
      ]);

      return {
        eventKey: args.eventKey,
        totalTeams: teams.length,
        totalMatches: allMatches.length,
        completedMatches: matches.length,
        testTeam: {
          key: firstTeam.key,
          number: firstTeam.team_number,
          name: firstTeam.nickname,
        },
        teamMatches: teamMatches.length,
        qualMatches: qualMatches.length,
        playoffMatches: playoffMatches.length,
        sampleTeamKeysFromMatches: sampleTeamKeys.slice(0, 10),
        sampleMatches: matches.slice(0, 2).map(match => ({
          key: match.key,
          comp_level: match.comp_level,
          red_teams: match.alliances?.red?.team_keys,
          blue_teams: match.alliances?.blue?.team_keys,
          red_score: match.alliances?.red?.score,
          blue_score: match.alliances?.blue?.score,
        })),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// Debug action to test TBA data processing with a specific event
export const debugTBAEventProcessingAction = action({
  args: {
    eventKey: v.string(),
    year: v.number(),
    week: v.number(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    eventKey: string;
    totalTeams?: number;
    totalMatches?: number;
    completedMatches?: number;
    teamsProcessed?: number;
    performancesCreated?: number;
    sampleTeams?: Array<{ key: string; number: number; name: string }>;
    error?: string;
  }> => {
    if (!TBA_AUTH_KEY) {
      throw new Error("TBA_AUTH_KEY environment variable not set");
    }

    try {
      console.log(`Debug: Testing TBA processing for event ${args.eventKey}`);
      
      // Fetch teams for this event
      const teamsUrl = `${TBA_BASE_URL}/event/${args.eventKey}/teams`;
      const teamsResponse = await fetch(teamsUrl, {
        headers: {
          'X-TBA-Auth-Key': TBA_AUTH_KEY,
          'Accept': 'application/json',
        },
      });

      if (!teamsResponse.ok) {
        throw new Error(`Error fetching teams: ${teamsResponse.status} ${teamsResponse.statusText}`);
      }

      const teams: TBATeam[] = await teamsResponse.json();
      console.log(`Debug: Found ${teams.length} teams for event ${args.eventKey}`);
      
      // Fetch matches for this event
      const matchesUrl = `${TBA_BASE_URL}/event/${args.eventKey}/matches`;
      const matchesResponse = await fetch(matchesUrl, {
        headers: {
          'X-TBA-Auth-Key': TBA_AUTH_KEY,
          'Accept': 'application/json',
        },
      });

      if (!matchesResponse.ok) {
        throw new Error(`Error fetching matches: ${matchesResponse.status} ${matchesResponse.statusText}`);
      }

      const allMatches: TBAMatch[] = await matchesResponse.json();
      const completedMatches = allMatches.filter(match => match.alliances.red.score !== -1 && match.alliances.blue.score !== -1);
      console.log(`Debug: Found ${allMatches.length} total matches, ${completedMatches.length} completed`);
      
      if (completedMatches.length === 0) {
        return {
          success: false,
          message: `No completed matches found for event ${args.eventKey}`,
          eventKey: args.eventKey,
          totalTeams: teams.length,
          totalMatches: allMatches.length,
          completedMatches: 0,
        };
      }

      // Filter teams to only include the fields we need
      const filteredTeams = teams.map(team => ({ // Process all teams
        key: team.key,
        team_number: team.team_number,
        nickname: team.nickname,
        name: team.name,
        city: team.city,
        state_prov: team.state_prov,
        country: team.country,
      }));

      console.log(`Debug: Processing ${filteredTeams.length} teams for testing`);

      // Process teams and create performance records via mutation
      const processResult = await ctx.runMutation(internal.playerManagement.processEventDataFromTBA, {
        eventKey: args.eventKey,
        year: args.year,
        week: args.week,
        teams: filteredTeams,
        matches: completedMatches,
      });

      console.log(`Debug: Processing complete. Teams processed: ${processResult.teamsProcessed}, Performances created: ${processResult.performancesCreated}`);

      return {
        success: true,
        message: `✅ Debug processing complete for event ${args.eventKey}`,
        eventKey: args.eventKey,
        totalTeams: teams.length,
        totalMatches: allMatches.length,
        completedMatches: completedMatches.length,
        teamsProcessed: processResult.teamsProcessed,
        performancesCreated: processResult.performancesCreated,
        sampleTeams: filteredTeams.map(t => ({ key: t.key, number: t.team_number, name: t.nickname })),
      };
    } catch (error) {
      console.error(`Debug: Error processing event ${args.eventKey}:`, error);
      return {
        success: false,
        message: `❌ Debug error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        eventKey: args.eventKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
}); 