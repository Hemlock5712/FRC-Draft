import Link from 'next/link';
import { Trophy, Star, Award, TrendingUp } from 'lucide-react';
import { Team } from '@/lib/types/team';

interface TeamCardProps {
  team: Team;
}

export default function TeamCard({ team }: TeamCardProps) {
  const hasSeasonData = team.seasonData !== null;
  const winPercentage = hasSeasonData
    ? ((team.seasonData.wins + team.seasonData.ties * 0.5) /
        (team.seasonData.wins + team.seasonData.losses + team.seasonData.ties)) *
      100
    : 0;

  return (
    <Link
      href={`/teams/${team.teamNumber}`}
      className="block bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-200"
    >
      <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
        <h2 className="text-xl font-bold">Team {team.teamNumber}</h2>
        {hasSeasonData && team.seasonData.regionalWins > 0 && (
          <Trophy className="h-5 w-5" />
        )}
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold line-clamp-1">{team.name}</h3>
          <p className="text-gray-600 text-sm line-clamp-1">
            {[team.city, team.stateProv, team.country].filter(Boolean).join(', ')}
          </p>
        </div>

        {hasSeasonData ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-gray-600">Record</p>
                <p className="font-medium">
                  {team.seasonData.wins}W - {team.seasonData.losses}L
                  {team.seasonData.ties > 0 && ` - ${team.seasonData.ties}T`}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-600">Win Rate</p>
                <p className="font-medium">{winPercentage.toFixed(1)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-600">Avg RPs</p>
                <p className="font-medium">{team.seasonData.avgRPs.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-600">Avg Score</p>
                <p className="font-medium">
                  {team.seasonData.avgMatchScore.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-2 flex-wrap">
              {team.seasonData.regionalWins > 0 && (
                <div className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  <Trophy className="h-3 w-3" />
                  {team.seasonData.regionalWins} Win{team.seasonData.regionalWins > 1 ? 's' : ''}
                </div>
              )}
              {team.seasonData.districtRank && (
                <div className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  <Star className="h-3 w-3" />
                  Rank #{team.seasonData.districtRank}
                </div>
              )}
              {team.seasonData.avgRPs >= 12 && (
                <div className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  <TrendingUp className="h-3 w-3" />
                  High RP
                </div>
              )}
              {winPercentage >= 75 && (
                <div className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  <Award className="h-3 w-3" />
                  Top Performer
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm italic">No 2024 season data available</p>
        )}
      </div>
    </Link>
  );
} 