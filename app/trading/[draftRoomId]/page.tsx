"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSession } from "next-auth/react";
import Link from "next/link";
import TradingInterface from "@/app/components/TradingInterface";

export default function TradingPage() {
  const params = useParams();
  const draftRoomId = params?.draftRoomId as string;
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'propose' | 'incoming' | 'outgoing'>('propose');

  // Get draft room info
  const draftRoom = useQuery(api.draft.getDraftState,
    draftRoomId ? { roomId: draftRoomId as Id<"draftRooms"> } : "skip"
  );

  // Get trade proposals
  const incomingTrades = useQuery(api.playerManagement.getIncomingTrades,
    session?.user?.id && draftRoomId ? {
      userId: session.user.id,
      draftRoomId: draftRoomId,
    } : "skip"
  );

  const outgoingTrades = useQuery(api.playerManagement.getOutgoingTrades,
    session?.user?.id && draftRoomId ? {
      userId: session.user.id,
      draftRoomId: draftRoomId,
    } : "skip"
  );

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Please sign in to access trading</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {draftRoom?.room?.name || 'League'} Trading
              </h1>
              <p className="mt-2 text-gray-600">
                Propose trades and manage trade requests with other league members
              </p>
            </div>
            <Link
              href={`/roster/${draftRoomId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Roster
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'propose', name: 'Propose Trade', icon: '🔄' },
                { id: 'incoming', name: 'Incoming Trades', icon: '📥', count: incomingTrades?.length || 0 },
                { id: 'outgoing', name: 'Outgoing Trades', icon: '📤', count: outgoingTrades?.length || 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'propose' && (
            <ProposeTradeTab draftRoomId={draftRoomId} />
          )}

          {activeTab === 'incoming' && (
            <IncomingTradesTab trades={incomingTrades} draftRoomId={draftRoomId} />
          )}

          {activeTab === 'outgoing' && (
            <OutgoingTradesTab trades={outgoingTrades} draftRoomId={draftRoomId} />
          )}
        </div>
      </div>
    </div>
  );
}

function ProposeTradeTab({ draftRoomId }: { draftRoomId: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Propose New Trade</h3>
        <p className="text-sm text-gray-600">
          Select a trading partner and choose which teams to exchange. Both parties must agree before the trade is completed.
        </p>
      </div>
      
      <TradingInterface 
        draftRoomId={draftRoomId}
        onTradeCreated={(tradeId) => {
          // Could add success notification or refresh data here
          console.log('Trade created:', tradeId);
        }}
      />
    </div>
  );
}

function IncomingTradesTab({ trades, draftRoomId }: { trades: any[] | undefined; draftRoomId: string }) {
  if (!trades) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Incoming Trades</h3>
          <p className="text-sm">You don't have any pending trade proposals from other players.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Trade Proposals Sent to You ({trades.length})
        </h3>
        <div className="space-y-4">
          {trades.map((trade) => (
            <TradeProposalCard key={trade._id} trade={trade} type="incoming" />
          ))}
        </div>
      </div>
    </div>
  );
}

function OutgoingTradesTab({ trades, draftRoomId }: { trades: any[] | undefined; draftRoomId: string }) {
  if (!trades) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Outgoing Trades</h3>
          <p className="text-sm">You haven't sent any trade proposals yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Trade Proposals You Sent ({trades.length})
        </h3>
        <div className="space-y-4">
          {trades.map((trade) => (
            <TradeProposalCard key={trade._id} trade={trade} type="outgoing" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TradeProposalCard({ trade, type }: { trade: any; type: 'incoming' | 'outgoing' }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const respondToTrade = useMutation(api.playerManagement.respondToTrade);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTradeResponse = async (action: 'ACCEPT' | 'REJECT') => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    setMessage("");
    
    try {
      await respondToTrade({
        tradeId: trade._id,
        userId: session.user.id,
        action: action,
      });
      
      setMessage(`✅ Trade ${action.toLowerCase()}ed successfully!`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-sm font-medium text-gray-900">
            {type === 'incoming' ? `From: ${trade.fromUser?.name || trade.fromUser?.email || 'Unknown'}` : 
             `To: ${trade.toUser?.name || trade.toUser?.email || 'Unknown'}`}
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trade.status)}`}>
            {trade.status}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {new Date(trade.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {type === 'incoming' ? 'You would give:' : 'You offered:'}
          </h4>
          <div className="space-y-1">
            {(type === 'incoming' ? trade.requestedTeams : trade.offeredTeams)?.map((team: any) => (
              <div key={team.teamId} className="text-sm text-gray-600">
                {team.teamNumber} - {team.name}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {type === 'incoming' ? 'You would receive:' : 'You requested:'}
          </h4>
          <div className="space-y-1">
            {(type === 'incoming' ? trade.offeredTeams : trade.requestedTeams)?.map((team: any) => (
              <div key={team.teamId} className="text-sm text-gray-600">
                {team.teamNumber} - {team.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {trade.message && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Message:</h4>
          <p className="text-sm text-gray-600 italic">"{trade.message}"</p>
        </div>
      )}

      {message && (
        <div className={`mb-3 rounded-md p-3 ${
          message.startsWith('✅') 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {type === 'incoming' && trade.status === 'PENDING' && (
        <div className="flex space-x-3">
          <button 
            onClick={() => handleTradeResponse('ACCEPT')}
            disabled={loading}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Accept Trade'}
          </button>
          <button 
            onClick={() => handleTradeResponse('REJECT')}
            disabled={loading}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Reject Trade'}
          </button>
        </div>
      )}

      {type === 'outgoing' && trade.status === 'PENDING' && (
        <div className="flex justify-end">
          <button 
            disabled={true}
            className="bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed"
            title="Cancel functionality coming soon"
          >
            Cancel Trade
          </button>
        </div>
      )}
    </div>
  );
} 