import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Zap, Plus, Sparkles, MessageSquare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Task {
  id: string;
  customerId: string;
  title: string;
  description?: string;
  guidanceSteps?: string[];
  script?: string;
  status: 'active' | 'pending' | 'completed';
  assignedAgentId?: string;
  createdBy?: string;
  createdAt?: string;
  dueAt?: string;
  completedAt?: string;
  // 前端展示用（需从API获取或计算）
  customerName?: string;
  stage?: string;
  dueDate?: string;
  recentChat?: string;
}

const mockTasks: Task[] = [
  {
    id: '1',
    customerId: '1',
    customerName: '张明',
    title: '跟进热聊客户 - 张明',
    description: '客户对蓝筹股表现出浓厚兴趣，需要进一步跟进并推荐合适的投资组合',
    stage: '热聊',
    status: 'active',
    guidanceSteps: [
      '复习客户画像：张明是有5年经验的股民，风险偏好中等',
      '准备3-5只蓝筹股的详细分析报告，重点强调风险控制',
      '在通话时提及最近的市场走势，显示专业性',
      '提出具体的投资建议，包括入场时机和止损策略',
      '询问客户的资金规模，为后续开户做准备'
    ],
    script: '张总您好，根据您上次提到的风险偏好，我为您筛选了几只稳健型的蓝筹股。这些股票不仅有良好的基本面支撑，而且分红稳定。我给您详细分析一下：首先是贵州茅台...（继续详细介绍）。您看这样的配置符合您的预期吗？我们可以进一步讨论具体的投资比例。',
    recentChat: '客户：好的，我考虑一下。下周再联系。',
    dueDate: '今天 14:00'
  },
  {
    id: '2',
    customerId: '2',
    customerName: '李华',
    title: '协助开户 - 李华',
    description: '新客户已经表示开户意向，需要引导完成开户流程',
    stage: '开户',
    status: 'pending',
    guidanceSteps: [
      '确认客户的开户意向和时间安排',
      '发送开户指南和所需材料清单（身份证、银行卡）',
      '提前预约视频认证时间，避免高峰期',
      '引导客户下载开户APP，准备好证件照片',
      '全程陪同客户完成开户，解答疑问',
      '开户成功后立即引导入金，趁热打铁'
    ],
    script: '李总，开户流程非常简单，只需要3步：第一步，准备好您的身份证和银行卡；第二步，我们通过视频认证，全程只需5分钟；第三步，设置交易密码就完成了。整个过程我会全程陪同您，有任何问题随时问我。您看今天下午3点方便吗？我帮您预约一下视频认证。',
    recentChat: '客户：今天比较忙，明天可以吗？',
    dueDate: '明天 10:00'
  },
  {
    id: '3',
    customerId: '3',
    customerName: '王芳',
    title: '完成入金 - 王芳',
    stage: '入金',
    status: 'completed',
    dueDate: '昨天 16:00'
  },
  {
    id: '4',
    customerId: '4',
    customerName: '赵六',
    title: '激活普通客户 - 赵六',
    description: '长期未联系的客户，需要重新激活并了解近期投资需求',
    stage: '普通',
    status: 'pending',
    guidanceSteps: [
      '查看客户历史记录，了解之前的沟通内容和投资偏好',
      '准备近期热门投资话题作为开场',
      '询问客户近期投资情况，识别痛点',
      '根据市场情况提供1-2个投资建议',
      '如果客户有兴趣，约定下次详细沟通的时间'
    ],
    script: '赵总，好久不见！最近股市行情不错，特别是新能源板块表现亮眼。我记得您之前对成长股比较感兴趣，这段时间您有关注市场动态吗？我这边整理了一些优质标的，想和您分享一下。方便的话，我们找个时间详细聊聊？',
    dueDate: '后天 15:00'
  }
];

const statusConfig = {
  active: { icon: Zap, label: '激活', color: 'bg-chart-1 text-primary-foreground' },
  pending: { icon: Clock, label: '待聊', color: 'bg-secondary text-secondary-foreground' },
  completed: { icon: CheckCircle2, label: '完成', color: 'bg-chart-2 text-primary-foreground' }
};

export default function TasksPage() {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'incomplete'>('all');

  // 获取任务列表
  const { data: tasksData, isLoading } = useQuery<{ success: boolean; data: Task[] }>({
    queryKey: ['/api/tasks'],
  });

  const allTasks = tasksData?.data || [];
  
  // 根据状态筛选任务
  const tasks = allTasks.filter(task => {
    if (statusFilter === 'completed') return task.status === 'completed';
    if (statusFilter === 'incomplete') return task.status !== 'completed';
    return true;
  });

  // AI智能生成跟进任务（自动分析所有客户）
  const generateTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/tasks/auto-generate-from-customers', {});
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      const count = response.data?.count || 0;
      toast({
        title: "智能分析完成",
        description: `AI已为${count}个需要跟进的客户生成任务`,
      });
    },
    onError: () => {
      toast({
        title: "失败",
        description: "AI分析失败，请重试",
        variant: "destructive",
      });
    },
  });

  // 标记任务完成
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest('PATCH', '/api/tasks/' + taskId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "成功",
        description: "任务已标记为完成",
      });
    },
    onError: () => {
      toast({
        title: "失败",
        description: "标记任务失败，请重试",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleCompleteTask = (taskId: string) => {
    completeTaskMutation.mutate(taskId);
  };

  const handleGenerateTask = () => {
    generateTaskMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">客户任务</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              data-testid="filter-all"
            >
              全部 ({allTasks.length})
            </Button>
            <Button
              variant={statusFilter === 'incomplete' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('incomplete')}
              data-testid="filter-incomplete"
            >
              未完成 ({allTasks.filter(t => t.status !== 'completed').length})
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
              data-testid="filter-completed"
            >
              已完成 ({allTasks.filter(t => t.status === 'completed').length})
            </Button>
          </div>
          <Button 
            onClick={handleGenerateTask}
            disabled={generateTaskMutation.isPending}
            data-testid="button-add-task"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateTaskMutation.isPending ? '智能分析中...' : '智能生成跟进任务'}
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">暂无任务</p>
          <p className="text-sm text-muted-foreground mt-2">点击"智能生成跟进任务"让AI自动分析客户并创建任务</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map((task) => {
          const StatusIcon = statusConfig[task.status].icon;
          
          return (
            <Card key={task.id} className="p-4 hover-elevate" data-testid={`task-card-${task.id}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <StatusIcon className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">{task.title || task.customerName || '未命名任务'}</h3>
                    <p className="text-xs text-muted-foreground">
                      {task.dueDate || (task.dueAt ? new Date(task.dueAt).toLocaleString('zh-CN') : '未设置')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.stage && <Badge variant="secondary">{task.stage}</Badge>}
                  <Badge className={statusConfig[task.status].color}>
                    {statusConfig[task.status].label}
                  </Badge>
                </div>
              </div>

              {task.script && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">建议话术</p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm line-clamp-2">{task.script}</p>
                  </div>
                </div>
              )}

              {task.recentChat && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">最近对话</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{task.recentChat}</p>
                </div>
              )}

              <div className="flex gap-2">
                {task.status !== 'completed' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => handleCompleteTask(task.id)}
                    disabled={completeTaskMutation.isPending}
                    data-testid={`button-complete-${task.id}`}
                  >
                    标记完成
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="flex-1"
                  onClick={() => handleViewDetails(task)}
                  data-testid={`button-details-${task.id}`}
                >
                  查看详情
                </Button>
              </div>
            </Card>
          );
        })}
        </div>
      )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title || `任务详情 - ${selectedTask?.customerName}`}</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6">
              {selectedTask.description && (
                <div>
                  <h4 className="font-medium mb-2">任务描述</h4>
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.guidanceSteps && selectedTask.guidanceSteps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">AI完成指导</h4>
                  </div>
                  <div className="bg-muted p-4 rounded-md space-y-3">
                    {selectedTask.guidanceSteps.map((step, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <p className="text-sm flex-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.script && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">推荐话术</h4>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm leading-relaxed">{selectedTask.script}</p>
                  </div>
                </div>
              )}

              {selectedTask.recentChat && (
                <div>
                  <h4 className="font-medium mb-2">最近对话</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm text-muted-foreground">{selectedTask.recentChat}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {selectedTask.status !== 'completed' && (
                  <Button className="flex-1">
                    标记完成
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => setIsDetailOpen(false)}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
