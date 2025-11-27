import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, Plus, Users, Wifi, WifiOff, ArrowDown, Info } from 'lucide-react';
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
  const [showMemberList, setShowMemberList] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('');
  const [selectedAddMembers, setSelectedAddMembers] = useState<string[]>([]);
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

  // 搜索消息
  const { data: searchMessagesData } = useQuery<{ success: boolean; data: Message[] }>({
    queryKey: ['/api/search/messages', searchTerm],
    queryFn: searchTerm
      ? () => fetch(`/api/search/messages?keyword=${encodeURIComponent(searchTerm)}`).then(r => r.json())
      : undefined,
    enabled: !!searchTerm && searchTerm.length > 0,
  });

  const searchMessages = searchMessagesData?.data || [];

  // 搜索用户（用于创建群聊）- 默认显示所有用户，支持搜索筛选
  const { data: searchUsersData, isLoading: searchUsersLoading } = useQuery<{ success: boolean; data: SearchUser[] }>({
    queryKey: ['/api/search/users', userSearchTerm],
    queryFn: () => fetch(`/api/search/users?keyword=${encodeURIComponent(userSearchTerm || '')}`).then(r => r.json()),
    enabled: showUserList || showCreateGroup, // 打开对话框时就加载用户列表
  });

  const searchUsers = searchUsersData?.data || [];

  // 搜索用户（用于添加成员）- 默认显示所有用户，支持搜索筛选
  const { data: addMemberSearchData, isLoading: addMemberLoading } = useQuery<{ success: boolean; data: SearchUser[] }>({
    queryKey: ['/api/search/users/add-member', addMemberSearchTerm],
    queryFn: () => fetch(`/api/search/users?keyword=${encodeURIComponent(addMemberSearchTerm || '')}`).then(r => r.json()),
    enabled: showAddMember, // 打开添加成员对话框时加载
  });

  // 过滤掉已在群聊中的成员
  const addMemberSearchUsers = (addMemberSearchData?.data || []).filter(user => 
    !selectedChat?.participants.some(p => p.userId === user.id)
  );

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

  // 添加成员到群聊
  const addMembersMutation = useMutation({
    mutationFn: async ({ chatId, userIds }: { chatId: string; userIds: string[] }) => {
      return await apiRequest('POST', `/api/chats/${chatId}/participants`, { userIds });
    },
    onSuccess: async () => {
      // 刷新聊天列表并等待完成，确保成员列表更新
      await queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      await queryClient.refetchQueries({ queryKey: ['/api/chats'] });
      
      setShowAddMember(false);
      setSelectedAddMembers([]);
      setAddMemberSearchTerm('');
      toast({ title: '成功', description: '成员添加成功' });
    },
    onError: (error: Error) => {
      toast({ title: '错误', description: error.message || '添加成员失败', variant: 'destructive' });
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

  // 打开聊天室时标记已读
  useEffect(() => {
    if (selectedChatId) {
      // 标记当前聊天室为已读
      apiRequest('PATCH', `/api/chats/${selectedChatId}/read`, {})
        .then(() => {
          // 刷新聊天列表以更新未读计数
          queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
        })
        .catch(error => {
          console.error('标记已读失败:', error);
        });
    }
  }, [selectedChatId]);

  // 发送消息mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      return await apiRequest('POST', '/api/chat/messages', { chatId, content });
    },
    onSuccess: () => {
      // 刷新消息列表
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
    onError: (error: any) => {
      toast({
        title: '发送失败',
        description: error.message || '发送消息时出错',
        variant: 'destructive'
      });
    }
  });

  // 发送消息
  const handleSendMessage = () => {
    if (!message.trim() || !selectedChatId) return;

    // 通过API发送消息（会保存到数据库并通过WebSocket广播）
    sendMessageMutation.mutate({
      chatId: selectedChatId,
      content: message.trim()
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

  // 切换添加成员选择
  const toggleAddMemberSelection = (userId: string) => {
    setSelectedAddMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 处理添加成员
  const handleAddMembers = () => {
    if (!selectedChatId || selectedAddMembers.length === 0) {
      toast({ title: '错误', description: '请选择要添加的成员', variant: 'destructive' });
      return;
    }
    
    addMembersMutation.mutate({
      chatId: selectedChatId,
      userIds: selectedAddMembers
    });
  };

  // 过滤聊天列表 - 支持搜索消息内容
  const filteredChats = (() => {
    if (!searchTerm) {
      // 没有搜索词，显示所有聊天室
      return chats;
    }

    // 有搜索词时：
    // 1. 按聊天室名称匹配
    const nameMatches = chats.filter(chat =>
      chat.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. 按消息内容匹配（从搜索结果中获取聊天室ID）
    const messageMatchChatIds = new Set(searchMessages.map(m => m.chatId));
    const messageMatches = chats.filter(chat => messageMatchChatIds.has(chat.id));

    // 合并结果并去重
    const allMatches = [...nameMatches];
    messageMatches.forEach(chat => {
      if (!allMatches.find(c => c.id === chat.id)) {
        allMatches.push(chat);
      }
    });

    return allMatches;
  })();

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
                      placeholder="搜索用户（可按昵称、姓名、职位、团队筛选）..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      data-testid="input-search-users"
                    />
                    <div className="text-sm text-muted-foreground">
                      {searchUsersLoading ? '加载中...' : `共 ${searchUsers.length} 位用户`}
                    </div>
                    <ScrollArea className="h-96">
                      {searchUsersLoading ? (
                        <div className="flex items-center justify-center h-20 text-muted-foreground">
                          加载用户列表...
                        </div>
                      ) : searchUsers.length === 0 ? (
                        <div className="flex items-center justify-center h-20 text-muted-foreground">
                          没有找到用户
                        </div>
                      ) : (
                        searchUsers.map((user) => (
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
                        ))
                      )}
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
                      <Label>搜索成员（可按昵称、姓名、职位、团队筛选）</Label>
                      <Input
                        placeholder="输入关键词筛选..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        data-testid="input-search-members"
                      />
                      <div className="text-sm text-muted-foreground mt-1">
                        {searchUsersLoading ? '加载中...' : `共 ${searchUsers.length} 位用户可选`}
                      </div>
                    </div>
                    <ScrollArea className="h-64">
                      {searchUsersLoading ? (
                        <div className="flex items-center justify-center h-20 text-muted-foreground">
                          加载用户列表...
                        </div>
                      ) : searchUsers.length === 0 ? (
                        <div className="flex items-center justify-center h-20 text-muted-foreground">
                          没有找到用户
                        </div>
                      ) : (
                        searchUsers.map((user) => (
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
                                {user.position} {user.team && `· ${user.team}`}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
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
              placeholder="搜索对话或消息..."
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
            <div className="p-4 text-center text-muted-foreground">
              {searchTerm ? '没有找到匹配的对话或消息' : '暂无对话'}
            </div>
          ) : (
            <div className="p-2">
              {filteredChats.map((chat) => {
                // 查找该聊天室中匹配的消息
                const matchedMessages = searchMessages.filter(m => m.chatId === chat.id);
                const hasMatchedMessage = matchedMessages.length > 0;
                
                return (
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
                          {hasMatchedMessage 
                            ? `找到 ${matchedMessages.length} 条匹配消息`
                            : (chat.lastMessage?.content || '暂无消息')
                          }
                        </span>
                        {chat.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                {selectedChat.type === 'group' && (
                  <Dialog open={showMemberList} onOpenChange={setShowMemberList}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid="button-member-list">
                        <Info className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>群成员 ({selectedChat.participants.length}人)</DialogTitle>
                      </DialogHeader>
                      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                        <DialogTrigger asChild>
                          <Button className="w-full mb-4" variant="outline" data-testid="button-add-member-trigger">
                            <Plus className="h-4 w-4 mr-2" />
                            添加成员
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>添加成员到群聊</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>搜索用户</Label>
                              <Input
                                placeholder="搜索用户..."
                                value={addMemberSearchTerm}
                                onChange={(e) => setAddMemberSearchTerm(e.target.value)}
                                data-testid="input-search-add-members"
                              />
                            </div>
                            <ScrollArea className="h-64">
                              {addMemberSearchUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center gap-2 p-2 hover-elevate rounded"
                                  data-testid={`add-member-item-${user.id}`}
                                >
                                  <Checkbox
                                    checked={selectedAddMembers.includes(user.id)}
                                    onCheckedChange={() => toggleAddMemberSelection(user.id)}
                                    data-testid={`checkbox-add-member-${user.id}`}
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
                              onClick={handleAddMembers}
                              disabled={selectedAddMembers.length === 0 || addMembersMutation.isPending}
                              className="w-full"
                              data-testid="button-confirm-add-members"
                            >
                              {addMembersMutation.isPending ? '添加中...' : `添加成员 (${selectedAddMembers.length}人)`}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <ScrollArea className="h-96">
                        <div className="space-y-2">
                          {selectedChat.participants.map((participant) => (
                            <div
                              key={participant.userId}
                              className="flex items-center gap-3 p-3 rounded-lg hover-elevate"
                              data-testid={`member-${participant.userId}`}
                            >
                              <Avatar>
                                <AvatarFallback>
                                  {participant.user ? (participant.user.nickname || participant.user.name).charAt(0) : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {participant.user ? (participant.user.nickname || participant.user.name) : '未知用户'}
                                  {participant.role === 'owner' && (
                                    <Badge variant="default" className="ml-2">群主</Badge>
                                  )}
                                  {participant.role === 'admin' && (
                                    <Badge variant="secondary" className="ml-2">管理员</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {participant.user?.position} {participant.user?.team && `· ${participant.user.team}`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
                
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
