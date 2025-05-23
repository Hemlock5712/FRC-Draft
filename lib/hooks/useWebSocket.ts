import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface DraftUpdate {
  type: 'PICK_MADE' | 'USER_JOINED' | 'USER_LEFT' | 'DRAFT_STARTED' | 'DRAFT_COMPLETED' | 'TURN_CHANGED';
  roomId: string;
  data?: any;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  onDraftUpdate: (callback: (update: DraftUpdate) => void) => void;
  emit: (event: string, data: any) => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const updateCallbackRef = useRef<((update: DraftUpdate) => void) | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      // First call the socket endpoint to ensure the server is set up
      await fetch('/api/socket');
      
      const newSocket = io({
        path: '/api/socket',
        addTrailingSlash: false,
      });

      newSocket.on('connect', () => {
        console.log('Connected to WebSocket server');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
        setIsConnected(false);
      });

      newSocket.on('draft-update', (update: DraftUpdate) => {
        console.log('Received draft update:', update);
        if (updateCallbackRef.current) {
          updateCallbackRef.current(update);
        }
      });

      newSocket.on('user-joined', (data: any) => {
        console.log('User joined:', data);
        if (updateCallbackRef.current) {
          updateCallbackRef.current({
            type: 'USER_JOINED',
            roomId: data.roomId,
            data
          });
        }
      });

      newSocket.on('user-left', (data: any) => {
        console.log('User left:', data);
        if (updateCallbackRef.current) {
          updateCallbackRef.current({
            type: 'USER_LEFT',
            roomId: data.roomId,
            data
          });
        }
      });

      newSocket.on('refresh-draft-state', (data: any) => {
        console.log('Refresh draft state requested:', data);
        if (updateCallbackRef.current) {
          updateCallbackRef.current({
            type: 'TURN_CHANGED',
            roomId: data.roomId,
            data: { shouldRefresh: true }
          });
        }
      });

      setSocket(newSocket);
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const joinRoom = (roomId: string) => {
    if (socket && isConnected) {
      console.log('Joining room:', roomId);
      socket.emit('join-draft-room', roomId);
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket && isConnected) {
      console.log('Leaving room:', roomId);
      socket.emit('leave-draft-room', roomId);
    }
  };

  const onDraftUpdate = (callback: (update: DraftUpdate) => void) => {
    updateCallbackRef.current = callback;
  };

  const emit = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  return {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    onDraftUpdate,
    emit,
  };
}; 