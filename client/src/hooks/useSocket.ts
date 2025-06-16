import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export const useSocket = (): Socket | null => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: token,
      },
    });

    socketRef.current.on('connect', () => {
      console.log('Socket conectado con ID:', socketRef.current?.id);
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket desconectado.');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return socketRef.current;
};