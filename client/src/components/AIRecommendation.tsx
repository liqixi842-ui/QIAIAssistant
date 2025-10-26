import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface AIRecommendationProps {
  hasRecommendation?: boolean;
}

export default function AIRecommendation({ hasRecommendation = false }: AIRecommendationProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    console.log('Refreshing AI recommendations...');
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI 今日推荐</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          data-testid="button-refresh-ai"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {!hasRecommendation ? (
        <p className="text-sm text-muted-foreground">
          暂无AI推荐，系统正在分析客户行为数据。
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">推荐话题</h3>
            <p className="text-sm text-muted-foreground">
              根据客户张明的最近活跃度和投资习惯，建议讨论近期科技股的投资机会。
            </p>
          </div>
          <div className="bg-muted p-4 rounded-md border-l-4 border-primary">
            <p className="text-sm">
              "张总您好，最近科技板块表现不错，特别是AI相关的龙头股。根据您之前对成长股的兴趣，我为您准备了几只潜力标的，方便的话我们详细聊聊？"
            </p>
          </div>
          <Button variant="default" size="sm" data-testid="button-adopt-script">
            采纳此话术
          </Button>
        </div>
      )}
    </Card>
  );
}
