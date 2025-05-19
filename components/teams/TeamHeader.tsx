import { Team } from '@/lib/types/team';
import { Trophy, Globe, Calendar } from 'lucide-react';

interface TeamHeaderProps {
  team: Team;
}

export default function TeamHeader({ team }: TeamHeaderProps) {
  const hasSeasonData = team.seasonData !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">Team {team.teamNumber}</h1>
          {hasSeasonData && team.seasonData && team.seasonData.regionalWins > 0 && (
            <Trophy className="h-8 w-8 text-yellow-500" />
          )}
        </div>
        <h2 className="text-2xl text-gray-700">{team.name}</h2>
      </div>

      <div className="flex flex-wrap gap-6 text-gray-600">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <span>
            {[team.city, team.stateProv, team.country].filter(Boolean).join(', ')}
          </span>
        </div>
        {team.rookieYear && (
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>Rookie Year: {team.rookieYear}</span>
          </div>
        )}
        {team.website && (
          <a
            href={team.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <Globe className="h-5 w-5" />
            <span>Team Website</span>
          </a>
        )}
      </div>

      {hasSeasonData && team.seasonData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600">Record</p>
            <p className="text-2xl font-semibold">
              {team.seasonData.wins}W - {team.seasonData.losses}L
              {team.seasonData.ties > 0 && ` - ${team.seasonData.ties}T`}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600">Average RPs</p>
            <p className="text-2xl font-semibold">
              {team.seasonData.avgRPs.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600">Average Score</p>
            <p className="text-2xl font-semibold">
              {team.seasonData.avgMatchScore.toFixed(1)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600">Events</p>
            <p className="text-2xl font-semibold">
              {team.seasonData.eventCount}
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 