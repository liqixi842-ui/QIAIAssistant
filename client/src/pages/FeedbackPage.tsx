import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Feedback {
  id: string;
  title: string;
  content: string;
  isResolved: boolean;
  resolvedDate?: string;
  date: string;
  submitter: string;
}

const initialMockFeedback: Feedback[] = [
  {
    id: '1',
    title: '希望增加批量导入客户功能',
    content: '目前只能单个添加客户，如果能批量导入Excel会更方便',
    isResolved: false,
    date: '2025-10-15',
    submitter: '张三'
  },
  {
    id: '2',
    title: 'AI推荐话术很有用',
    content: '非常感谢这个功能，帮我节省了很多时间',
    isResolved: true,
    resolvedDate: '2025-10-18',
    date: '2025-10-10',
    submitter: '李四'
  },
  {
    id: '3',
    title: '系统响应速度有时较慢',
    content: '在高峰期使用时，系统加载速度明显变慢，希望能优化',
    isResolved: false,
    date: '2025-10-20',
    submitter: '王五'
  },
  {
    id: '4',
    title: '建议增加数据导出功能',
    content: '希望能够导出客户数据和报表，方便做分析',
    isResolved: true,
    resolvedDate: '2025-10-05',
    date: '2025-10-01',
    submitter: '赵六'
  }
];

interface FeedbackPageProps {
  userRole?: string;
}

export default function FeedbackPage({ userRole = '业务' }: FeedbackPageProps) {
  const { toast } = useToast();
  const [newFeedback, setNewFeedback] = useState({ title: '', content: '' });
  const [feedbackList, setFeedbackList] = useState<Feedback[]>(initialMockFeedback);
  
  const canSeeSubmitter = userRole === '主管';
  const canMarkResolved = userRole === '总监' || userRole === '主管';

  // 自动删除处理完成超过一周的投诉建议
  const filteredFeedback = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return feedbackList.filter(feedback => {
      if (feedback.isResolved && feedback.resolvedDate) {
        const resolvedDate = new Date(feedback.resolvedDate);
        return resolvedDate > oneWeekAgo;
      }
      return true;
    });
  }, [feedbackList]);

  const handleSubmit = () => {
    const newId = String(feedbackList.length + 1);
    const currentDate = new Date().toISOString().split('T')[0];
    
    const feedback: Feedback = {
      id: newId,
      title: newFeedback.title,
      content: newFeedback.content,
      isResolved: false,
      date: currentDate,
      submitter: '当前用户'
    };
    
    setFeedbackList([feedback, ...feedbackList]);
    
    toast({
      title: "反馈已提交",
      description: "我们会尽快处理您的建议",
    });
    setNewFeedback({ title: '', content: '' });
  };

  const handleToggleResolved = (feedbackId: string) => {
    setFeedbackList(feedbackList.map(feedback => {
      if (feedback.id === feedbackId) {
        const isNowResolved = !feedback.isResolved;
        return {
          ...feedback,
          isResolved: isNowResolved,
          resolvedDate: isNowResolved ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return feedback;
    }));

    toast({
      title: "状态已更新",
      description: "反馈状态已成功更新",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">投诉建议</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">提交新建议</h2>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="标题"
              value={newFeedback.title}
              onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              data-testid="input-feedback-title"
            />
            <Textarea
              placeholder="请详细描述您的建议或问题..."
              value={newFeedback.content}
              onChange={(e) => setNewFeedback({ ...newFeedback, content: e.target.value })}
              rows={6}
              data-testid="textarea-feedback-content"
            />
            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              data-testid="button-submit-feedback"
              disabled={!newFeedback.title || !newFeedback.content}
            >
              提交反馈
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">反馈记录</h2>
          {filteredFeedback.map((feedback) => (
            <Card key={feedback.id} className="p-4" data-testid={`feedback-${feedback.id}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium">{feedback.title}</h3>
                  {canSeeSubmitter ? (
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`feedback-submitter-${feedback.id}`}>
                      提交人: {feedback.submitter}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      提交人: 匿名
                    </p>
                  )}
                </div>
                <Badge className={feedback.isResolved ? 'bg-chart-2' : 'bg-secondary'}>
                  {feedback.isResolved ? '已处理' : '待处理'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{feedback.content}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  提交日期: {feedback.date}
                  {feedback.isResolved && feedback.resolvedDate && (
                    <span className="ml-2">| 处理日期: {feedback.resolvedDate}</span>
                  )}
                </p>
                {canMarkResolved && (
                  <Button
                    size="sm"
                    variant={feedback.isResolved ? "outline" : "default"}
                    onClick={() => handleToggleResolved(feedback.id)}
                    data-testid={`button-toggle-resolved-${feedback.id}`}
                  >
                    {feedback.isResolved ? (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        标记未处理
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        标记已处理
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
