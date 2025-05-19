import cron, { ScheduledTask } from 'node-cron';
import { SyncService } from './syncService';

export class CronService {
  private static instance: CronService;
  private jobs: ScheduledTask[] = [];

  private constructor() {}

  static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }

  startJobs() {
    // Only run cron jobs in production
    // if (process.env.NODE_ENV !== 'production') {
    //   console.log('Skipping cron jobs in development');
    //   return;
    // }

    const syncService = SyncService.getInstance();

    // Sync teams every 6 hours
    this.jobs.push(
      cron.schedule('0 */6 * * *', async () => {
        console.log('Running scheduled team sync...');
        try {
          const result = await syncService.syncTeams(true); // Force sync
          if (result.success) {
            console.log(`Successfully synced ${result.teamsCount} teams`);
          } else {
            console.error('Team sync failed:', result.error);
          }
        } catch (error) {
          console.error('Error in scheduled team sync:', error);
        }
      })
    );

    console.log('Started cron jobs in production mode');
  }

  stopJobs() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('Stopped all cron jobs');
  }
} 