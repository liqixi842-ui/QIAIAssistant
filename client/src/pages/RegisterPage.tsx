import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Logo from '@/components/Logo';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Supervisor {
  id: string;
  nickname: string;
  role: string;
}

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

  // 获取可选上级列表（公开API，无需登录）
  const { data: supervisorsData } = useQuery<{ success: boolean; data: Supervisor[] }>({
    queryKey: ['/api/auth/supervisors'],
  });

  const allSupervisors = supervisorsData?.data || [];
  
  // 根据选择的角色筛选可选的上级
  const getAvailableSupervisors = () => {
    if (!formData.role) return [];
    
    if (formData.role === '业务') {
      // 业务员的上级必须是经理
      return allSupervisors.filter(u => u.role === '经理');
    } else if (formData.role === '经理') {
      // 经理的上级必须是总监
      return allSupervisors.filter(u => u.role === '总监');
    } else if (formData.role === '总监' || formData.role === '后勤') {
      // 总监和后勤的上级必须是主管
      return allSupervisors.filter(u => u.role === '主管');
    }
    
    return [];
  };

  const availableSupervisors = getAvailableSupervisors();
  
  // 当角色改变时，清空已选的上级
  useEffect(() => {
    setFormData(prev => ({ ...prev, supervisorId: '' }));
  }, [formData.role]);

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
    
    // 验证用户名格式：只允许拼音（英文字母）和数字
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast({
        title: "注册失败",
        description: "用户名只能包含英文字母和数字，例如：zhangsan、lisi123",
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
          <div className="space-y-1">
            <Input
              type="text"
              placeholder="用户名（拼音或拼音+数字）*"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              data-testid="input-username"
              required
            />
            <p className="text-xs text-muted-foreground">只允许英文字母和数字，例如：zhangsan、lisi123</p>
          </div>
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
            onValueChange={(value) => setFormData({ ...formData, role: value, supervisorId: '' })}
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
          <div className="space-y-1">
            <Select
              value={formData.supervisorId}
              onValueChange={(value) => setFormData({ ...formData, supervisorId: value })}
              disabled={!formData.role || availableSupervisors.length === 0}
              required
            >
              <SelectTrigger data-testid="select-supervisor">
                <SelectValue placeholder={
                  !formData.role ? '请先选择职位' :
                  availableSupervisors.length === 0 ? '暂无可选上级' :
                  formData.role === '业务' ? '选择您的经理 *' :
                  formData.role === '经理' ? '选择您的总监 *' :
                  formData.role === '总监' || formData.role === '后勤' ? '选择主管 *' :
                  '选择上级 *'
                } />
              </SelectTrigger>
              <SelectContent>
                {availableSupervisors.map((supervisor: Supervisor) => (
                  <SelectItem key={supervisor.id} value={supervisor.id}>
                    {supervisor.nickname} ({supervisor.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.role === '业务' && (
              <p className="text-xs text-muted-foreground">从列表中选择您的经理</p>
            )}
            {formData.role === '经理' && (
              <p className="text-xs text-muted-foreground">从列表中选择您的总监</p>
            )}
            {(formData.role === '总监' || formData.role === '后勤') && (
              <p className="text-xs text-muted-foreground">从列表中选择主管</p>
            )}
          </div>
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
