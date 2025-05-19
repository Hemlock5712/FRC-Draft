import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Team {
  id: string;
  name: string;
  number: number;
  // Add more team properties as needed
}

interface DraftPick {
  id: string;
  teamId: string;
  pickNumber: number;
  participantId: string;
  drafterName: string;
  pickedAt: string;
}

interface DraftBoardProps {
  roomId: string;
  maxTeams: number;
  pickTimeLimit: number;
  currentRound: number;
  isSnakeDraft: boolean;
}

export default function DraftBoard({
  roomId,
  maxTeams,
  pickTimeLimit,
  currentRound,
  isSnakeDraft,
}: DraftBoardProps) {
  const { data: session } = useSession();
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(pickTimeLimit);
  const [currentDrafter, setCurrentDrafter] = useState<string>('');
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    // Fetch initial draft state
    fetchDraftState();
    // Set up WebSocket connection
    setupWebSocket();
  }, [roomId]);

  const fetchDraftState = async () => {
    try {
      const response = await fetch(`/api/draft/${roomId}/state`);
      if (!response.ok) throw new Error('Failed to fetch draft state');
      const data = await response.json();
      setPicks(data.picks);
      setAvailableTeams(data.availableTeams);
      setCurrentDrafter(data.currentDrafter);
      setTimeRemaining(data.timeRemaining);
    } catch (error) {
      console.error('Error fetching draft state:', error);
    }
  };

  const setupWebSocket = () => {
    // WebSocket implementation will go here
    // This will handle real-time updates for:
    // - New picks
    // - Timer updates
    // - Current drafter changes
  };

  const handleTeamSelect = async (teamId: string) => {
    if (!isMyTurn) return;

    try {
      const response = await fetch(`/api/draft/${roomId}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) throw new Error('Failed to make pick');
      
      // The WebSocket will handle updating the UI
    } catch (error) {
      console.error('Error making pick:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Timer and Current Drafter */}
      <div className="bg-white shadow-md p-4 mb-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">
            Current Drafter: {currentDrafter}
            {isMyTurn && <span className="ml-2 text-green-600">(Your Turn!)</span>}
          </div>
          <div className="text-xl font-bold">
            Time Remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Main Draft Board Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
        {/* Pick History */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Pick History</h2>
          <div className="overflow-y-auto max-h-[600px]">
            {picks.map((pick) => (
              <div
                key={pick.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 border-b"
              >
                <div>
                  <span className="font-medium">#{pick.pickNumber}</span>
                  <span className="mx-2">Team {pick.teamId}</span>
                </div>
                <div className="text-sm text-gray-600">
                  by {pick.drafterName}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available Teams */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Available Teams</h2>
          <div className="overflow-y-auto max-h-[600px]">
            {availableTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleTeamSelect(team.id)}
                disabled={!isMyTurn}
                className={`w-full text-left p-2 hover:bg-blue-50 border-b ${
                  isMyTurn ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div className="font-medium">Team {team.number}</div>
                <div className="text-sm text-gray-600">{team.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 