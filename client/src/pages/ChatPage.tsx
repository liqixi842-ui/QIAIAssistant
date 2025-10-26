import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, Plus, Users, User as UserIcon, X, Wifi, WifiOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { ChatMessage } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
  isGroup?: boolean;
  members?: number;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  time: string;
  isMine: boolean;
  chatId: string; // 标识消息属于哪个对话
}

interface SystemUser {
  id: string;
  name: string;
  username: string;
  nickname: string;
  position: string;
  team?: string;
  isOnline: boolean;
}

const allSystemUsers: SystemUser[] = [
  // 主管团队
  { id: '1', name: '李主管', username: 'lzg', nickname: '老李', position: '主管', isOnline: true },
  
  // 总监团队
  { id: '2', name: '赵总监', username: 'zzj', nickname: '赵哥', position: '总监', team: '赵总监团队', isOnline: true },
  { id: '3', name: '钱总监', username: 'qzj', nickname: '钱姐', position: '总监', team: '钱总监团队', isOnline: false },
  
  // 经理层
  { id: '4', name: '王经理', username: 'wjl', nickname: '小王', position: '经理', team: '赵总监团队', isOnline: true },
  { id: '5', name: '孙经理', username: 'sjl', nickname: '老孙', position: '经理', team: '赵总监团队', isOnline: true },
  { id: '6', name: '周经理', username: 'zjl', nickname: '周周', position: '经理', team: '钱总监团队', isOnline: false },
  
  // 业务团队
  { id: '7', name: '张三', username: 'zhangsan', nickname: '小张', position: '业务', team: '王经理团队', isOnline: true },
  { id: '8', name: '李四', username: 'lisi', nickname: '阿四', position: '业务', team: '王经理团队', isOnline: true },
  { id: '9', name: '王五', username: 'wangwu', nickname: '老王', position: '业务', team: '孙经理团队', isOnline: false },
  { id: '10', name: '赵六', username: 'zhaoliu', nickname: '小赵', position: '业务', team: '孙经理团队', isOnline: true },
  { id: '11', name: '陈七', username: 'chenqi', nickname: '阿七', position: '业务', team: '周经理团队', isOnline: true },
  { id: '12', name: '刘八', username: 'liuba', nickname: '八爷', position: '后勤', isOnline: false },
  
  // 其他部门用户
  { id: '13', name: '吴九', username: 'wujiu', nickname: '小吴', position: '业务', team: '其他团队', isOnline: true },
  { id: '14', name: '郑十', username: 'zhengshi', nickname: '老郑', position: '业务', team: '其他团队', isOnline: false },
  { id: '15', name: '孙莉', username: 'sunli', nickname: 'Lily', position: '业务', team: '其他团队', isOnline: true },
];

const mockContacts: Contact[] = [
  { id: '1', name: '销售团队', lastMessage: '今天的业绩不错！', time: '10:23', unread: 3, isGroup: true, members: 8 },
  { id: '2', name: '高端客户组', lastMessage: '明天开会讨论方案', time: '昨天', isGroup: true, members: 5 },
  { id: '3', name: '张明', lastMessage: '好的，谢谢', time: '昨天', isGroup: false },
  { id: '4', name: '李华', lastMessage: '明天见', time: '周一', isGroup: false }
];

const mockMessages: Message[] = [
  { id: '1', sender: '张伟', content: '大家早上好！', time: '09:00', isMine: false, chatId: '1' },
  { id: '2', sender: '我', content: '早上好！', time: '09:01', isMine: true, chatId: '1' },
  { id: '3', sender: '李强', content: '今天的目标是多少？', time: '09:15', isMine: false, chatId: '1' },
  { id: '4', sender: '我', content: '我今天计划联系50个客户', time: '09:16', isMine: true, chatId: '1' },
  { id: '5', sender: '王丽', content: '大家加油！本周目标是200个开户', time: '09:20', isMine: false, chatId: '1' },
];

export default function ChatPage() {
  const { toast } = useToast();
  const { isConnected, sendMessage, lastMessage, onlineUsers: wsOnlineUsers } = useWebSocket();
  
  const [selectedContact, setSelectedContact] = useState<Contact>(mockContacts[0]);
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showUserList, setShowUserList] = useState(false);

  const currentUserStr = localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // 加载历史消息 - 根据选中的聊天室ID查询
  const { data: historyData } = useQuery<{ success: boolean; data: ChatMessage[] }>({
    queryKey: ['/api/chat/messages', selectedContact.id],
    queryFn: async () => {
      const response = await fetch(`/api/chat/messages?chatId=${selectedContact.id}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!currentUser && selectedContact.id === '1', // 只有团队群聊（id=1）从数据库加载
  });

  // 初始化历史消息
  useEffect(() => {
    // 只有当前选中团队群聊（id=1）且有历史数据时才应用
    if (selectedContact.id === '1' && historyData?.success && historyData.data && currentUser) {
      const loadedMessages: Message[] = historyData.data.map((msg) => ({
        id: msg.id,
        sender: msg.senderName,
        content: msg.content,
        time: new Date(msg.timestamp).toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        isMine: msg.senderId === currentUser.id,
        chatId: msg.chatId || selectedContact.id // 使用数据库中的chatId
      }));
      setMessages(loadedMessages);
    } else {
      // 其他聊天室清空历史记录（暂无持久化）
      setMessages([]);
    }
  }, [historyData, currentUser, selectedContact.id]);

  // 监听WebSocket消息
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'user_joined') {
      toast({
        title: "用户上线",
        description: `${lastMessage.user.nickname} 加入了聊天`,
      });
    }

    if (lastMessage.type === 'user_left') {
      toast({
        title: "用户离线",
        description: `${lastMessage.user.nickname} 离开了聊天`,
      });
    }

    if (lastMessage.type === 'chat' && currentUser) {
      // 接收新消息 - 添加去重逻辑，并使用服务器返回的chatId
      const messageChatId = lastMessage.chatId || '1'; // 默认为团队群聊
      
      const newMessage: Message = {
        id: lastMessage.messageId,
        sender: lastMessage.sender,
        content: lastMessage.content,
        time: new Date(lastMessage.timestamp).toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        isMine: lastMessage.senderId === currentUser.id,
        chatId: messageChatId
      };

      // 只在消息属于当前选中的聊天时才添加到列表
      if (messageChatId === selectedContact.id) {
        // 去重：检查消息ID是否已存在
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }
    }
  }, [lastMessage]);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = allSystemUsers.filter(user =>
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.nickname.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.position.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (user.team && user.team.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  const handleSend = () => {
    if (message.trim() && isConnected) {
      // 只允许在团队群聊（id=1）发送消息，其他聊天室提示功能开发中
      if (selectedContact.id !== '1') {
        toast({
          title: "提示",
          description: "此对话功能正在开发中，请使用销售团队群聊",
          variant: "default"
        });
        return;
      }

      const messageId = Date.now().toString();
      
      // 通过WebSocket发送消息，包含chatId（服务器会广播给所有人）
      sendMessage({
        type: 'chat',
        chatId: selectedContact.id,
        messageId,
        content: message
      });

      // 清空输入框，不立即添加消息（等待服务器广播）
      setMessage('');
    } else if (!isConnected) {
      toast({
        title: "发送失败",
        description: "未连接到服务器",
        variant: "destructive"
      });
    }
  };

  const handleCreateGroup = () => {
    console.log('Creating group:', groupName, 'with members:', selectedMembers);
    setShowCreateGroup(false);
    setGroupName('');
    setSelectedMembers([]);
  };

  const handleMemberSelect = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleStartPrivateChat = (user: SystemUser) => {
    // 检查是否已经有与该用户的聊天
    const existingContact = contacts.find(c => c.id === `user-${user.id}` && !c.isGroup);
    
    if (existingContact) {
      // 如果已经存在，直接切换到该聊天
      setSelectedContact(existingContact);
    } else {
      // 创建新的私聊会话
      const newContact: Contact = {
        id: `user-${user.id}`,
        name: `${user.name}（${user.nickname}）`,
        lastMessage: '开始聊天',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        isGroup: false
      };
      
      setContacts(prev => [newContact, ...prev]);
      setSelectedContact(newContact);
      // 注意：不清空messages，保留团队聊天历史
    }
    
    setShowUserList(false);
    console.log('Starting private chat with:', user.name, user.username, user.nickname);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">团队群聊</h1>
          <Badge variant={isConnected ? "default" : "destructive"} data-testid="badge-connection-status">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                已连接
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                断开
              </>
            )}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Dialog open={showUserList} onOpenChange={setShowUserList}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-find-user">
                <Search className="h-4 w-4 mr-2" />
                找人
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>查找用户</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="输入姓名、用户名或花名..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-user"
                  />
                </div>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer"
                        onClick={() => handleStartPrivateChat(user)}
                        data-testid={`user-${user.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarFallback>{user.name[0]}</AvatarFallback>
                            </Avatar>
                            {user.isOnline && (
                              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              @{user.username} · {user.nickname} · {user.position}
                              {user.team && ` · ${user.team}`}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-group">
                <Plus className="h-4 w-4 mr-2" />
                创建群聊
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新群聊</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>群聊名称</Label>
                  <Input
                    placeholder="请输入群聊名称"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    data-testid="input-group-name"
                  />
                </div>
                <div>
                  <Label>选择成员 ({selectedMembers.length} 人)</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="输入姓名、用户名或花名..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-group-member"
                    />
                  </div>
                </div>
                <ScrollArea className="h-64 border rounded-md p-2">
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                        data-testid={`checkbox-user-${user.id}`}
                      >
                        <Checkbox
                          checked={selectedMembers.includes(user.id)}
                          onCheckedChange={() => handleMemberSelect(user.id)}
                        />
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                          </Avatar>
                          {user.isOnline && (
                            <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.name}（{user.nickname}）</p>
                          <p className="text-xs text-muted-foreground">@{user.username} · {user.position}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedMembers.length > 0 && (
                  <div className="border rounded-md p-2">
                    <p className="text-sm text-muted-foreground mb-2">已选择:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMembers.map((memberId) => {
                        const user = allSystemUsers.find(u => u.id === memberId);
                        return (
                          <Badge key={memberId} variant="secondary">
                            {user?.name}（{user?.nickname}）
                            <button
                              onClick={() => handleMemberSelect(memberId)}
                              className="ml-1 hover-elevate"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={handleCreateGroup}
                  disabled={!groupName || selectedMembers.length === 0}
                  data-testid="button-confirm-create-group"
                >
                  创建群聊
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        <Card className="p-4 space-y-4 h-full flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索聊天..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-chat"
            />
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-3 rounded-md cursor-pointer hover-elevate ${
                    selectedContact.id === contact.id ? 'bg-accent' : ''
                  }`}
                  data-testid={`contact-${contact.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {contact.isGroup ? <Users className="h-4 w-4" /> : contact.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{contact.name}</p>
                          {contact.isGroup && (
                            <Badge variant="outline" className="text-xs">
                              {contact.members}人
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{contact.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                    </div>
                    {contact.unread && (
                      <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {contact.unread}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="lg:col-span-2 p-4 flex flex-col">
          <div className="border-b pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{selectedContact.name}</h3>
              {selectedContact.isGroup && (
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {selectedContact.members}人
                </Badge>
              )}
            </div>
            {selectedContact.isGroup && (
              <Button variant="outline" size="sm" data-testid="button-group-info">
                群成员
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 mb-4">
            <div className="space-y-4">
              {selectedContact.id === '1' ? (
                messages.filter(msg => msg.chatId === selectedContact.id).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] space-y-1`}>
                      {!msg.isMine && selectedContact.isGroup && (
                        <p className="text-xs text-muted-foreground">{msg.sender}</p>
                      )}
                      <div
                        className={`p-3 rounded-md ${
                          msg.isMine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{msg.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">此对话功能正在开发中，当前仅支持团队群聊</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Input
              placeholder={selectedContact.id === '1' ? "输入消息..." : "此对话功能开发中..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={selectedContact.id !== '1'}
              data-testid="input-message"
            />
            <Button 
              onClick={handleSend} 
              disabled={selectedContact.id !== '1'}
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
