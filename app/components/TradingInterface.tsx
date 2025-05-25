"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";

interface TradingInterfaceProps {
  draftRoomId?: string; // If provided, auto-select this league
  onTradeCreated?: (tradeId: string) => void;
  className?: string;
}

export default function TradingInterface({ 
  draftRoomId, 
  onTradeCreated, 
  className = "" 
}: TradingInterfaceProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Trading system state
  const [selectedDraftRoom, setSelectedDraftRoom] = useState(draftRoomId || "");
  const [selectedUser, setSelectedUser] = useState("");
  const [offeredTeams, setOfferedTeams] = useState<string[]>([]);
  const [requestedTeams, setRequestedTeams] = useState<string[]>([]);
  const [tradeMessage, setTradeMessage] = useState("");

  // Queries for dropdowns
  const userDraftRooms = useQuery(api.playerManagement.getUserDraftRoomsForTrading,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  const draftRoomParticipants = useQuery(api.playerManagement.getDraftRoomParticipants,
    selectedDraftRoom && session?.user?.id ? { 
      draftRoomId: selectedDraftRoom, 
      excludeUserId: session.user.id 
    } : "skip"
  );

  const userTeams = useQuery(api.playerManagement.getUserTeamsForTrading,
    selectedDraftRoom && session?.user?.id ? {
      userId: session.user.id,
      draftRoomId: selectedDraftRoom,
    } : "skip"
  );

  const otherUserTeams = useQuery(api.playerManagement.getUserTeamsForTrading,
    selectedDraftRoom && selectedUser ? {
      userId: selectedUser,
      draftRoomId: selectedDraftRoom,
    } : "skip"
  );

  // Mutation
  const initiateTrade = useMutation(api.playerManagement.initiateTrade);

  // Auto-select provided draft room
  useEffect(() => {
    if (draftRoomId) {
      setSelectedDraftRoom(draftRoomId);
    } else if (userDraftRooms && userDraftRooms.length > 0 && !selectedDraftRoom) {
      setSelectedDraftRoom(userDraftRooms[0]._id);
    }
  }, [draftRoomId, userDraftRooms, selectedDraftRoom]);

  // Reset selections when draft room changes
  useEffect(() => {
    setSelectedUser("");
    setOfferedTeams([]);
    setRequestedTeams([]);
    setMessage("");
  }, [selectedDraftRoom]);

  // Reset team selections when user changes
  useEffect(() => {
    setRequestedTeams([]);
    setMessage("");
  }, [selectedUser]);

  const handleOfferedTeamToggle = (teamId: string) => {
    setOfferedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleRequestedTeamToggle = (teamId: string) => {
    setRequestedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleInitiateTrade = async () => {
    if (!session?.user?.id || !selectedUser || !selectedDraftRoom || 
        offeredTeams.length === 0 || requestedTeams.length === 0) {
      setMessage("Please fill in all required fields and select teams to trade");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await initiateTrade({
        fromUserId: session.user.id,
        toUserId: selectedUser,
        draftRoomId: selectedDraftRoom,
        offeredTeamIds: offeredTeams,
        requestedTeamIds: requestedTeams,
        message: tradeMessage,
      });

      setMessage(`✅ Trade proposal sent successfully!`);
      
      // Reset form
      setOfferedTeams([]);
      setRequestedTeams([]);
      setTradeMessage("");
      setSelectedUser("");

      // Callback for parent component
      if (onTradeCreated) {
        onTradeCreated(result);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user?.id) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center text-gray-500">
          Please sign in to access the trading system.
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Trading</h2>
      <p className="text-sm text-gray-600 mb-6">
        Propose trades with other league members. Select teams from your roster to offer and teams you want in return.
      </p>

      <div className="space-y-6">
        {/* League Selection - only show if not pre-selected */}
        {!draftRoomId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select League
            </label>
            <select
              value={selectedDraftRoom}
              onChange={(e) => setSelectedDraftRoom(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Choose a league...</option>
              {userDraftRooms?.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User Selection */}
        {selectedDraftRoom && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trade With
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Choose a league member...</option>
              {draftRoomParticipants?.map((participant) => (
                <option key={participant.userId} value={participant.userId}>
                  {participant.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Team Selection */}
        {selectedUser && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Your Teams */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Teams to Offer ({offeredTeams.length} selected)
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
                {userTeams && userTeams.length > 0 ? (
                  <div className="space-y-2">
                    {userTeams.map((team) => (
                      <div
                        key={team.teamId}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          offeredTeams.includes(team.teamId)
                            ? 'bg-blue-100 border border-blue-300'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => handleOfferedTeamToggle(team.teamId)}
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {team.teamNumber} - {team.name}
                          </div>
                          {team.isStarting && (
                            <div className="text-xs text-green-600">Starting</div>
                          )}
                        </div>
                        <div className="text-sm">
                          {offeredTeams.includes(team.teamId) ? '✓' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No teams available
                  </div>
                )}
              </div>
            </div>

            {/* Their Teams */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teams to Request ({requestedTeams.length} selected)
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
                {otherUserTeams && otherUserTeams.length > 0 ? (
                  <div className="space-y-2">
                    {otherUserTeams.map((team) => (
                      <div
                        key={team.teamId}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          requestedTeams.includes(team.teamId)
                            ? 'bg-green-100 border border-green-300'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => handleRequestedTeamToggle(team.teamId)}
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {team.teamNumber} - {team.name}
                          </div>
                          {team.isStarting && (
                            <div className="text-xs text-green-600">Starting</div>
                          )}
                        </div>
                        <div className="text-sm">
                          {requestedTeams.includes(team.teamId) ? '✓' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No teams available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trade Message */}
        {selectedUser && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trade Message (optional)
            </label>
            <textarea
              value={tradeMessage}
              onChange={(e) => setTradeMessage(e.target.value)}
              placeholder="Add a message to explain your trade proposal..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* Trade Summary */}
        {offeredTeams.length > 0 && requestedTeams.length > 0 && (
          <div className="bg-gray-50 rounded-md p-4">
            <h4 className="font-medium text-gray-900 mb-2">Trade Summary</h4>
            <div className="text-sm text-gray-600">
              <div>You give: {offeredTeams.length} team(s)</div>
              <div>You receive: {requestedTeams.length} team(s)</div>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`rounded-md p-3 ${
            message.startsWith('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}
      </div>

      <button
        onClick={handleInitiateTrade}
        disabled={loading || !selectedUser || offeredTeams.length === 0 || requestedTeams.length === 0}
        className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending Trade Proposal...' : 'Propose Trade'}
      </button>
    </div>
  );
} 