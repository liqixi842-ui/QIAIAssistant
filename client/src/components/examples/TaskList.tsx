import TaskList from '../TaskList';

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

export default function TaskListExample() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-2xl">
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Empty State</h3>
        <TaskList tasks={[]} />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">With Tasks</h3>
        <TaskList tasks={mockTasks} />
      </div>
    </div>
  );
}
