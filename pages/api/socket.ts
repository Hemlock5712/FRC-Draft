import { NextApiRequest, NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';
import { Server as SocketIOServer } from 'socket.io';

interface SocketServer extends NetServer {
  io?: SocketIOServer | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Socket.IO already running');
    res.end();
    return;
  }

  console.log('Setting up Socket.IO server...');
  
  const io = new SocketIOServer(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle joining a draft room
    socket.on('join-draft-room', (roomId: string) => {
      socket.join(`draft-${roomId}`);
      console.log(`Client ${socket.id} joined draft room ${roomId}`);
      
      // Notify others in the room that someone joined
      socket.to(`draft-${roomId}`).emit('user-joined', {
        type: 'USER_JOINED',
        roomId,
        socketId: socket.id
      });
    });

    // Handle leaving a draft room
    socket.on('leave-draft-room', (roomId: string) => {
      socket.leave(`draft-${roomId}`);
      console.log(`Client ${socket.id} left draft room ${roomId}`);
      
      // Notify others in the room that someone left
      socket.to(`draft-${roomId}`).emit('user-left', {
        type: 'USER_LEFT',
        roomId,
        socketId: socket.id
      });
    });

    // Handle draft state requests
    socket.on('request-draft-state', (roomId: string) => {
      // This will be handled by triggering a state fetch
      socket.emit('refresh-draft-state', { roomId });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  res.socket.server.io = io;
  setIO(io); // Store the instance for global access
  res.end();
}

// Export the SocketIO instance for use in other parts of the app
let ioInstance: SocketIOServer | undefined;

export const getIO = (): SocketIOServer | undefined => {
  return ioInstance;
};

export const setIO = (io: SocketIOServer) => {
  ioInstance = io;
}; 