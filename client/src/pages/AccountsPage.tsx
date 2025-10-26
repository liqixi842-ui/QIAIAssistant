import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { User, Key, Power } from 'lucide-react';

interface Account {
  id: string;
  username: string;
  nickname: string;
  position: string;
  isActive: boolean;
  customers: number;
  lastLogin: string;
}

const mockAccounts: Account[] = [
  {
    id: '1',
    username: 'zhangwei',
    nickname: '张伟',
    position: '业务',
    isActive: true,
    customers: 45,
    lastLogin: '2小时前'
  },
  {
    id: '2',
    username: 'liqiang',
    nickname: '李强',
    position: '业务',
    isActive: true,
    customers: 38,
    lastLogin: '1天前'
  },
  {
    id: '3',
    username: 'wangli',
    nickname: '王丽',
    position: '业务',
    isActive: false,
    customers: 52,
    lastLogin: '3天前'
  }
];

export default function AccountsPage() {
  const handleResetPassword = (username: string) => {
    console.log('Reset password for:', username);
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    console.log('Toggle account status:', id, !currentStatus);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">账号管理</h1>
        <Button data-testid="button-add-account">
          添加账号
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockAccounts.map((account) => (
          <Card key={account.id} className="p-4" data-testid={`account-card-${account.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{account.nickname}</h3>
                  <p className="text-sm text-muted-foreground">@{account.username}</p>
                </div>
              </div>
              <Badge variant={account.isActive ? 'default' : 'secondary'}>
                {account.position}
              </Badge>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">客户数</span>
                <span className="font-medium">{account.customers}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">最后登录</span>
                <span className="font-medium">{account.lastLogin}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">账号状态</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={(checked) => handleToggleStatus(account.id, checked)}
                    data-testid={`switch-status-${account.id}`}
                  />
                  <span className={account.isActive ? 'text-chart-2' : 'text-muted-foreground'}>
                    {account.isActive ? '启用' : '停用'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleResetPassword(account.username)}
                data-testid={`button-reset-${account.id}`}
              >
                <Key className="h-3 w-3 mr-1" />
                重置密码
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
