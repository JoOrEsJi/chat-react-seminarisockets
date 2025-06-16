import React, { useEffect, useRef, useState } from 'react';
import './Chat.css';
import { io, Socket } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import { User } from '../../types/types';

interface ChatMessage {
  id: number; 
  room: string;
  author: string;
  message: string;
  time: string;
}

interface SystemMessage {
  id: number;
  message: string;
}

type MessageEntry =
  | { type: 'chat'; content: ChatMessage }
  | { type: 'system'; content: SystemMessage };

const Chat: React.FC = () => {
  const location = useLocation();
  const user = location.state?.user as User;
  const [room, setRoom] = useState('sala1');
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageList, setMessageList] = useState<MessageEntry[]>([]); 
  const [showChat, setShowChat] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    socketRef.current = io('http://localhost:3001', {
      auth: {
        token,
      },
    });

    socketRef.current.on('receive_message', (data: ChatMessage) => {
      console.log('Mensaje recibido:', data);
      setMessageList(prev => [...prev, { type: 'chat', content: data }]);
    });

    socketRef.current.on('status', (data) => {
      console.debug('Estado recibido:', data);
      if (data.status === 'unauthorized') {
        alert('Sesión no autorizada o expirada. Serás redirigido al login.');
        window.location.href = '/';
      }
    });

    socketRef.current.on('user_status', (data: { message: string }) => {
      console.log('Mensaje de sistema recibido:', data);
      const systemMessage: SystemMessage = {
        id: Date.now(),
        message: data.message,
      };
      setMessageList(prev => [...prev, { type: 'system', content: systemMessage }]);
    });

    return () => {
      socketRef.current?.off('receive_message');
      socketRef.current?.off('status');
      socketRef.current?.off('user_status');
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messageList]);

  const joinRoom = () => {
    if (room) {
      socketRef.current?.emit('join_room', room);
      setShowChat(true);
    }
  };

  const sendMessage = async () => {
    if (currentMessage.trim() !== '') {
      const messageData: ChatMessage = {
        id: Date.now(),
        room,
        author: user.name,
        message: currentMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      await socketRef.current?.emit('send_message', messageData);
      setMessageList(prev => [...prev, { type: 'chat', content: messageData }]);
      setCurrentMessage('');
    }
  };

  return (
    <div className="chat-container">
      {!showChat ? (
        <div className="join-chat">
          <h2>Bienvenid@ al Chat, {user.name}</h2>
          <input
            type="text"
            placeholder="Nombre de la Sala..."
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Unirse a la Sala</button>
        </div>
      ) : (
        <div className="chat-box">
          <div className="chat-header">Sala: {room}</div>
          <div className="chat-body" ref={chatBodyRef}>
            {messageList.map((entry) => {
              if (entry.type === 'system') {
                return (
                  <div key={entry.content.id} className="message system-message">
                    <span>{entry.content.message}</span>
                  </div>
                );
              }
              const msg = entry.content;
              return (
                <div
                  key={msg.id}
                  className={`message ${msg.author === user.name ? 'own' : 'other'}`}
                >
                  <div className="bubble">
                    <p>{msg.message}</p>
                    <div className="meta">
                      <span>{msg.author}</span>
                      <span>{msg.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="chat-footer">
            <input
              type="text"
              placeholder="Mensaje..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;