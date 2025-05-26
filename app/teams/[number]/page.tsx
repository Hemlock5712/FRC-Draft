'use client'; // This component now uses client-side data fetching with SWR or similar

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import TeamStats from '@/components/teams/TeamStats';
import TeamHeader from '@/components/teams/TeamHeader';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface Props {
  params: {
    number: string;
  };
}

// Metadata generation will need to be handled differently, perhaps in a parent layout or a server component wrapper
// For now, we'll provide a generic title. For dynamic metadata with client components, 
// you might need to update document.title in a useEffect hook or use a more advanced setup.
// export async function generateMetadata({ params }: Props): Promise<Metadata> {
//   // This needs to be a server-side call if you want dynamic metadata
//   // Or, fetch initial data on the server and pass to a client component
//   return {
//     title: `Team ${params.number} | Fantasy FRC Draft`,
//   };
// }

export default function TeamPage({ params }: Props) {
  const teamNumber = parseInt(params.number);

  const team = useQuery(api.teams.getTeamByNumber, { teamNumber });
  
  // Get team event performances
  const teamPerformances = useQuery(api.playerManagement.getTeamEventPerformances,
    team ? { teamId: team.teamId, year: 2024 } : "skip"
  );

  if (team === undefined) { // useQuery returns undefined while loading
    return <div className="container mx-auto px-4 py-8">Loading team data...</div>;
  }

  if (team === null) { // useQuery returns null if not found
    notFound();
  }

  // Transform team data to include season data from performances
  const seasonData = teamPerformances?.summary ? {
    wins: teamPerformances.summary.totalWins,
    losses: teamPerformances.summary.totalLosses,
    ties: teamPerformances.summary.totalTies,
    eventCount: teamPerformances.summary.totalEvents,
    totalRPs: 0, // Not available in current data structure
    avgRPs: 0, // Not available in current data structure
    totalMatchScore: 0, // Not available in current data structure
    avgMatchScore: 0, // Not available in current data structure
    regionalWins: teamPerformances.summary.eventWins,
    districtRank: null, // Not available in current data structure
  } : null;

  const displayTeam = {
      ...team,
      seasonData,
      id: team._id.toString(), 
      teamNumber: team.teamNumber,
      name: team.name,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* @ts-ignore */}
      <TeamHeader team={displayTeam} />
      <div className="mt-8">
         {/* @ts-ignore */}
        <TeamStats team={displayTeam} />
      </div>
      
      {/* Event Performances Section */}
      {teamPerformances && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">2024 Event Performances</h2>
          
          {teamPerformances.performances.length === 0 ? (
            <p className="text-gray-600">No event performances found for 2024.</p>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {teamPerformances.summary.totalEvents}
                  </div>
                  <div className="text-sm text-blue-700">Events Competed</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {teamPerformances.summary.totalPoints}
                  </div>
                  <div className="text-sm text-green-700">Total Points</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {teamPerformances.summary.averagePoints}
                  </div>
                  <div className="text-sm text-purple-700">Avg Points/Event</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {teamPerformances.summary.winPercentage}%
                  </div>
                  <div className="text-sm text-orange-700">Win Percentage</div>
                </div>
              </div>

              {/* Event Details Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qual Record
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Playoffs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamPerformances.performances.map((performance) => (
                      <tr key={performance.eventKey} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {performance.event?.name || performance.eventKey}
                          </div>
                          <div className="text-sm text-gray-500">
                            {performance.event?.eventCode}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {performance.event?.city && performance.event?.stateProv
                            ? `${performance.event.city}, ${performance.event.stateProv}`
                            : performance.event?.city || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {performance.qualWins}-{performance.qualLosses}
                          {performance.qualTies > 0 && `-${performance.qualTies}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {performance.madePlayoffs ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {performance.playoffWins}-{performance.playoffLosses}
                            </span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {performance.rank ? `#${performance.rank}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {performance.totalPoints.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Base: {performance.basePoints} | Qual: {performance.qualPoints.toFixed(1)} | Playoff: {performance.playoffPoints.toFixed(1)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 