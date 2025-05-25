"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";

export default function Phase6DemoPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<'trading' | 'waiver' | 'notifications' | 'mobile'>('trading');

  // Trading system state
  const [selectedDraftRoom, setSelectedDraftRoom] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [offeredTeams, setOfferedTeams] = useState<string[]>([]);
  const [requestedTeams, setRequestedTeams] = useState<string[]>([]);
  const [tradeMessage, setTradeMessage] = useState("");

  // Waiver wire state
  const [waiverData, setWaiverData] = useState({
    draftRoomId: "",
    teamId: "",
  });

  // Notification state
  const [notificationData, setNotificationData] = useState({
    userId: "",
    type: "trade",
    title: "",
    message: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
  });

  // Mutations
  const initiateTrade = useMutation(api.playerManagement.initiateTrade);
  const addToWaiverWire = useMutation(api.playerManagement.addToWaiverWire);
  const processWaiverClaims = useMutation(api.playerManagement.processWaiverClaims);
  const createNotification = useMutation(api.playerManagement.createNotification);
  const syncTBAData = useMutation(api.playerManagement.syncTBAData);

  // Queries
  const userNotifications = useQuery(api.playerManagement.getUserNotifications, 
    session?.user?.id ? { userId: session.user.id, limit: 10 } : "skip"
  );
  
  const mobileDashboard = useQuery(api.playerManagement.getMobileDashboard,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

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

      setMessage(`✅ Trade proposal created successfully! Trade ID: ${result}`);
      
      // Reset form
      setOfferedTeams([]);
      setRequestedTeams([]);
      setTradeMessage("");
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWaiverWire = async () => {
    if (!session?.user?.id || !waiverData.draftRoomId || !waiverData.teamId) {
      setMessage("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await addToWaiverWire({
        userId: session.user.id,
        draftRoomId: waiverData.draftRoomId,
        teamId: waiverData.teamId,
      });

      setMessage(`✅ Team added to waiver wire! Claim ID: ${result}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessWaivers = async () => {
    if (!waiverData.draftRoomId) {
      setMessage("Please provide a draft room ID");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const results = await processWaiverClaims({
        draftRoomId: waiverData.draftRoomId,
      });

      setMessage(`✅ Processed ${results.length} waiver claims`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    if (!notificationData.userId || !notificationData.title || !notificationData.message) {
      setMessage("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await createNotification({
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority,
      });

      setMessage(`✅ Notification created! ID: ${result}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTBA = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await syncTBAData({
        year: 2024,
        forceSync: true,
      });

      setMessage(`✅ ${result.message}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Phase 6: Advanced Features Demo</h1>
          <p className="mt-2 text-gray-600">
            Test and demonstrate Phase 6 advanced features including trading, waiver wire, notifications, and mobile APIs
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'trading', name: 'Trading System', icon: '🔄' },
                { id: 'waiver', name: 'Waiver Wire', icon: '📋' },
                { id: 'notifications', name: 'Notifications', icon: '🔔' },
                { id: 'mobile', name: 'Mobile API', icon: '📱' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'trading' && (
            <TradingTab
              selectedDraftRoom={selectedDraftRoom}
              setSelectedDraftRoom={setSelectedDraftRoom}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              offeredTeams={offeredTeams}
              setOfferedTeams={setOfferedTeams}
              requestedTeams={requestedTeams}
              setRequestedTeams={setRequestedTeams}
              tradeMessage={tradeMessage}
              setTradeMessage={setTradeMessage}
              onInitiateTrade={handleInitiateTrade}
              loading={loading}
            />
          )}

          {activeTab === 'waiver' && (
            <WaiverTab
              waiverData={waiverData}
              setWaiverData={setWaiverData}
              onAddToWaiver={handleAddToWaiverWire}
              onProcessWaivers={handleProcessWaivers}
              loading={loading}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab
              notificationData={notificationData}
              setNotificationData={setNotificationData}
              onCreateNotification={handleCreateNotification}
              userNotifications={userNotifications}
              loading={loading}
            />
          )}

          {activeTab === 'mobile' && (
            <MobileTab
              mobileDashboard={mobileDashboard}
              onSyncTBA={handleSyncTBA}
              loading={loading}
            />
          )}
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-8 rounded-md p-4 ${
            message.startsWith('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TradingTab({ 
  selectedDraftRoom, setSelectedDraftRoom, selectedUser, setSelectedUser, 
  offeredTeams, setOfferedTeams, requestedTeams, setRequestedTeams, 
  tradeMessage, setTradeMessage, onInitiateTrade, loading 
}: any) {
  const { data: session } = useSession();

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

  const handleOfferedTeamToggle = (teamId: string) => {
    setOfferedTeams((prev: string[]) => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleRequestedTeamToggle = (teamId: string) => {
    setRequestedTeams((prev: string[]) => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  // Auto-select first draft room if available
  useEffect(() => {
    if (userDraftRooms && userDraftRooms.length > 0 && !selectedDraftRoom) {
      setSelectedDraftRoom(userDraftRooms[0]._id);
    }
  }, [userDraftRooms, selectedDraftRoom, setSelectedDraftRoom]);

  // Reset selections when draft room changes
  useEffect(() => {
    setSelectedUser("");
    setOfferedTeams([]);
    setRequestedTeams([]);
  }, [selectedDraftRoom, setSelectedUser, setOfferedTeams, setRequestedTeams]);

  // Reset team selections when user changes
  useEffect(() => {
    setRequestedTeams([]);
  }, [selectedUser, setRequestedTeams]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Trading System</h2>
      <p className="text-sm text-gray-600 mb-6">
        Select a league, choose a trading partner, and pick teams to trade. The system automatically detects your leagues and available teams.
      </p>

      <div className="space-y-6">
        {/* League Selection */}
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
              <option value="">Choose a user...</option>
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
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${
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
                Their Teams to Request ({requestedTeams.length} selected)
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
                {otherUserTeams && otherUserTeams.length > 0 ? (
                  <div className="space-y-2">
                    {otherUserTeams.map((team) => (
                      <div
                        key={team.teamId}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${
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
              placeholder="Optional message to include with the trade proposal"
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
      </div>

      <button
        onClick={onInitiateTrade}
        disabled={loading || !selectedUser || offeredTeams.length === 0 || requestedTeams.length === 0}
        className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Trade...' : 'Propose Trade'}
      </button>
    </div>
  );
}

function WaiverTab({ waiverData, setWaiverData, onAddToWaiver, onProcessWaivers, loading }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Waiver Wire System</h2>
        <p className="text-sm text-gray-600 mb-6">
          Add teams to the waiver wire and process claims based on priority order.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Draft Room ID
            </label>
            <input
              type="text"
              value={waiverData.draftRoomId}
              onChange={(e) => setWaiverData({...waiverData, draftRoomId: e.target.value})}
              placeholder="League/Draft Room ID"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team ID
            </label>
            <input
              type="text"
              value={waiverData.teamId}
              onChange={(e) => setWaiverData({...waiverData, teamId: e.target.value})}
              placeholder="e.g., frc254"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={onAddToWaiver}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add to Waiver Wire'}
          </button>

          <button
            onClick={onProcessWaivers}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Process Waiver Claims'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ notificationData, setNotificationData, onCreateNotification, userNotifications, loading }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification System</h2>
        <p className="text-sm text-gray-600 mb-6">
          Create and manage user notifications for trades, waiver claims, and other events.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={notificationData.userId}
              onChange={(e) => setNotificationData({...notificationData, userId: e.target.value})}
              placeholder="User ID to notify"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={notificationData.type}
              onChange={(e) => setNotificationData({...notificationData, type: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="trade">Trade</option>
              <option value="waiver">Waiver</option>
              <option value="score">Score Update</option>
              <option value="system">System</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={notificationData.priority}
              onChange={(e) => setNotificationData({...notificationData, priority: e.target.value as any})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={notificationData.title}
              onChange={(e) => setNotificationData({...notificationData, title: e.target.value})}
              placeholder="Notification title"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={notificationData.message}
              onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
              placeholder="Notification message"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={onCreateNotification}
          disabled={loading}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Notification'}
        </button>
      </div>

      {/* User Notifications Display */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Recent Notifications</h3>
        {userNotifications && userNotifications.length > 0 ? (
          <div className="space-y-3">
            {userNotifications.map((notification: any) => (
              <div key={notification._id} className="border border-gray-200 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{notification.title}</h4>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      notification.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      notification.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {notification.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      notification.isRead ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {notification.isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No notifications found</p>
        )}
      </div>
    </div>
  );
}

function MobileTab({ mobileDashboard, onSyncTBA, loading }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mobile API & Data Sync</h2>
        <p className="text-sm text-gray-600 mb-6">
          Mobile-optimized APIs and real-time data synchronization features.
        </p>

        <div className="space-x-4">
          <button
            onClick={onSyncTBA}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Syncing...' : 'Sync TBA Data (2024)'}
          </button>
        </div>
      </div>

      {/* Mobile Dashboard Display */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mobile Dashboard Summary</h3>
        {mobileDashboard ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{mobileDashboard.activeLeagues?.length || 0}</div>
              <div className="text-sm text-gray-500">Active Leagues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{mobileDashboard.unreadNotifications || 0}</div>
              <div className="text-sm text-gray-500">Unread Notifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{mobileDashboard.pendingTrades || 0}</div>
              <div className="text-sm text-gray-500">Pending Trades</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Loading mobile dashboard...</p>
        )}
      </div>

      {/* Phase 6 Features Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase 6 Features Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-900">🔄 Trading System</h4>
            <p className="text-sm text-gray-600">
              Complete player-to-player team trading with validation, proposals, and automatic roster updates.
            </p>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-900">📋 Waiver Wire</h4>
            <p className="text-sm text-gray-600">
              Priority-based team claiming system with automatic processing and roster management.
            </p>
          </div>
          
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold text-gray-900">🔔 Notifications</h4>
            <p className="text-sm text-gray-600">
              Real-time user notifications for trades, waiver claims, scores, and league updates.
            </p>
          </div>
          
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold text-gray-900">📱 Mobile API</h4>
            <p className="text-sm text-gray-600">
              Optimized endpoints for mobile applications with dashboard summaries and real-time data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 