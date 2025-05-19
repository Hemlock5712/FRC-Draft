import * as tba from '@/lib/tba';
import prisma from '@/lib/prisma';
import { TBATeamSimple } from '@/lib/types/tba';

export interface SyncResult {
  success: boolean;
  teamsCount?: number;
  error?: string;
}

export class SyncService {
  private static instance: SyncService;

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private async shouldSync(type: string, minInterval: number): Promise<boolean> {
    // Get or create sync state
    let syncState = await prisma.syncState.findUnique({
      where: { type },
    });

    if (!syncState) {
      syncState = await prisma.syncState.create({
        data: {
          type,
          lastSyncTime: new Date(0), // Set to epoch to ensure first sync
          syncInProgress: false,
        },
      });
    }

    if (syncState.syncInProgress) return false;
    
    const timeSinceLastSync = Date.now() - syncState.lastSyncTime.getTime();
    return timeSinceLastSync > minInterval;
  }

  private async setSyncProgress(type: string, inProgress: boolean): Promise<void> {
    await prisma.syncState.upsert({
      where: { type },
      create: {
        type,
        lastSyncTime: new Date(),
        syncInProgress: inProgress,
      },
      update: {
        syncInProgress: inProgress,
        ...(inProgress ? {} : { lastSyncTime: new Date() }),
      },
    });
  }

  async syncTeams(force: boolean = false): Promise<SyncResult> {
    const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    
    try {
      if (!force && !await this.shouldSync('teams', SYNC_INTERVAL)) {
        return { success: true, teamsCount: 0 };
      }

      await this.setSyncProgress('teams', true);

      // Get all teams from TBA (paginated)
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

      // Batch update teams in chunks to avoid memory issues
      const BATCH_SIZE = 100;
      for (let i = 0; i < teams.length; i += BATCH_SIZE) {
        const batch = teams.slice(i, i + BATCH_SIZE);
        await prisma.$transaction(
          batch.map(team => {
            const teamNumber = team.team_number;
            const teamKey = `frc${teamNumber}`;
            
            return prisma.team.upsert({
              where: { teamNumber },
              create: {
                id: teamKey,
                teamNumber,
                name: team.nickname || `Team ${teamNumber}`,
                city: team.city || null,
                stateProv: team.state_prov || null,
                country: team.country || null,
                rookieYear: null,
                website: null,
              },
              update: {
                name: team.nickname || `Team ${teamNumber}`,
                city: team.city || null,
                stateProv: team.state_prov || null,
                country: team.country || null,
              },
            });
          })
        );
      }

      return { success: true, teamsCount: teams.length };
    } catch (error) {
      console.error('Error syncing teams:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      await this.setSyncProgress('teams', false);
    }
  }

  // Add more sync methods for events, matches, etc.
  async syncEvents(): Promise<SyncResult> {
    // TODO: Implement event syncing
    return { success: true, teamsCount: 0 };
  }

  async syncMatches(): Promise<SyncResult> {
    // TODO: Implement match syncing
    return { success: true, teamsCount: 0 };
  }
} 