import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface WSMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: WSMessage) => void;
  lastMessage: WSMessage | null;
  onlineUsers: Array<{ userId: string; username: string; nickname: string }>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket必须在WebSocketProvider内使用');
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userId: string; username: string; nickname: string }>>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) return;

    const currentUser = JSON.parse(currentUserStr);
    
    function connect() {
      // 连接WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket全局连接已建立');
        setIsConnected(true);
        
        // 发送身份验证
        socket.send(JSON.stringify({
          type: 'auth',
          userId: currentUser.id,
          username: currentUser.username,
          nickname: currentUser.nickname || currentUser.name
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          if (data.type === 'online_users') {
            setOnlineUsers(data.users);
          }

          if (data.type === 'user_joined') {
            setOnlineUsers(prev => {
              const exists = prev.some(u => u.userId === data.user.userId);
              if (exists) return prev;
              return [...prev, data.user];
            });
          }

          if (data.type === 'user_left') {
            setOnlineUsers(prev => prev.filter(u => u.userId !== data.user.userId));
          }
        } catch (error) {
          console.error('处理WebSocket消息失败:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket已断开，不自动重连');
        setIsConnected(false);
      };

      socket.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setIsConnected(false);
      };

      wsRef.current = socket;
    }

    connect();

    // 清理函数
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = (message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket未连接，无法发送消息');
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, lastMessage, onlineUsers }}>
      {children}
    </WebSocketContext.Provider>
  );
}
