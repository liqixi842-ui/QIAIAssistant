import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, Plus, X, MessageSquare, Wifi, WifiOff, Loader2, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  isLoading: boolean;
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export default function AIChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: '新对话 1',
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: '你好！我是动QI来智能助手。我可以帮你生成话术、分析客户、提供销售建议。有什么我可以帮助你的吗？'
        }
      ],
      isLoading: false
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState('1');
  const [input, setInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: `新对话 ${sessions.length + 1}`,
      messages: [
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '你好！我是动QI来智能助手。我可以帮你生成话术、分析客户、提供销售建议。有什么我可以帮助你的吗？'
        }
      ],
      isLoading: false
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (sessions.length === 1) {
      // 至少保留一个会话
      return;
    }
    
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    
    // 如果删除的是当前会话，切换到第一个
    if (activeSessionId === sessionId) {
      setActiveSessionId(newSessions[0].id);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    setConnectionMessage('正在测试AI连接...');

    try {
      const response = await fetch('/api/ai/test');
      const data = await response.json();

      if (response.ok && data.success) {
        setConnectionStatus('success');
        setConnectionMessage(`✅ 连接成功！AI服务正常运行`);
      } else {
        setConnectionStatus('error');
        setConnectionMessage(`❌ 连接失败：${data.message || data.error || '未知错误'}`);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(`❌ 连接失败：${error instanceof Error ? error.message : '网络错误或AI服务未配置'}`);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSession) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    // 更新当前会话的消息和加载状态
    setSessions(sessions.map(session => {
      if (session.id === activeSessionId) {
        return {
          ...session,
          messages: [...session.messages, userMessage],
          isLoading: true
        };
      }
      return session;
    }));

    setInput('');

    try {
      // 调用真实的AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...activeSession.messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'AI服务调用失败');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message
      };

      setSessions(sessions.map(session => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: [...session.messages, userMessage, aiMessage],
            isLoading: false
          };
        }
        return session;
      }));
    } catch (error) {
      console.error('AI调用失败:', error);
      
      // 显示错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `抱歉，AI服务暂时不可用：${error.message}。请检查AI配置或稍后再试。` 
          : '抱歉，AI服务暂时不可用，请稍后再试。'
      };

      setSessions(sessions.map(session => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: [...session.messages, userMessage, errorMessage],
            isLoading: false
          };
        }
        return session;
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">动起智慧</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleTestConnection}
            disabled={connectionStatus === 'testing'}
            data-testid="button-test-connection"
          >
            {connectionStatus === 'testing' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {connectionStatus === 'success' && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
            {connectionStatus === 'error' && <WifiOff className="h-4 w-4 mr-2 text-red-500" />}
            {connectionStatus === 'idle' && <Wifi className="h-4 w-4 mr-2" />}
            测试AI连接
          </Button>
          <Button onClick={handleNewSession} data-testid="button-new-chat">
            <Plus className="h-4 w-4 mr-2" />
            新建对话
          </Button>
        </div>
      </div>

      {/* 连接状态提示 */}
      {connectionMessage && (
        <Card className={`p-4 ${
          connectionStatus === 'success' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
          connectionStatus === 'error' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
          'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
        }`}>
          <p className={`text-sm font-medium ${
            connectionStatus === 'success' ? 'text-green-800 dark:text-green-200' :
            connectionStatus === 'error' ? 'text-red-800 dark:text-red-200' :
            'text-blue-800 dark:text-blue-200'
          }`} data-testid="text-connection-status">
            {connectionMessage}
          </p>
          {connectionStatus === 'error' && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              请检查：1️⃣ 是否配置了环境变量（AI_API_KEY, AI_BASE_URL, AI_MODEL） 2️⃣ API密钥是否有效 3️⃣ 网络连接是否正常
            </p>
          )}
          {connectionStatus === 'success' && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              AI服务已就绪，您可以开始使用智能助手功能了！
            </p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 会话列表 */}
        <Card className="p-4 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">对话列表</h2>
          </div>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover-elevate ${
                    activeSessionId === session.id ? 'bg-primary/10 border border-primary' : 'bg-muted'
                  }`}
                  onClick={() => setActiveSessionId(session.id)}
                  data-testid={`session-${session.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.messages.length} 条消息
                    </p>
                  </div>
                  {sessions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      data-testid={`button-delete-session-${session.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* 聊天窗口 */}
        <Card className="p-6 lg:col-span-3 h-[600px] flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b">
            <h2 className="font-semibold">{activeSession?.title}</h2>
            {activeSession?.isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                AI思考中...
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 mb-4 pr-4">
            <div className="space-y-4">
              {activeSession?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-md ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {activeSession?.isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              placeholder="输入你的问题..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !activeSession?.isLoading && handleSend()}
              disabled={activeSession?.isLoading}
              data-testid="input-ai-message"
            />
            <Button 
              onClick={handleSend} 
              disabled={activeSession?.isLoading || !input.trim()} 
              data-testid="button-send-ai"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI助手可以帮你生成话术、分析客户数据、提供销售建议
          </p>
        </Card>
      </div>
    </div>
  );
}
