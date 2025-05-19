import { NextResponse } from 'next/server';
import { SyncService } from '@/lib/services/syncService';

// Vercel cron jobs will call this endpoint
export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const syncService = SyncService.getInstance();
    
    // Run all sync operations
    const results = await Promise.all([
      syncService.syncTeams(),
      // Add more sync operations as needed
      // syncService.syncEvents(),
      // syncService.syncMatches(),
    ]);

    // Check for any failures
    const failures = results.filter(result => !result.success);
    if (failures.length > 0) {
      return NextResponse.json({
        status: 'partial_success',
        failures: failures.map(f => f.error),
      });
    }

    return NextResponse.json({
      status: 'success',
      results: results.map(r => ({
        teamsCount: r.teamsCount,
      })),
    });
  } catch (error) {
    console.error('Error in cron sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 