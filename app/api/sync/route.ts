import { NextRequest, NextResponse } from 'next/server';
import { syncTeams, syncEvents, syncMatches, SyncResult } from '@/lib/services/syncService';

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimits = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Check rate limit
    const now = Date.now();
    const lastRequest = rateLimits.get(clientIP) || 0;
    
    if (now - lastRequest < RATE_LIMIT_WINDOW) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait before syncing again.',
          retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest)) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest)) / 1000).toString()
          }
        }
      );
    }

    // Update rate limit
    rateLimits.set(clientIP, now);

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