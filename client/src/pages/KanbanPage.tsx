import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Customer as DBCustomer, User as DBUser } from '@shared/schema';
import { 
  User, 
  ArrowRight, 
  TrendingDown, 
  UserPlus, 
  Handshake, 
  Heart, 
  Target, 
  FileText, 
  Wallet, 
  TrendingUp, 
  Star,
  AlertCircle,
  PauseCircle
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  lastContact: string;
  daysInStage: number;
  amount?: number;
}

interface Stage {
  id: string;
  title: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  customers: Customer[];
  channel: 'relationship' | 'business' | 'risk';
}

const mockStages: Stage[] = [
  {
    id: 'new',
    title: '新客户录入',
    icon: UserPlus,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    description: '24小时内完成首触',
    channel: 'relationship',
    customers: [
      { id: '1', name: '赵六', phone: '1377', lastContact: '2小时前', daysInStage: 0 },
      { id: '2', name: '孙七', phone: '1588', lastContact: '5小时前', daysInStage: 0 }
    ]
  },
  {
    id: 'icebreaking',
    title: '破冰培育期',
    icon: Handshake,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    description: '建立初步联系',
    channel: 'relationship',
    customers: [
      { id: '3', name: '张明', phone: '1388', lastContact: '1天前', daysInStage: 2 },
      { id: '4', name: '周八', phone: '1399', lastContact: '2天前', daysInStage: 1 }
    ]
  },
  {
    id: 'trust',
    title: '信任建立期',
    icon: Heart,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    description: '稳定互动，关系评分≥70',
    channel: 'relationship',
    customers: [
      { id: '5', name: '吴九', phone: '1566', lastContact: '3小时前', daysInStage: 5 },
      { id: '6', name: '郑十', phone: '1355', lastContact: '5小时前', daysInStage: 4 },
      { id: '7', name: '刘备', phone: '1344', lastContact: '1天前', daysInStage: 7 }
    ]
  },
  {
    id: 'intent',
    title: '意向确认期',
    icon: Target,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    description: '明确投资需求',
    channel: 'relationship',
    customers: [
      { id: '8', name: '关羽', phone: '1322', lastContact: '4小时前', daysInStage: 3 },
      { id: '9', name: '张飞', phone: '1311', lastContact: '6小时前', daysInStage: 2 }
    ]
  },
  {
    id: 'account',
    title: '开户期',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    description: '24h完成率≥70%',
    channel: 'business',
    customers: [
      { id: '10', name: '李华', phone: '1366', lastContact: '1小时前', daysInStage: 1 }
    ]
  },
  {
    id: 'deposit',
    title: '入金期',
    icon: Wallet,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    description: '72h首入金率≥50%',
    channel: 'business',
    customers: [
      { id: '11', name: '王芳', phone: '1599', lastContact: '2小时前', daysInStage: 2, amount: 50000 },
      { id: '12', name: '陈刚', phone: '1577', lastContact: '5小时前', daysInStage: 1, amount: 30000 }
    ]
  },
  {
    id: 'topup',
    title: '加金期',
    icon: TrendingUp,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    description: '加金客户比例≥25%',
    channel: 'business',
    customers: [
      { id: '13', name: '黄忠', phone: '1533', lastContact: '1天前', daysInStage: 10, amount: 100000 },
      { id: '14', name: '马超', phone: '1522', lastContact: '3天前', daysInStage: 8, amount: 80000 }
    ]
  },
  {
    id: 'active',
    title: '持续交易期',
    icon: Star,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    description: '稳定高价值客户',
    channel: 'business',
    customers: [
      { id: '15', name: '赵云', phone: '1511', lastContact: '5小时前', daysInStage: 30, amount: 500000 },
      { id: '16', name: '诸葛亮', phone: '1500', lastContact: '1天前', daysInStage: 45, amount: 800000 },
      { id: '17', name: '孙权', phone: '1488', lastContact: '2天前', daysInStage: 60, amount: 1200000 }
    ]
  },
  {
    id: 'silent',
    title: '沉默流失期',
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    description: '连续7天无互动',
    channel: 'risk',
    customers: [
      { id: '18', name: '曹操', phone: '1477', lastContact: '8天前', daysInStage: 8 },
      { id: '19', name: '孙策', phone: '1466', lastContact: '10天前', daysInStage: 10 }
    ]
  },
  {
    id: 'deposit_stalled',
    title: '入金停滞',
    icon: PauseCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    description: '开户后超过72小时未入金',
    channel: 'risk',
    customers: [
      { id: '20', name: '周瑜', phone: '1455', lastContact: '5天前', daysInStage: 5 }
    ]
  }
];

export default function KanbanPage() {
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Fetch users for filter dropdown
  const { data: usersData } = useQuery<{ success: boolean; data: DBUser[] }>({
    queryKey: ['/api/users'],
  });
  const users = usersData?.data || [];

  // Fetch customers based on current user's role permissions (from session)
  const { data: customersData } = useQuery<{ success: boolean; data: DBCustomer[] }>({
    queryKey: ['/api/customers'],
  });
  const allCustomers = customersData?.data || [];

  // Group customers by stage
  const groupCustomersByStage = (customers: DBCustomer[]) => {
    const stageMap: Record<string, Customer[]> = {};
    
    customers.forEach(customer => {
      if (!customer.stage) return;
      
      if (!stageMap[customer.stage]) {
        stageMap[customer.stage] = [];
      }
      
      stageMap[customer.stage].push({
        id: customer.id.toString(),
        name: customer.name || '未命名',
        phone: customer.phone,
        lastContact: '最近联系', // TODO: Add lastContact tracking
        daysInStage: 0, // TODO: Add stage duration tracking
      });
    });
    
    return stageMap;
  };

  const customersByStage = groupCustomersByStage(allCustomers);

  // Update stages with real customer data
  const stages = mockStages.map(stage => ({
    ...stage,
    customers: customersByStage[stage.id] || []
  }));

  const relationshipStages = stages.filter(s => s.channel === 'relationship');
  const businessStages = stages.filter(s => s.channel === 'business');
  const riskStages = stages.filter(s => s.channel === 'risk');

  const totalCustomers = stages.reduce((sum, stage) => sum + stage.customers.length, 0);
  const conversionRate = totalCustomers > 0
    ? ((businessStages.reduce((sum, s) => sum + s.customers.length, 0) / totalCustomers) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">客户生命周期看板</h1>
          <p className="text-sm text-muted-foreground mt-1">投资客户全生命周期阶段管理</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{totalCustomers}</p>
            <p className="text-xs text-muted-foreground">总客户数</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-chart-2">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">业务转化率</p>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">筛选业务员/经理</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger data-testid="select-user-filter-kanban">
                <SelectValue placeholder="选择业务员/经理" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部客户</SelectItem>
                {users
                  .filter(u => u.role === '业务' || u.role === '经理')
                  .map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.nickname || user.username} ({user.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {selectedUser !== 'all' && (
            <div className="text-sm text-muted-foreground">
              已筛选：{users.find(u => u.id.toString() === selectedUser)?.nickname || '未知用户'}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">正常流转</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">需要关注</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">风险预警</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">转化节点</span>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">关系培育通道</h2>
            <Badge variant="secondary">
              {relationshipStages.reduce((sum, s) => sum + s.customers.length, 0)} 人
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {relationshipStages.map((stage, index) => (
              <div key={stage.id}>
                <StageColumn stage={stage} />
                {index < relationshipStages.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">业务转化通道</h2>
            <Badge variant="secondary">
              {businessStages.reduce((sum, s) => sum + s.customers.length, 0)} 人
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {businessStages.map((stage, index) => (
              <div key={stage.id}>
                <StageColumn stage={stage} />
                {index < businessStages.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">风险管控通道</h2>
            <Badge variant="destructive">
              {riskStages.reduce((sum, s) => sum + s.customers.length, 0)} 人
            </Badge>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {riskStages.map((stage) => (
              <StageColumn key={stage.id} stage={stage} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StageColumn({ stage }: { stage: Stage }) {
  const IconComponent = stage.icon;
  
  return (
    <div className="space-y-3">
      <Card className={`p-3 ${stage.bgColor}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <IconComponent className={`h-5 w-5 ${stage.color}`} />
            <h3 className={`font-semibold ${stage.color}`}>{stage.title}</h3>
          </div>
          <Badge variant="secondary">{stage.customers.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{stage.description}</p>
      </Card>
      <div className="space-y-2">
        {stage.customers.map((customer) => (
          <Card
            key={customer.id}
            className="p-3 hover-elevate cursor-move"
            data-testid={`customer-${customer.id}-${stage.id}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{customer.name}</p>
                <p className="text-xs text-muted-foreground">尾号 {customer.phone}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                最后联系: {customer.lastContact}
              </p>
              <p className="text-xs text-muted-foreground">
                停留: {customer.daysInStage}天
              </p>
              {customer.amount && (
                <p className="text-xs font-medium text-primary">
                  资金: ¥{customer.amount.toLocaleString()}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
