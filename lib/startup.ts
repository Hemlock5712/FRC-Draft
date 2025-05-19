import { CronService } from './services/cronService';

export function initializeServices() {
  if (process.env.NODE_ENV !== 'production') {
    // Start cron jobs in development
    const cronService = CronService.getInstance();
    cronService.startJobs();

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Shutting down cron jobs...');
      cronService.stopJobs();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('Shutting down cron jobs...');
      cronService.stopJobs();
      process.exit(0);
    });
  }
} 