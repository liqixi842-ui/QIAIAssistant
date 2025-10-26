import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MetricCard from '@/components/MetricCard';
import AIRecommendation from '@/components/AIRecommendation';
import TaskList from '@/components/TaskList';

const motivationalSubtitles = [
  "AI 将为你分析数据，激发行动成长。",
  "今天多一次沟通，客户就多一点信任。",
  "让智能助手成为你的销售伙伴。",
  "数据洞察，精准行动。"
];

const mockTasks = [
  {
    id: '1',
    customerName: '张明',
    stage: '热聊',
    status: 'active' as const,
    script: '张总，根据您上次提到的风险偏好，我为您筛选了几只稳健型的蓝筹股...',
    recentChat: '客户：好的，我考虑一下。下周再联系。'
  },
  {
    id: '2',
    customerName: '李华',
    stage: '开户',
    status: 'pending' as const,
    script: '李总，开户资料已经准备好了，今天方便完成最后一步吗？',
    recentChat: '客户：今天比较忙，明天可以吗？'
  },
  {
    id: '3',
    customerName: '王芳',
    stage: '入金',
    status: 'completed' as const
  }
];

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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {welcomeText.split('').map((char, index) => (
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
          {userName.split('').map((char, index) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="今日发送" 
          value={128} 
          change={12.5} 
          testId="metric-daily-sends"
        />
        <MetricCard 
          title="回应率" 
          value={68} 
          change={5.2} 
          suffix="%" 
          testId="metric-response-rate"
        />
        <MetricCard 
          title="转化率" 
          value={23} 
          change={-3.1} 
          suffix="%" 
          testId="metric-conversion-rate"
        />
        <MetricCard 
          title="活跃客户" 
          value={456} 
          change={8.7} 
          testId="metric-active-customers"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIRecommendation hasRecommendation={true} />
        <TaskList tasks={mockTasks} />
      </div>
    </div>
  );
}
