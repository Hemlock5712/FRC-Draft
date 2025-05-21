// This file contains utility functions for API route handlers.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Adjusted path
import { handleApiError } from './apiUtils';

// Type for the handler function that will be wrapped
type AuthenticatedApiHandler = (
  sessionUser: Session['user'], // Using Session['user'] based on next-auth types and lib/auth.ts
  request: NextRequest,
  params?: { [key: string]: any }
) => Promise<NextResponse> | NextResponse;

export function handleApiError(error: unknown, status: number = 500) {
  console.error('API Error:', error);

  let errorMessage = 'An unexpected error occurred.';

  if (error instanceof Error) {
    errorMessage = status === 500 ? 'Internal server error' : error.message;
  } else if (typeof error === 'string') {
    errorMessage = status === 500 ? 'Internal server error' : error;
  }
  
  if (status === 500) {
    errorMessage = 'Internal server error';
  }

  return NextResponse.json({ error: errorMessage }, { status });
}

export function withAuthenticatedSession(handler: AuthenticatedApiHandler) {
  return async (request: NextRequest, context?: { params: { [key: string]: any } }) => {
    try {
      const session = await getServerSession(authOptions);

      // Check for session.user.id based on lib/auth.ts session callback
      if (!session?.user?.id) { 
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Pass session.user, request, and context.params (if they exist) to the handler
      return await handler(session.user, request, context?.params);
    } catch (error) {
      // Pass the error to handleApiError, which will determine the status and message
      return handleApiError(error);
    }
  };
}
