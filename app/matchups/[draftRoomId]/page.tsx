"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface MatchupData {
  _id: string;
  user1Id: string;
  user2Id: string;
  status: "SCHEDULED" | "COMPLETED" | "TIE";
  winnerId?: string;
  user1Score: number;
  user2Score: number;
  user1: {
    _id: string;
    name?: string;
    email?: string;
  } | null;
  user2: {
    _id: string;
    name?: string;
    email?: string;
  } | null;
}

interface AnimatedScore {
  userId: string;
  oldScore: number;
  newScore: number;
  isAnimating: boolean;
}

export default function MatchupsPage() {
  const params = useParams();
  const draftRoomId = params?.draftRoomId as string;
  const { data: session } = useSession();
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedUser1, setSelectedUser1] = useState<string>("");
  const [selectedUser2, setSelectedUser2] = useState<string>("");
  const [animatedScores, setAnimatedScores] = useState<AnimatedScore[]>([]);
  const [previousScores, setPreviousScores] = useState<Map<string, number>>(new Map());

  // Get draft room info
  const draftRoom = useQuery(api.draft.getDraftState, {
    roomId: draftRoomId as Id<"draftRooms">,
  });

  // Get weekly matchups
  const weeklyMatchups = useQuery(api.playerManagement.getWeeklyMatchups, {
    draftRoomId,
    year: selectedYear,
    week: selectedWeek,
  }) as MatchupData[] | undefined;

  // Get head-to-head standings
  const headToHeadStandings = useQuery(api.playerManagement.getHeadToHeadStandings, {
    draftRoomId,
    year: selectedYear,
  });

  // Get league participants for dropdown
  const participants = useQuery(api.playerManagement.getLeagueParticipants, {
    draftRoomId,
  });

  // Get head-to-head record between selected users
  const headToHeadRecord = useQuery(api.playerManagement.getHeadToHeadRecord,
    selectedUser1 && selectedUser2 && selectedUser1 !== selectedUser2 ? {
      draftRoomId,
      user1Id: selectedUser1,
      user2Id: selectedUser2,
      year: selectedYear,
    } : "skip"
  );



  // Get detailed roster information with team scores (like admin page)
  const detailedRosters = useQuery(api.playerManagement.getDetailedRosterWithScores, {
    draftRoomId,
    year: selectedYear,
    week: selectedWeek,
  });

  // Handle score animations
  useEffect(() => {
    if (weeklyMatchups) {
      const newAnimations: AnimatedScore[] = [];
      
      weeklyMatchups.forEach(matchup => {
        const user1PrevScore = previousScores.get(matchup.user1Id) || 0;
        const user2PrevScore = previousScores.get(matchup.user2Id) || 0;
        
        if (user1PrevScore !== matchup.user1Score) {
          newAnimations.push({
            userId: matchup.user1Id,
            oldScore: user1PrevScore,
            newScore: matchup.user1Score,
            isAnimating: true,
          });
        }
        
        if (user2PrevScore !== matchup.user2Score) {
          newAnimations.push({
            userId: matchup.user2Id,
            oldScore: user2PrevScore,
            newScore: matchup.user2Score,
            isAnimating: true,
          });
        }
      });
      
      if (newAnimations.length > 0) {
        setAnimatedScores(newAnimations);
        
        // Update previous scores
        const newPreviousScores = new Map(previousScores);
        weeklyMatchups.forEach(matchup => {
          newPreviousScores.set(matchup.user1Id, matchup.user1Score);
          newPreviousScores.set(matchup.user2Id, matchup.user2Score);
        });
        setPreviousScores(newPreviousScores);
        
        // Clear animations after 3 seconds
        setTimeout(() => {
          setAnimatedScores([]);
        }, 3000);
      }
    }
  }, [weeklyMatchups, previousScores]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedWeek > 1) {
      setSelectedWeek(selectedWeek - 1);
    } else if (direction === 'next' && selectedWeek < 8) {
      setSelectedWeek(selectedWeek + 1);
    }
  };

  const getScoreAnimation = (userId: string) => {
    const animation = animatedScores.find(a => a.userId === userId);
    if (!animation || !animation.isAnimating) return null;
    
    const scoreDiff = animation.newScore - animation.oldScore;
    const isPositive = scoreDiff > 0;
    const isNegative = scoreDiff < 0;
    
    return {
      scoreDiff,
      isPositive,
      isNegative,
      className: isPositive 
        ? "text-green-600 font-bold animate-pulse" 
        : isNegative 
        ? "text-red-600 font-bold animate-pulse"
        : "text-gray-900 font-semibold"
    };
  };

  const ScoreDisplay = ({ userId, score }: { userId: string; score: number }) => {
    const animation = getScoreAnimation(userId);
    
    return (
      <div className="relative">
        <span className={animation ? animation.className : "text-gray-900 font-semibold transition-all duration-300"}>
          {score.toFixed(2)}
        </span>
        {animation && (
          <span 
            className={`absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-bold px-2 py-1 rounded-full ${
              animation.isPositive 
                ? 'bg-green-100 text-green-800 animate-bounce' 
                : 'bg-red-100 text-red-800 animate-bounce'
            }`}
            style={{
              animation: 'scoreChange 3s ease-in-out forwards'
            }}
          >
            {animation.isPositive ? '+' : ''}{animation.scoreDiff.toFixed(2)}
          </span>
        )}
        <style jsx>{`
          @keyframes scoreChange {
            0% {
              opacity: 0;
              transform: translateX(-50%) translateY(10px) scale(0.8);
            }
            20% {
              opacity: 1;
              transform: translateX(-50%) translateY(-10px) scale(1.2);
            }
            40% {
              transform: translateX(-50%) translateY(-8px) scale(1);
            }
            80% {
              opacity: 1;
              transform: translateX(-50%) translateY(-8px) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px) scale(0.9);
            }
          }
        `}</style>
      </div>
    );
  };

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Please sign in to view matchups</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {draftRoom?.room?.name || 'League'} Head-to-Head Matchups
              </h1>
              <p className="mt-2 text-gray-600">
                Weekly matchups and head-to-head records
              </p>
            </div>
            <Link
              href={`/roster/${draftRoomId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Roster
            </Link>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                </select>
              </div>

              {/* Week Navigation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateWeek('prev')}
                    disabled={selectedWeek <= 1}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-[60px] text-center">
                    Week {selectedWeek}
                  </span>
                  <button
                    onClick={() => navigateWeek('next')}
                    disabled={selectedWeek >= 8}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Admin controls removed - processing is now automated or admin-only */}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Starting Teams & Points - Vertical Layout */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Week {selectedWeek} Starting Teams & Points
              </h2>
              
              {!detailedRosters ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : detailedRosters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">👥</div>
                  <p className="text-lg">No roster data found</p>
                  <p className="text-sm mt-2">Make sure users have drafted teams</p>
                </div>
              ) : !weeklyMatchups ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📅</div>
                  <p className="text-lg">Loading matchups...</p>
                </div>
              ) : weeklyMatchups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📅</div>
                  <p className="text-lg">No matchups scheduled for Week {selectedWeek}</p>
                  <p className="text-sm mt-2">Create a schedule to generate matchups</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {weeklyMatchups.map((matchup) => {
                    // Find roster data for both users
                    const user1Roster = detailedRosters.find((r: any) => r.userId === matchup.user1Id);
                    const user2Roster = detailedRosters.find((r: any) => r.userId === matchup.user2Id);
                    
                    return (
                      <div key={matchup._id} className="border border-gray-200 rounded-lg p-6">
                        {/* Matchup Header */}
                        <div className="flex items-center justify-center mb-6">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">Week {selectedWeek} Matchup</div>
                            <div className={`text-sm font-medium mt-1 ${
                              matchup.status === "COMPLETED" ? 'text-green-600' :
                              matchup.status === "TIE" ? 'text-yellow-600' :
                              'text-gray-500'
                            }`}>
                              {matchup.status === "COMPLETED" && matchup.winnerId === matchup.user1Id ? `${matchup.user1?.name || 'User 1'} Wins` :
                               matchup.status === "COMPLETED" && matchup.winnerId === matchup.user2Id ? `${matchup.user2?.name || 'User 2'} Wins` :
                               matchup.status === "TIE" ? 'Tie Game' :
                               'In Progress'}
                            </div>
                          </div>
                        </div>

                        {/* Side by Side Users */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* User 1 */}
                          <div className="border border-gray-100 rounded-lg p-4">
                            {/* User 1 Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-semibold text-sm">
                                    {(matchup.user1?.name || matchup.user1?.email || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {matchup.user1?.name || matchup.user1?.email || 'Unknown User'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user1Roster?.startingTeamCount || 0} starting teams
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-3xl font-bold ${
                                  (user1Roster ? user1Roster.totalStartingPoints : matchup.user1Score) > (user2Roster ? user2Roster.totalStartingPoints : matchup.user2Score) ? 'text-green-600' : 'text-gray-900'
                                }`}>
                                  {user1Roster ? user1Roster.totalStartingPoints.toFixed(1) : matchup.user1Score.toFixed(1)}
                                </div>
                                <div className="text-sm text-gray-500">points</div>
                              </div>
                            </div>
                            
                            {/* User 1 Teams */}
                            <div className="space-y-2">
                              {user1Roster?.teams
                                .filter((team: any) => team.isStarting)
                                .map((team: any) => (
                                  <div key={team.teamId} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">
                                          {team.teamNumber}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900 text-sm">
                                          Team {team.teamNumber}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                          {team.name}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-lg text-gray-900">
                                        {team.weeklyPoints.toFixed(1)}
                                      </div>
                                      <div className="text-xs text-gray-500">pts</div>
                                    </div>
                                  </div>
                                )) || (
                                <div className="text-center py-4 text-gray-500">
                                  <p className="text-sm">No starting teams found</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* User 2 */}
                          <div className="border border-gray-100 rounded-lg p-4">
                            {/* User 2 Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-semibold text-sm">
                                    {(matchup.user2?.name || matchup.user2?.email || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {matchup.user2?.name || matchup.user2?.email || 'Unknown User'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user2Roster?.startingTeamCount || 0} starting teams
                                  </div>
                                </div>
                              </div>
                                                             <div className="text-right">
                                 <div className={`text-3xl font-bold ${
                                   (user2Roster ? user2Roster.totalStartingPoints : matchup.user2Score) > (user1Roster ? user1Roster.totalStartingPoints : matchup.user1Score) ? 'text-green-600' : 'text-gray-900'
                                 }`}>
                                   {user2Roster ? user2Roster.totalStartingPoints.toFixed(1) : matchup.user2Score.toFixed(1)}
                                 </div>
                                 <div className="text-sm text-gray-500">points</div>
                               </div>
                            </div>
                            
                            {/* User 2 Teams */}
                            <div className="space-y-2">
                              {user2Roster?.teams
                                .filter((team: any) => team.isStarting)
                                .map((team: any) => (
                                  <div key={team.teamId} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">
                                          {team.teamNumber}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900 text-sm">
                                          Team {team.teamNumber}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                          {team.name}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-lg text-gray-900">
                                        {team.weeklyPoints.toFixed(1)}
                                      </div>
                                      <div className="text-xs text-gray-500">pts</div>
                                    </div>
                                  </div>
                                )) || (
                                <div className="text-center py-4 text-gray-500">
                                  <p className="text-sm">No starting teams found</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Head-to-Head Lookup */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Head-to-Head History</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User 1</label>
                  <select
                    value={selectedUser1}
                    onChange={(e) => setSelectedUser1(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select User 1</option>
                    {participants?.map((participant) => (
                      <option key={participant.userId} value={participant.userId}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User 2</label>
                  <select
                    value={selectedUser2}
                    onChange={(e) => setSelectedUser2(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select User 2</option>
                    {participants?.filter(p => p.userId !== selectedUser1).map((participant) => (
                      <option key={participant.userId} value={participant.userId}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {headToHeadRecord && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center mb-3">
                    <div className="text-lg font-semibold">
                      {headToHeadRecord.user1Wins} - {headToHeadRecord.user2Wins}
                      {headToHeadRecord.ties > 0 && ` - ${headToHeadRecord.ties}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      {headToHeadRecord.totalGames} games played
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">Avg Points</div>
                      <div>{headToHeadRecord.averagePointsUser1}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">Avg Points</div>
                      <div>{headToHeadRecord.averagePointsUser2}</div>
                    </div>
                  </div>

                  {headToHeadRecord.gameHistory.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Recent Games</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {headToHeadRecord.gameHistory.slice(-5).reverse().map((game, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span>Week {game.week}</span>
                            <span>{game.user1Points} - {game.user2Points}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Head-to-Head Standings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">H2H Standings</h3>
              
              {!headToHeadStandings ? (
                <div className="animate-pulse space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {headToHeadStandings.slice(0, 10).map((standing) => (
                    <div key={standing.userId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 text-center font-medium">{standing.rank}</span>
                        <span className="truncate">
                          {standing.user?.name || standing.user?.email || 'Unknown'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {standing.wins}-{standing.losses}
                          {standing.ties > 0 && `-${standing.ties}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {standing.winPercentage}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 