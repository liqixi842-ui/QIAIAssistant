import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Logo from '@/components/Logo';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: '',
    role: '',
    supervisorId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 严格验证所有必填字段
    if (!formData.username || !formData.password || !formData.nickname || !formData.role || !formData.supervisorId) {
      toast({
        title: "注册失败",
        description: "请填写所有必填字段（用户名、密码、花名、职位、上级ID）",
        variant: "destructive"
      });
      return;
    }
    
    // 禁止注册主管角色
    if (formData.role === '主管') {
      toast({
        title: "注册失败",
        description: "主管账号不可注册，请联系管理员。",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.nickname, // 真实姓名使用花名
          nickname: formData.nickname,
          role: formData.role,
          supervisorId: formData.supervisorId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '注册失败');
      }

      toast({
        title: "注册成功",
        description: "欢迎加入动QI来团队！",
      });
      
      setTimeout(() => {
        setLocation('/login');
      }, 1500);
    } catch (error) {
      toast({
        title: "注册失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Logo size="md" />
          <h1 className="text-2xl font-bold">加入动「QI」来</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="用户名 *"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            data-testid="input-username"
            required
          />
          <Input
            type="password"
            placeholder="密码 *"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            data-testid="input-password"
            required
          />
          <Input
            type="text"
            placeholder="花名 *"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
            data-testid="input-nickname"
            required
          />
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value })}
            required
          >
            <SelectTrigger data-testid="select-role">
              <SelectValue placeholder="选择职位 *" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="总监">总监</SelectItem>
              <SelectItem value="经理">经理</SelectItem>
              <SelectItem value="业务">业务</SelectItem>
              <SelectItem value="后勤">后勤</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="上级ID *（填写您的直属上级ID，总监填7）"
            value={formData.supervisorId}
            onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
            data-testid="input-supervisor-id"
            required
          />
          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1"
              data-testid="button-submit"
            >
              立即加入
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setLocation('/login')}
              data-testid="button-back"
            >
              返回登录
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
