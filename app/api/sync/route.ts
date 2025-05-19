import { NextRequest, NextResponse } from 'next/server';
import { SyncService } from '@/lib/services/syncService';

export async function POST(request: NextRequest) {
  try {
    const { type = 'teams', force = false } = await request.json();
    const syncService = SyncService.getInstance();

    let result;
    switch (type) {
      case 'teams':
        result = await syncService.syncTeams(force);
        break;
      case 'events':
        result = await syncService.syncEvents();
        break;
      case 'matches':
        result = await syncService.syncMatches();
        break;
      default:
        return NextResponse.json(
          { error: `Unknown sync type: ${type}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in sync endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 