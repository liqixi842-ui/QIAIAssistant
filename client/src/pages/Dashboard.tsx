import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import MetricCard from '@/components/MetricCard';
import AIRecommendation from '@/components/AIRecommendation';
import TaskList from '@/components/TaskList';

const motivationalSubtitles = [
  "AI 将为你分析数据，激发行动成长。",
  "今天多一次沟通,客户就多一点信任。",
  "让智能助手成为你的销售伙伴。",
  "数据洞察，精准行动。"
];

interface DashboardStats {
  todaySends: number;
  todaySendsChange: number;
  responseRate: number;
  responseRateChange: number;
  conversionRate: number;
  conversionRateChange: number;
  activeCustomers: number;
  activeCustomersChange: number;
}

interface TodayTask {
  id: string;
  customerId: string;
  title: string;
  description?: string;
  status: 'active' | 'pending' | 'completed';
  script?: string;
  customer?: {
    id: string;
    name?: string;
    phone: string;
    stage?: string;
  };
}

export default function Dashboard() {
  const [subtitle, setSubtitle] = useState(motivationalSubtitles[0]);

  useEffect(() => {
    const randomSubtitle = motivationalSubtitles[Math.floor(Math.random() * motivationalSubtitles.length)];
    setSubtitle(randomSubtitle);
  }, []);

  // 从localStorage获取当前用户信息
  const currentUserStr = localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  const welcomeText = "欢迎回到动「QI」来，未来的销冠：";
  const userName = currentUser?.nickname || currentUser?.name || "用户";

  // 获取Dashboard统计数据
  const { data: statsData, isLoading: statsLoading } = useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ['/api/dashboard/stats'],
  });

  const stats: DashboardStats = (statsData?.data as DashboardStats) || {
    todaySends: 0,
    todaySendsChange: 0,
    responseRate: 0,
    responseRateChange: 0,
    conversionRate: 0,
    conversionRateChange: 0,
    activeCustomers: 0,
    activeCustomersChange: 0,
  };

  // 获取今日任务
  const { data: tasksData, isLoading: tasksLoading } = useQuery<{ success: boolean; data: TodayTask[] }>({
    queryKey: ['/api/dashboard/today-tasks'],
  });

  const todayTasksRaw: TodayTask[] = (tasksData?.data as TodayTask[]) || [];
  
  // 转换为TaskList组件所需的格式
  const todayTasks = todayTasksRaw.map(task => ({
    id: task.id,
    customerName: task.customer?.name || `客户${task.customer?.phone || ''}`,
    stage: task.customer?.stage || '未知',
    status: task.status,
    script: task.script,
    recentChat: task.description,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {welcomeText.split('').map((char: string, index: number) => (
            <motion.span 
              key={`char-${index}`}
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 0.3,
                delay: index * 0.05,
                ease: "easeInOut"
              }}
              style={{ display: 'inline-block' }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
          {userName.split('').map((char: string, index: number) => (
            <motion.span 
              key={`name-${index}`}
              className="text-primary"
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 0.3,
                delay: (welcomeText.length + index) * 0.05,
                ease: "easeInOut"
              }}
              style={{ display: 'inline-block' }}
            >
              {char}
            </motion.span>
          ))}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {statsLoading ? (
        <div className="text-center text-muted-foreground">加载统计数据中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="今日发送" 
            value={stats.todaySends} 
            change={stats.todaySendsChange} 
            testId="metric-daily-sends"
          />
          <MetricCard 
            title="回应率" 
            value={stats.responseRate} 
            change={stats.responseRateChange} 
            suffix="%" 
            testId="metric-response-rate"
          />
          <MetricCard 
            title="转化率" 
            value={stats.conversionRate} 
            change={stats.conversionRateChange} 
            suffix="%" 
            testId="metric-conversion-rate"
          />
          <MetricCard 
            title="活跃客户" 
            value={stats.activeCustomers} 
            change={stats.activeCustomersChange} 
            testId="metric-active-customers"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIRecommendation hasRecommendation={true} />
        {tasksLoading ? (
          <div className="text-center text-muted-foreground">加载任务数据中...</div>
        ) : (
          <TaskList tasks={todayTasks} />
        )}
      </div>
    </div>
  );
}
