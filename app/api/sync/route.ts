import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

// Simple in-memory rate limiting (in production, use Redis or similar)
// const rateLimits = new Map<string, number>();
// const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute -- Removed for testing

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting -- No longer used for rate limiting
    // const clientIP = request.headers.get('x-forwarded-for') || 
    //                  request.headers.get('x-real-ip') || 
    //                  'unknown';

    // Check rate limit -- Removed
    // const now = Date.now();
    // const lastRequest = rateLimits.get(clientIP) || 0;
    // 
    // if (now - lastRequest < RATE_LIMIT_WINDOW) {
    //   return NextResponse.json(
    //     { 
    //       error: 'Rate limit exceeded. Please wait before syncing again.',
    //       retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest)) / 1000)
    //     },
    //     { 
    //       status: 429,
    //       headers: {
    //         'Retry-After': Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest)) / 1000).toString()
    //       }
    //     }
    //   );
    // }

    // Update rate limit -- Removed
    // rateLimits.set(clientIP, now);

    const { type = 'teams' } = await request.json();

    let result;
    switch (type) {
      case 'teams':
        try {
          result = await convex.mutation(api.teams.syncTeamsFromTBAPublic, {});
        } catch (error) {
          // If TBA sync fails (likely due to missing API key), add sample teams instead
          if (error instanceof Error && error.message.includes('TBA_API_KEY')) {
            console.log('TBA API key not found, adding sample teams instead...');
            const sampleResult = await convex.mutation(api.teams.addSampleTeams, {});
            result = {
              success: true,
              teamsCreated: sampleResult.length,
              teamsUpdated: 0,
              totalTeams: sampleResult.length,
              message: "Added sample teams (TBA API key not configured)"
            };
          } else {
            throw error;
          }
        }
        break;
      default:
        return NextResponse.json(
          { error: `Unknown sync type: ${type}. Only 'teams' is supported.` },
          { status: 400 }
        );
    }

    // Check if the result indicates the sync was skipped
    if (result.skipped) {
      return NextResponse.json(
        { 
          message: "Sync skipped", 
          reason: result.reason,
          // Ensure these fields are present even if not directly in result for skipped
          teamsCreated: 0, 
          teamsUpdated: 0,
          totalTeams: 0
        },
        { status: 200 } // 200 OK because skipping is not an server error
      );
    }

    // Check if the sync process itself failed to initiate or had an issue
    if (!result.success) {
      return NextResponse.json(
        { 
          message: "Sync failed", 
          error: result.error || "Unknown error during sync initiation",
          teamsCreated: 0,
          teamsUpdated: 0,
          totalTeams: 0
        },
        { status: 500 } // 500 Internal Server Error for actual failures
      );
    }
    
    // If we reach here, the sync initiation was successful (not skipped, not failed to initiate)
    // The actual sync happens in the background. The message reflects initiation.
    // The result from syncTeamsFromTBAPublic (initiation status) might not have team counts.
    // The addSampleTeams fallback *does* include them.
    const responseData: { 
      message: string; 
      teamsCreated?: number; 
      teamsUpdated?: number; 
      totalTeams?: number; 
      skipped?: boolean; 
      reason?: string; 
      error?: string; 
      success: boolean; // Add success to the response data type
    } = {
      success: result.success, // success should always be present
      message: result.message || "Sync process initiated successfully",
    };

    // Only include count fields if they exist on the result (e.g., from addSampleTeams fallback)
    if ('teamsCreated' in result && typeof result.teamsCreated === 'number') {
      responseData.teamsCreated = result.teamsCreated;
    }
    if ('teamsUpdated' in result && typeof result.teamsUpdated === 'number') {
      responseData.teamsUpdated = result.teamsUpdated;
    }
    if ('totalTeams' in result && typeof result.totalTeams === 'number') {
      responseData.totalTeams = result.totalTeams;
    }
    // Also pass through skipped, reason, error if they exist on a successful initiation message (though less common here)
    if (result.skipped !== undefined) responseData.skipped = result.skipped;
    if (result.reason) responseData.reason = result.reason;
    if (result.error) responseData.error = result.error; // Should ideally be covered by earlier !result.success block

    return NextResponse.json(responseData);
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