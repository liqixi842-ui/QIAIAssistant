import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageSquarePlus, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Feedback {
  id: string;
  title: string;
  content: string;
  submitterId: string;
  submitterName: string;
  isResolved: number; // 0: 未处理, 1: 已处理
  submittedAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

interface FeedbackPageProps {
  userRole?: string;
}

export default function FeedbackPage({ userRole = '业务' }: FeedbackPageProps) {
  const { toast } = useToast();
  const [newFeedback, setNewFeedback] = useState({ title: '', content: '' });
  
  const canSeeSubmitter = userRole === '主管';
  const canMarkResolved = userRole === '总监' || userRole === '主管';

  // 获取反馈列表
  const { data, isLoading } = useQuery({
    queryKey: ['/api/feedbacks'],
  });
  
  const feedbackList: Feedback[] = data?.data || [];

  // 自动删除处理完成超过一周的投诉建议
  const filteredFeedback = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return feedbackList.filter(feedback => {
      if (feedback.isResolved === 1 && feedback.resolvedAt) {
        const resolvedDate = new Date(feedback.resolvedAt);
        return resolvedDate > oneWeekAgo;
      }
      return true;
    });
  }, [feedbackList]);

  // 提交新反馈
  const submitMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return await apiRequest('POST', '/api/feedbacks', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedbacks'] });
      toast({
        title: "反馈已提交",
        description: "我们会尽快处理您的建议",
      });
      setNewFeedback({ title: '', content: '' });
    },
    onError: (error: Error) => {
      toast({
        title: "提交失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 标记已处理/未处理
  const resolveMutation = useMutation({
    mutationFn: async ({ id, isResolved }: { id: string; isResolved: number }) => {
      return await apiRequest('PATCH', `/api/feedbacks/${id}/resolve`, { isResolved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedbacks'] });
      toast({
        title: "状态已更新",
        description: "反馈状态已成功更新",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!newFeedback.title || !newFeedback.content) {
      toast({
        title: "提交失败",
        description: "标题和内容不能为空",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(newFeedback);
  };

  const handleToggleResolved = (feedbackId: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    resolveMutation.mutate({ id: feedbackId, isResolved: newStatus });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>;
  }

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
            <Input
              type="text"
              placeholder="标题"
              value={newFeedback.title}
              onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
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
              disabled={!newFeedback.title || !newFeedback.content || submitMutation.isPending}
            >
              {submitMutation.isPending ? '提交中...' : '提交反馈'}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">反馈记录</h2>
          {filteredFeedback.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              暂无反馈记录
            </Card>
          ) : (
            filteredFeedback.map((feedback) => (
              <Card key={feedback.id} className="p-4" data-testid={`feedback-${feedback.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium">{feedback.title}</h3>
                    {canSeeSubmitter ? (
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`feedback-submitter-${feedback.id}`}>
                        提交人: {feedback.submitterName}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        提交人: 匿名
                      </p>
                    )}
                  </div>
                  <Badge className={feedback.isResolved === 1 ? 'bg-chart-2' : 'bg-secondary'}>
                    {feedback.isResolved === 1 ? '已处理' : '待处理'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{feedback.content}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    提交日期: {new Date(feedback.submittedAt).toLocaleDateString('zh-CN')}
                    {feedback.isResolved === 1 && feedback.resolvedAt && (
                      <span className="ml-2">| 处理日期: {new Date(feedback.resolvedAt).toLocaleDateString('zh-CN')}</span>
                    )}
                  </p>
                  {canMarkResolved && (
                    <Button
                      size="sm"
                      variant={feedback.isResolved === 1 ? "outline" : "default"}
                      onClick={() => handleToggleResolved(feedback.id, feedback.isResolved)}
                      data-testid={`button-toggle-resolved-${feedback.id}`}
                      disabled={resolveMutation.isPending}
                    >
                      {feedback.isResolved === 1 ? (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
