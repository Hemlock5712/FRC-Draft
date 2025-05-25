import { NextResponse } from 'next/server';

// This endpoint is deprecated - we now use Convex's built-in cron jobs
export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron (for backward compatibility)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: 'deprecated',
      message: 'This cron endpoint has been migrated to Convex built-in cron jobs.',
      newSchedule: 'Weekly on Sundays at 2:00 AM UTC',
      convexCron: true
    });
  } catch (error) {
    console.error('Error in deprecated cron sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 