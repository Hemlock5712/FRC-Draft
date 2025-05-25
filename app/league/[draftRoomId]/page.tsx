"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface LeagueStanding {
  rank: number;
  userId: string;
  totalPoints: number;
  weekCount: number;
  averagePoints: number;
  bestWeek: number;
  worstWeek: number;
  user: {
    _id: Id<"users">;
    name?: string;
    email?: string;
  } | null;
}

interface LeagueAnalytics {
  totalParticipants: number;
  totalWeeks: number;
  averageWeeklyScore: number;
  highestWeeklyScore: number;
  lowestWeeklyScore: number;
  scoreDistribution: Array<{
    min: number;
    max: number;
    count: number;
  }>;
  weeklyAverages: Array<{
    week: number;
    averageScore: number;
    participantCount: number;
    highScore: number;
    lowScore: number;
  }>;
}

export default function LeagueAnalyticsPage() {
  const params = useParams();
  const draftRoomId = params?.draftRoomId as string;
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'standings' | 'analytics' | 'projections'>('standings');

  // Fetch league data
  const standings = useQuery(api.playerManagement.getLeagueStandings, {
    draftRoomId,
    year: selectedYear,
    week: selectedWeek,
  }) as LeagueStanding[] | undefined;

  const analytics = useQuery(api.playerManagement.getLeagueAnalytics, {
    draftRoomId,
    year: selectedYear,
  }) as LeagueAnalytics | undefined;

  const draftRoom = useQuery(api.draft.getDraftState, {
    roomId: draftRoomId as Id<"draftRooms">,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {draftRoom?.room?.name || 'League'} Analytics
          </h1>
          <p className="mt-2 text-gray-600">
            Comprehensive league performance and scoring analytics
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week (All Weeks if empty)
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={selectedWeek || ''}
                onChange={(e) => setSelectedWeek(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="All weeks"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm w-32"
              />
            </div>

            <div className="ml-auto">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('standings')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'standings'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Standings
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('projections')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'projections'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Projections
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'standings' && (
          <StandingsTab standings={standings} selectedWeek={selectedWeek} />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsTab analytics={analytics} />
        )}
        
        {activeTab === 'projections' && (
          <ProjectionsTab draftRoomId={draftRoomId} year={selectedYear} />
        )}
      </div>
    </div>
  );
}

function StandingsTab({ standings, selectedWeek }: { 
  standings: LeagueStanding[] | undefined; 
  selectedWeek: number | undefined;
}) {
  if (!standings) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          League Standings {selectedWeek ? `- Week ${selectedWeek}` : '- Season Total'}
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Weeks Played
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Best Week
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Worst Week
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {standings.map((standing) => (
              <tr key={standing.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      standing.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                      standing.rank === 2 ? 'bg-gray-100 text-gray-800' :
                      standing.rank === 3 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {standing.rank}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {standing.user?.name || standing.user?.email || 'Unknown User'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">
                    {standing.totalPoints.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {standing.averagePoints.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {standing.weekCount}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-green-600 font-medium">
                    {standing.bestWeek.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-red-600">
                    {standing.worstWeek.toFixed(2)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {standings.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-500">
          No standings data available for the selected period.
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ analytics }: { analytics: LeagueAnalytics | undefined }) {
  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">Total Participants</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.totalParticipants}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">Total Weeks</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.totalWeeks}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">Average Weekly Score</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.averageWeeklyScore.toFixed(1)}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">Highest Weekly Score</div>
          <div className="text-2xl font-bold text-green-600">{analytics.highestWeeklyScore.toFixed(1)}</div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {analytics.scoreDistribution.map((range, index) => (
            <div key={index} className="text-center">
              <div className="text-sm text-gray-500 mb-1">
                {range.min}-{range.max === Infinity ? '250+' : range.max}
              </div>
              <div className="text-2xl font-bold text-blue-600">{range.count}</div>
              <div className="text-xs text-gray-400">scores</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Averages */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  High Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Low Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.weeklyAverages.map((week) => (
                <tr key={week.week} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Week {week.week}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {week.averageScore.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {week.participantCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {week.highScore.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {week.lowScore.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProjectionsTab({ draftRoomId, year }: { draftRoomId: string; year: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Projections</h3>
      <div className="text-center text-gray-500 py-8">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-lg">Team projections feature coming soon!</p>
        <p className="text-sm mt-2">
          This will show projected performance for teams in your roster based on historical data and trends.
        </p>
      </div>
    </div>
  );
} 