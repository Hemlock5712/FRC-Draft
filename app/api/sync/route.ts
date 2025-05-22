import { NextRequest, NextResponse } from 'next/server';
import { syncTeams, syncEvents, syncMatches, SyncResult } from '@/lib/services/syncService';

export async function POST(request: NextRequest) {
  try {
    const { type = 'teams' /*, force = false */ } = await request.json(); // force parameter removed for now

    let result: SyncResult;
    switch (type) {
      case 'teams':
        result = await syncTeams();
        break;
      case 'events':
        result = await syncEvents();
        break;
      case 'matches':
        result = await syncMatches();
        break;
      default:
        return NextResponse.json(
          { error: `Unknown sync type: ${type}` },
          { status: 400 }
        );
    }

    if (result.errors.length > 0) {
      // You might want to return a more specific error or the full result
      return NextResponse.json(
        { message: "Sync completed with errors", errors: result.errors, created: result.teamsCreated, updated: result.teamsUpdated },
        { status: 207 } // Multi-Status, indicating partial success
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in sync endpoint:', error);
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 