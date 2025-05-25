import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Simple in-memory rate limiting cache
let lastSyncTime = 0;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check - allow max 1 sync per hour
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    if (now - lastSyncTime < hourInMs) {
      const remainingTime = Math.ceil((hourInMs - (now - lastSyncTime)) / (60 * 1000));
      return NextResponse.json({ 
        error: `Please wait ${remainingTime} minutes before syncing again.`,
        remainingMinutes: remainingTime
      }, { status: 429 });
    }

    // Note: We can't directly call internal mutations from API routes
    // Instead, we'll return a message about the weekly sync schedule
    lastSyncTime = now;

    return NextResponse.json({ 
      message: "Teams are automatically synced weekly on Sundays at 2 AM UTC. Manual sync is no longer available to prevent API limits.",
      nextScheduledSync: "Weekly on Sundays at 2:00 AM UTC",
      success: true
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      error: 'An error occurred during sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 