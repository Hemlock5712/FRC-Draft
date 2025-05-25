'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { use } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
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
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [viewingParticipantIndex, setViewingParticipantIndex] = useState(0); // For Phase 3 item 33
  const [showDraftCompleteModal, setShowDraftCompleteModal] = useState(false); // For Phase 3 item 31
  
  // Team search and pagination state
  const [teamSearch, setTeamSearch] = useState('');
  const [teamPage, setTeamPage] = useState(0);
  const teamsPerPage = 20;
  
  // Loading state for team picking
  const [pickingTeam, setPickingTeam] = useState<string | null>(null);
  
  // Initialize Convex real-time subscriptions and mutations
  const draftState = useQuery(api.draft.getDraftState, 
    resolvedParams?.roomId ? { roomId: resolvedParams.roomId as any } : "skip"
  );
  
  // Get available teams with search and pagination
  const availableTeamsData = useQuery(api.draftPicks.getAvailableTeams, 
    resolvedParams?.roomId ? { 
      roomId: resolvedParams.roomId as any,
      limit: teamsPerPage,
      offset: teamPage * teamsPerPage,
      search: teamSearch || undefined
    } : "skip"
  );
  
  // Convex mutations
  const makePick = useMutation(api.draftPicks.makePick);
  
  const loading = draftState === undefined;

  // Calculate isMyTurn from Convex data
  const isMyTurn = draftState?.currentDrafter?.userId === session?.user?.id;

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

    // Set the viewing participant to the current user by default (Phase 3 item 33)
    if (draftState?.participants && session?.user?.id) {
      const currentUserIndex = draftState.participants.findIndex((p: any) => p.userId === session.user.id);
      if (currentUserIndex !== -1) {
        setViewingParticipantIndex(currentUserIndex);
      }
    }
    
    // Check if draft is complete (Phase 3 item 31)
    if (draftState?.room?.status === "COMPLETED" && !showDraftCompleteModal) {
      setShowDraftCompleteModal(true);
    }
  }, [session, resolvedParams, status, draftState]);

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

  const handleTeamPick = async (teamId: string) => {
    if (!isMyTurn || pickingTeam) {
      return; // Prevent picking if not your turn or already picking
    }

    try {
      setPickingTeam(teamId);
      setError(null);
      
      await makePick({
        roomId: resolvedParams.roomId as any,
        userId: session?.user?.id as string,
        teamId: teamId,
      });

      // Convex real-time subscription will automatically update the UI
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make pick');
    } finally {
      setPickingTeam(null);
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

      // Convex real-time subscription will automatically update the UI
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

      // Convex real-time subscription will automatically update the UI
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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

          {/* Participant Picks Sidebar */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Team Picks</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewingParticipantIndex(Math.max(0, viewingParticipantIndex - 1))}
                  disabled={viewingParticipantIndex === 0}
                  className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewingParticipantIndex(Math.min(draftState.participants.length - 1, viewingParticipantIndex + 1))}
                  disabled={viewingParticipantIndex === draftState.participants.length - 1}
                  className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {draftState.participants[viewingParticipantIndex] && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {draftState.participants[viewingParticipantIndex].user.name || draftState.participants[viewingParticipantIndex].user.email}
                </h3>
                <div className="space-y-2">
                  {draftState.picks
                    .filter(pick => pick.participantId === draftState.participants[viewingParticipantIndex]._id)
                    .map((pick) => (
                      <div key={pick._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {pick.team ? `${pick.team.teamNumber} - ${pick.team.name}` : 'Team not found'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Pick #{pick.pickNumber}
                        </div>
                      </div>
                    ))}
                  {draftState.picks.filter(pick => pick.participantId === draftState.participants[viewingParticipantIndex]._id).length === 0 && (
                    <div className="text-sm text-gray-500 italic">No picks yet</div>
                  )}
                </div>
              </div>
            )}
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
                      Picked by {pick.participant?.user?.name || pick.participant?.user?.email || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Pick #{pick.pickNumber}
                  </div>
                </div>
              ))}
            </div>

            {/* Available Teams */}
            {isMyTurn && draftState.room.status !== "COMPLETED" && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Available Teams</h3>
                  {availableTeamsData && (
                    <span className="text-sm text-gray-500">
                      {availableTeamsData.total} teams available
                    </span>
                  )}
                </div>
                
                {/* Search bar */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search teams by name or number..."
                      value={teamSearch}
                      onChange={(e) => {
                        setTeamSearch(e.target.value);
                        setTeamPage(0); // Reset to first page when searching
                      }}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                {/* Error display */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                      <div className="ml-auto pl-3">
                        <div className="-mx-1.5 -my-1.5">
                          <button
                            onClick={() => setError(null)}
                            className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                          >
                            <span className="sr-only">Dismiss</span>
                            <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  {availableTeamsData?.teams ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {availableTeamsData.teams.map((team) => (
                          <tr 
                            key={team._id}
                            className={`hover:bg-gray-50 ${pickingTeam ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            onClick={() => !pickingTeam && handleTeamPick(team.teamId)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {team.teamNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {team.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!pickingTeam) {
                                    handleTeamPick(team.teamId);
                                  }
                                }}
                                disabled={!!pickingTeam}
                                className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white ${
                                  pickingTeam === team.teamId
                                    ? 'bg-yellow-500 cursor-not-allowed'
                                    : pickingTeam
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                }`}
                              >
                                {pickingTeam === team.teamId ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Picking...
                                  </>
                                ) : (
                                  'Pick'
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      Loading teams...
                    </div>
                  )}
                </div>
                
                {/* Pagination */}
                {availableTeamsData && availableTeamsData.teams.length > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {teamPage * teamsPerPage + 1} to {Math.min((teamPage + 1) * teamsPerPage, availableTeamsData.total)} of {availableTeamsData.total} results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setTeamPage(Math.max(0, teamPage - 1))}
                        disabled={teamPage === 0}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm">
                        Page {teamPage + 1}
                      </span>
                      <button
                        onClick={() => setTeamPage(teamPage + 1)}
                        disabled={!availableTeamsData.hasMore}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Draft Complete Modal (Phase 3 item 31) */}
      {showDraftCompleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                🎉 Draft Complete!
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  Here are your picks:
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {draftState?.picks
                    .filter(pick => 
                      pick.participant && 
                      (pick.participant.user?.name === session?.user?.name || 
                       pick.participant.user?.email === session?.user?.email)
                    )
                    .map((pick) => (
                      <div key={pick._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900">
                          {pick.team ? `${pick.team.teamNumber} - ${pick.team.name}` : 'Team not found'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Pick #{pick.pickNumber}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => {
                    setShowDraftCompleteModal(false);
                    router.push('/dashboard');
                  }}
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 