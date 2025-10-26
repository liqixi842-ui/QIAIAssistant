import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Logo from '@/components/Logo';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const motivationalQuotes = [
  "AI 将为你分析数据，激发行动成长。",
  "今天的坚持，是明天的荣耀。",
  "行动让客户靠近成功。",
  "今天多一次沟通，客户就多一点信任。",
  "数据洞察，精准行动。"
];

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [quote, setQuote] = useState(motivationalQuotes[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setQuote(randomQuote);

    const interval = setInterval(() => {
      const newQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
      setQuote(newQuote);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }

      // 保存用户信息到 localStorage
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      toast({
        title: "登录成功",
        description: `欢迎回来，${data.user.name}！`,
      });

      setLocation('/dashboard');
    } catch (error) {
      toast({
        title: "登录失败",
        description: error instanceof Error ? error.message : '用户名或密码错误',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-gradient-bg p-4 pt-16">
      <Card className="w-full max-w-md p-8 space-y-6 login-card-shadow">
        <div className="flex flex-col items-center space-y-5">
          <Logo size="xl" textWeight="normal" />
          <div className="text-center space-y-3 w-full">
            <h1 className="text-2xl font-bold text-[#2E2E2E] dark:text-foreground leading-tight">
              欢迎使用「动<span className="text-primary">QI</span>来」智能CRM系统
              <br />
              <span className="text-primary">未来的销冠！</span>
            </h1>
            <p 
              className="text-sm font-normal italic" 
              style={{ 
                color: '#7A7A7A',
                letterSpacing: '0.02em'
              }}
            >
              {quote}
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-username"
              className="h-11"
              required
            />
            <Input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-password"
              className="h-11"
              required
            />
          </div>
          
          <div className="pt-2" />
          
          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1 login-button-hover font-medium"
              data-testid="button-login"
              disabled={isLoading}
            >
              {isLoading ? "登录中..." : "立即行动"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 login-button-hover font-medium"
              onClick={() => setLocation('/register')}
              data-testid="button-register"
              disabled={isLoading}
            >
              加入我们
            </Button>
          </div>
        </form>

        <div className="pt-2 border-t border-border/50">
          <p 
            className="text-center text-xs font-normal"
            style={{ color: '#BFAE7E' }}
          >
            © 2025 动QI来智能CRM
          </p>
        </div>
      </Card>
    </div>
  );
}
