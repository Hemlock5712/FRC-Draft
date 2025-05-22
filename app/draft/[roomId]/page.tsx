'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { use } from 'react';
// import type { Team, DraftRoom, DraftParticipant, DraftPick, User } from '@prisma/client'; // Prisma import removed

// Define types based on Convex schema
interface ConvexDoc {
  _id: string;
  _creationTime: number; // Convex default field
}

interface ConvexUser extends ConvexDoc {
  name?: string | null;
  email?: string | null;
  // Add other user fields from schema if needed by the UI
}

interface ConvexTeam extends ConvexDoc {
  teamId: string; // This is the custom `frcXXX` ID
  name: string;
  teamNumber: number;
  // Add other team fields from schema if needed by the UI
}

interface ConvexDraftRoom extends ConvexDoc {
  name: string;
  description?: string | null;
  status: string;
  maxTeams: number;
  pickTimeSeconds: number;
  snakeFormat: boolean;
  createdBy: string; // User _id
  startTime?: string | null; // ISO Date string
  endTime?: string | null; // ISO Date string
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  privacy: string; // "PUBLIC" or "PRIVATE"
}

interface ConvexDraftParticipant extends ConvexDoc {
  userId: string; // User _id
  draftRoomId: string; // DraftRoom _id
  isReady: boolean;
  user: {
    name?: string | null;
    email?: string | null;
    // Potentially other user fields if the API joins them
  };
  // Add other participant fields like pickOrder if needed
}

interface ConvexDraftPick extends ConvexDoc {
  teamId: string; // This refers to ConvexTeam._id (or teams.teamId if it's the custom one, needs clarification from API response)
  pickNumber: number;
  participantId: string; // ConvexDraftParticipant _id
  pickedAt: string; // ISO Date string
  team: {
    // Assuming the API will populate this based on teamId
    _id: string; // ConvexTeam _id
    name: string;
    teamNumber: number;
  };
  participant: {
    // Assuming the API will populate this based on participantId
    _id: string; // ConvexDraftParticipant _id
    user: {
      name?: string | null;
      email?: string | null;
    };
  };
  // Add other pick fields like roundNumber if needed
}

interface DraftRoomState {
  room: ConvexDraftRoom & { _id: string }; // Ensure _id is present, ConvexDoc provides it
  participants: (ConvexDraftParticipant & { _id: string; user: { name?: string | null; email?: string | null } })[];
  picks: (ConvexDraftPick & { 
    _id: string; 
    team: { _id: string; name: string; teamNumber: number }; 
    participant: { _id: string; user: { name?: string | null; email?: string | null } }; 
  })[];
  availableTeams: (ConvexTeam & { _id: string })[];
  currentDrafter: (ConvexDraftParticipant & { _id: string; user: { name?: string | null; email?: string | null } }) | null;
  isMyTurn: boolean;
  currentPickNumber: number;
  currentRound: number;
  timeRemaining: number;
}

export default function DraftRoom({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [draftState, setDraftState] = useState<DraftRoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  // Calculate time remaining (if you have a timer feature)
  let timeRemaining = 0;
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (resolvedParams?.roomId === 'undefined' || !resolvedParams?.roomId) {
      setError('Invalid draft room ID');
      return;
    }
  }, [resolvedParams]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'loading') {
      return;
    }

    if (!session?.user?.id) {
      setError('Not authenticated');
      return;
    }

    if (!resolvedParams?.roomId) {
      setError('Room ID is required');
      return;
    }

    fetchDraftState();
    // Set up polling for draft state
    const interval = setInterval(fetchDraftState, 5000);
    return () => clearInterval(interval);
  }, [session, resolvedParams, status]);

  useEffect(() => {
    if (draftState?.room?.status === "ACTIVE" && draftState?.currentDrafter) {
      // Set initial time
      setTimeLeft(draftState.timeRemaining);
      
      // Create timer that updates every second
      const timer = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      
      // Clean up timer
      return () => clearInterval(timer);
    }
  }, [draftState?.room?.status, draftState?.timeRemaining, draftState?.currentDrafter]);

  const fetchDraftState = async () => {
    if (!resolvedParams?.roomId || resolvedParams.roomId === 'undefined') {
      setError('Invalid draft room ID');
      return;
    }

    try {
      setLoading(true);
      
      // Make the API call with explicit string conversion of roomId
      const roomId = resolvedParams.roomId.toString();
      
      const response = await fetch(`/api/draft/${roomId}/state`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to fetch draft state');
      }

      const data = await response.json();
      setDraftState(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching draft state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch draft state');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamPick = async (teamId: string) => {
    try {
      const response = await fetch(`/api/draft/${resolvedParams.roomId}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId: teamId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to make pick');
      }

      // Refresh draft state
      fetchDraftState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make pick');
    }
  };

  const handleJoinDraft = async () => {
    if (!resolvedParams?.roomId || resolvedParams.roomId === 'undefined') {
      setError('Invalid draft room ID');
      return;
    }

    try {
      setIsJoining(true);
      // Ensure roomId is a string
      const roomId = resolvedParams.roomId.toString();
      
      const response = await fetch(`/api/draft/${roomId}/join`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to join draft room');
      }

      // Refresh draft state
      await fetchDraftState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join draft room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartDraft = async () => {
    if (!resolvedParams?.roomId || resolvedParams.roomId === 'undefined') {
      setError('Invalid draft room ID');
      return;
    }

    try {
      setIsStarting(true);
      // Ensure roomId is a string
      const roomId = resolvedParams.roomId.toString();
      
      const response = await fetch(`/api/draft/${roomId}/start`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start draft');
      }

      // Refresh draft state
      await fetchDraftState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start draft');
    } finally {
      setIsStarting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Draft room not found</div>
      </div>
    );
  }

  // Check if current user is a participant
  const isParticipant = draftState.participants.some(
    (p) => p.userId === session?.user?.id
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{draftState.room.name}</h1>
              {draftState.room.description && (
                <p className="mt-2 text-gray-600">{draftState.room.description}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Round {draftState.currentRound}</div>
              <div className="text-sm text-gray-500">Pick {draftState.currentPickNumber}</div>
              {draftState.room.status === "ACTIVE" && timeLeft > 0 && (
                <div className="text-sm font-medium text-orange-600">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} remaining
                </div>
              )}
              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                {/* Join button if not a participant */}
                {!isParticipant && draftState.room.status === 'PENDING' && (
                  <button
                    onClick={handleJoinDraft}
                    disabled={isJoining}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                      isJoining ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isJoining ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Joining...
                      </>
                    ) : (
                      'Join Draft'
                    )}
                  </button>
                )}

                {/* Start button for creator when room is in PENDING status */}
                {isParticipant && 
                  draftState.room.status === 'PENDING' && 
                  draftState.room.createdBy === session?.user?.id && (
                  <button
                    onClick={handleStartDraft}
                    disabled={isStarting || draftState.participants.length < 2}
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isStarting || draftState.participants.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={draftState.participants.length < 2 ? "At least 2 participants required" : ""}
                  >
                    {isStarting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Starting...
                      </>
                    ) : (
                      'Start Draft'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Participants */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Participants</h2>
            <div className="space-y-4">
              {draftState.participants.map((participant) => (
                <div
                  key={participant._id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    draftState.currentDrafter?._id === participant._id
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {participant.user.name || participant.user.email}
                    </div>
                    <div className="text-sm text-gray-500">
                      {participant.isReady ? 'Ready' : 'Not Ready'}
                    </div>
                  </div>
                  {draftState.currentDrafter?._id === participant._id && (
                    <div className="text-sm font-medium text-blue-600">
                      Currently Picking
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Draft Board */}
          <div className="lg:col-span-2 bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Draft Board</h2>
            <div className="space-y-4">
              {draftState.picks.map((pick) => (
                <div
                  key={pick._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {pick.team ? `${pick.team.teamNumber} - ${pick.team.name}` : 'Team not found'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Picked by {pick.participant.user.name || pick.participant.user.email}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Pick #{pick.pickNumber}
                  </div>
                </div>
              ))}
            </div>

            {/* Available Teams */}
            {draftState.isMyTurn && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Teams</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {draftState.availableTeams.map((team) => (
                    <button
                      key={team._id}
                      onClick={() => handleTeamPick(team.teamId)}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {team.teamNumber} - {team.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 