import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Zap } from 'lucide-react';
import { useState } from 'react';

interface Task {
  id: string;
  customerName: string;
  stage: string;
  status: 'active' | 'pending' | 'completed';
  script?: string;
  recentChat?: string;
}

interface TaskListProps {
  tasks?: Task[];
}

export default function TaskList({ tasks = [] }: TaskListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statusConfig = {
    active: { icon: Zap, label: '激活', color: 'bg-chart-1 text-primary-foreground' },
    pending: { icon: Clock, label: '待聊', color: 'bg-secondary text-secondary-foreground' },
    completed: { icon: CheckCircle2, label: '完成', color: 'bg-chart-2 text-primary-foreground' }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">今日任务</h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无待处理任务</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const StatusIcon = statusConfig[task.status].icon;
            const isExpanded = expandedId === task.id;
            
            return (
              <div
                key={task.id}
                className="border rounded-md p-4 hover-elevate cursor-pointer transition-all"
                onClick={() => setExpandedId(isExpanded ? null : task.id)}
                data-testid={`task-item-${task.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <StatusIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{task.customerName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {task.stage}
                    </Badge>
                  </div>
                  <Badge className={statusConfig[task.status].color}>
                    {statusConfig[task.status].label}
                  </Badge>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="bg-gradient-to-r from-primary/10 to-transparent h-1 rounded-full" />
                    {task.script && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">建议话术</p>
                        <p className="text-sm">{task.script}</p>
                      </div>
                    )}
                    {task.recentChat && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">最近对话</p>
                        <p className="text-sm text-muted-foreground">{task.recentChat}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
