import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, Plus, Users, Wifi, WifiOff, ArrowDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// 类型定义
interface ChatRoom {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  participants: Array<{
    userId: string;
    role: string;
    user: {
      id: string;
      name: string;
      nickname: string | null;
      username: string;
      position: string | null;
      team: string | null;
    } | null;
  }>;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

interface SearchUser {
  id: string;
  username: string;
  name: string;
  nickname: string | null;
  position: string | null;
  team: string | null;
  role: string;
}

export default function ChatPage() {
  const { toast } = useToast();
  const { isConnected, sendMessage, lastMessage, onlineUsers } = useWebSocket();
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const currentUserStr = localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isUserAtBottomRef = useRef(true);

  // 获取聊天列表
  const { data: chatsData, isLoading: chatsLoading } = useQuery<{ success: boolean; data: ChatRoom[] }>({
    queryKey: ['/api/chats'],
    refetchInterval: 5000, // 每5秒刷新一次
  });

  const chats = chatsData?.data || [];
  const selectedChat = chats.find(c => c.id === selectedChatId);

  // 获取当前聊天室的消息
  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ success: boolean; data: Message[] }>({
    queryKey: ['/api/chat/messages', selectedChatId],
    queryFn: selectedChatId
      ? () => fetch(`/api/chat/messages?chatId=${selectedChatId}`).then(r => r.json())
      : undefined,
    enabled: !!selectedChatId,
  });

  // 搜索用户
  const { data: searchUsersData } = useQuery<{ success: boolean; data: SearchUser[] }>({
    queryKey: ['/api/search/users', userSearchTerm],
    queryFn: userSearchTerm
      ? () => fetch(`/api/search/users?keyword=${encodeURIComponent(userSearchTerm)}`).then(r => r.json())
      : undefined,
    enabled: !!userSearchTerm && userSearchTerm.length > 0,
  });

  const searchUsers = searchUsersData?.data || [];

  // 创建群聊
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; memberIds: string[] }) => {
      const response = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      toast({ title: '成功', description: '群组创建成功' });
    },
    onError: () => {
      toast({ title: '错误', description: '创建群组失败', variant: 'destructive' });
    },
  });

  // 创建私聊
  const createDirectChatMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      setSelectedChatId(data.data.id);
      setShowUserList(false);
      toast({ title: '成功', description: '对话已创建' });
    },
    onError: () => {
      toast({ title: '错误', description: '创建对话失败', variant: 'destructive' });
    },
  });

  // 加载消息历史
  useEffect(() => {
    if (messagesData?.data) {
      setMessages(messagesData.data);
    }
  }, [messagesData]);

  // 处理WebSocket消息
  useEffect(() => {
    if (lastMessage?.type === 'chat' && lastMessage.chatId) {
      const newMessage: Message = {
        id: lastMessage.messageId || Date.now().toString(),
        chatId: lastMessage.chatId,
        senderId: lastMessage.senderId || '',
        senderName: lastMessage.sender,
        content: lastMessage.content,
        timestamp: new Date().toISOString(),
      };

      // 只添加属于当前聊天室的消息
      if (lastMessage.chatId === selectedChatId) {
        setMessages(prev => {
          // 避免重复
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }

      // 刷新聊天列表（更新最后一条消息）
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    }
  }, [lastMessage, selectedChatId]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    if (!isUserAtBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听滚动
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      isUserAtBottomRef.current = isAtBottom;
      setShowScrollButton(!isAtBottom && messages.length > 0);
    };

    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // 发送消息
  const handleSendMessage = () => {
    if (!message.trim() || !selectedChatId) return;

    sendMessage({
      type: 'chat',
      chatId: selectedChatId,
      content: message.trim(),
      messageId: `${Date.now()}-${Math.random()}`,
    });

    setMessage('');
  };

  // 创建群聊
  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      toast({ title: '错误', description: '请输入群组名称并选择成员', variant: 'destructive' });
      return;
    }

    createGroupMutation.mutate({
      name: groupName.trim(),
      memberIds: selectedMembers,
    });
  };

  // 开始私聊
  const handleStartDirectChat = (userId: string) => {
    createDirectChatMutation.mutate(userId);
  };

  // 切换成员选择
  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 过滤聊天列表
  const filteredChats = chats.filter(chat =>
    chat.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  return (
    <div className="flex h-full gap-4 p-4" data-testid="page-chat">
      {/* 左侧：联系人列表 */}
      <Card className="w-80 flex flex-col p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" data-testid="text-chat-title">消息</h2>
            <div className="flex gap-2">
              <Dialog open={showUserList} onOpenChange={setShowUserList}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-new-chat">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新建对话</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="搜索用户..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      data-testid="input-search-users"
                    />
                    <ScrollArea className="h-96">
                      {searchUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 hover-elevate active-elevate-2 rounded cursor-pointer"
                          onClick={() => handleStartDirectChat(user.id)}
                          data-testid={`user-item-${user.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {(user.nickname || user.name).charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.nickname || user.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {user.position} {user.team && `· ${user.team}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-create-group">
                    <Users className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>创建群聊</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>群组名称</Label>
                      <Input
                        placeholder="输入群组名称"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        data-testid="input-group-name"
                      />
                    </div>
                    <div>
                      <Label>搜索成员</Label>
                      <Input
                        placeholder="搜索用户..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        data-testid="input-search-members"
                      />
                    </div>
                    <ScrollArea className="h-64">
                      {searchUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 hover-elevate rounded"
                          data-testid={`member-item-${user.id}`}
                        >
                          <Checkbox
                            checked={selectedMembers.includes(user.id)}
                            onCheckedChange={() => toggleMemberSelection(user.id)}
                            data-testid={`checkbox-member-${user.id}`}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {(user.nickname || user.name).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.nickname || user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.position}
                            </div>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={!groupName.trim() || selectedMembers.length === 0}
                      className="w-full"
                      data-testid="button-submit-group"
                    >
                      创建群组 ({selectedMembers.length}人)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索对话..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-chats"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {chatsLoading ? (
            <div className="p-4 text-center text-muted-foreground">加载中...</div>
          ) : filteredChats.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">暂无对话</div>
          ) : (
            <div className="p-2">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover-elevate active-elevate-2 ${
                    selectedChatId === chat.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedChatId(chat.id)}
                  data-testid={`chat-item-${chat.id}`}
                >
                  <Avatar>
                    <AvatarFallback>
                      {chat.type === 'group' ? <Users className="h-4 w-4" /> : chat.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{chat.name || '未命名对话'}</span>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage?.content || '暂无消息'}
                      </span>
                      {chat.unreadCount > 0 && (
                        <Badge variant="default" className="ml-2">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* 右侧：聊天窗口 */}
      <Card className="flex-1 flex flex-col p-0">
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>选择一个对话开始聊天</p>
            </div>
          </div>
        ) : (
          <>
            {/* 聊天头部 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedChat.type === 'group' ? <Users className="h-4 w-4" /> : selectedChat.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold" data-testid="text-chat-name">
                    {selectedChat.name || '未命名对话'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedChat.type === 'group'
                      ? `${selectedChat.participants.length} 位成员`
                      : selectedChat.participants.find(p => p.userId !== currentUser?.id)?.user?.position || ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge variant="outline" className="gap-1" data-testid="badge-connected">
                    <Wifi className="h-3 w-3" />
                    在线
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1" data-testid="badge-disconnected">
                    <WifiOff className="h-3 w-3" />
                    离线
                  </Badge>
                )}
              </div>
            </div>

            {/* 消息列表 */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {messagesLoading ? (
                <div className="text-center text-muted-foreground">加载消息中...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground">暂无消息</div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          {!isMine && (
                            <span className="text-xs text-muted-foreground px-2">
                              {msg.senderName}
                            </span>
                          )}
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isMine
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-xs text-muted-foreground px-2">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* 回到底部按钮 */}
            {showScrollButton && (
              <Button
                size="icon"
                variant="outline"
                className="absolute bottom-24 right-8 rounded-full shadow-lg"
                onClick={() => {
                  isUserAtBottomRef.current = true;
                  scrollToBottom();
                }}
                data-testid="button-scroll-bottom"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}

            {/* 输入框 */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="输入消息..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={!isConnected}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || !isConnected}
                  data-testid="button-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
