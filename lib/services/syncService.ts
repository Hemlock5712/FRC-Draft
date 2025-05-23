import * as tba from '@/lib/tba';
import { TBATeamSimple } from '@/lib/types/tba';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export interface SyncResult {
  teamsCreated: number;
  teamsUpdated: number;
  errors: string[];
}

export async function syncTeams(): Promise<SyncResult> {
  const result: SyncResult = {
    teamsCreated: 0,
    teamsUpdated: 0,
    errors: [],
  };

  try {
    // Check if a recent sync has occurred
    const syncState = await convex.query(api.syncStates.getSyncState, {
      type: 'teams'
    });

    // Prevent syncing if last sync was within the last hour (unless this is a cron job)
    const MIN_SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
    if (syncState?.lastSyncTime) {
      const lastSyncTime = new Date(syncState.lastSyncTime).getTime();
      const now = Date.now();
      
      if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
        const minutesUntilNext = Math.ceil((MIN_SYNC_INTERVAL - (now - lastSyncTime)) / (60 * 1000));
        result.errors.push(`Teams were synced recently. Please wait ${minutesUntilNext} minutes before syncing again.`);
        return result;
      }
    }

    // Check if sync is already in progress
    if (syncState?.syncInProgress) {
      result.errors.push('Team sync is already in progress. Please wait for it to complete.');
      return result;
    }

    // Update sync state to indicate sync is in progress
    await convex.mutation(api.syncStates.upsertSyncState, {
      type: 'teams',
      syncInProgress: true,
    });

    // Get teams from TBA (paginated)
    const teams: TBATeamSimple[] = [];
    let page = 1;
    let consecutiveEmptyPages = 0;
    const MAX_EMPTY_PAGES = 3;

    while (consecutiveEmptyPages < MAX_EMPTY_PAGES) {
      try {
        const pageTeams = await tba.getTeamsPage(page);
        if (!pageTeams || pageTeams.length === 0) {
          consecutiveEmptyPages++;
        } else {
          consecutiveEmptyPages = 0;
          teams.push(...pageTeams);
        }
        page++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          consecutiveEmptyPages++;
        } else {
          console.error(`Error fetching page ${page}:`, error);
          page++;
        }
      }
    }

    if (teams.length === 0) {
      throw new Error('No teams found from TBA API');
    }
    
    // Process teams in batches to avoid overwhelming the API
    const batchSize = 50;
    for (let i = 0; i < teams.length; i += batchSize) {
      const batch = teams.slice(i, i + batchSize);
      const teamsToImport = batch.map((team: TBATeamSimple) => ({
        teamId: `frc${team.team_number}`,
        teamNumber: team.team_number,
        name: team.nickname || `Team ${team.team_number}`,
        city: team.city || undefined,
        stateProv: team.state_prov || undefined,
        country: team.country || undefined,
      }));

      try {
        const results = await convex.mutation(api.teams.importTeams, {
          teams: teamsToImport,
        });

        // Count created and updated teams
        results.forEach((r: { action: string }) => {
          if (r.action === 'created') result.teamsCreated++;
          if (r.action === 'updated') result.teamsUpdated++;
        });
      } catch (error) {
        result.errors.push(`Failed to process batch ${i / batchSize + 1}: ${error}`);
      }
    }

    // Update sync state to indicate sync is complete
    await convex.mutation(api.syncStates.upsertSyncState, {
      type: 'teams',
      syncInProgress: false,
    });

  } catch (error) {
    result.errors.push(`Failed to sync teams: ${error}`);
    
    // Update sync state to indicate sync failed
    await convex.mutation(api.syncStates.upsertSyncState, {
      type: 'teams',
      syncInProgress: false,
    });
  }

  return result;
}

// Add more sync methods for events, matches, etc.
export async function syncEvents(): Promise<SyncResult> {
  // TODO: Implement event syncing
  return { teamsCreated: 0, teamsUpdated: 0, errors: [] };
}

export async function syncMatches(): Promise<SyncResult> {
  // TODO: Implement match syncing
  return { teamsCreated: 0, teamsUpdated: 0, errors: [] };
} 