import { Team } from '@/lib/types/team';
import { BarChart, TrendingUp, Award, Trophy } from 'lucide-react';

interface TeamStatsProps {
  team: Team;
}

export default function TeamStats({ team }: TeamStatsProps) {
  const hasSeasonData = team.seasonData !== null;

  if (!hasSeasonData || !team.seasonData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">2024 Season Statistics</h2>
        <p className="text-gray-600">No statistics available for the 2024 season yet.</p>
      </div>
    );
  }

  const { seasonData } = team;
  const winPercentage = ((seasonData.wins + seasonData.ties * 0.5) /
    (seasonData.wins + seasonData.losses + seasonData.ties)) *
    100;

  const statCards = [
    {
      title: 'Win Rate',
      value: `${winPercentage.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'Regional Wins',
      value: seasonData.regionalWins,
      icon: Trophy,
      color: 'text-yellow-600',
    },
    {
      title: 'Average RPs',
      value: seasonData.avgRPs.toFixed(2),
      icon: Award,
      color: 'text-purple-600',
    },
    {
      title: 'Average Score',
      value: seasonData.avgMatchScore.toFixed(1),
      icon: BarChart,
      color: 'text-blue-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">2024 Season Statistics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <div key={card.title} className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3 mb-2">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <h3 className="font-semibold text-gray-700">{card.title}</h3>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Performance Breakdown</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Match Record */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Match Record</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Wins</span>
                <span className="font-medium">{seasonData.wins}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Losses</span>
                <span className="font-medium">{seasonData.losses}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ties</span>
                <span className="font-medium">{seasonData.ties}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-600">Total Matches</span>
                <span className="font-medium">
                  {seasonData.wins + seasonData.losses + seasonData.ties}
                </span>
              </div>
            </div>
          </div>

          {/* Event Performance */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Event Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Events Competed</span>
                <span className="font-medium">{seasonData.eventCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Regional Victories</span>
                <span className="font-medium">{seasonData.regionalWins}</span>
              </div>
              {seasonData.districtRank && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">District Rank</span>
                  <span className="font-medium">#{seasonData.districtRank}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-600">Total RPs</span>
                <span className="font-medium">{seasonData.totalRPs.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 