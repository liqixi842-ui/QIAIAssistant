import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface AiRatingButtonProps {
  type: "analysis" | "script" | "task";
  targetId: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline";
  className?: string;
}

export function AiRatingButton({ type, targetId, size = "sm", variant = "ghost", className = "" }: AiRatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: { type: string; targetId: string; rating: number; feedback?: string }) => {
      const response = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "提交失败");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "反馈提交成功",
        description: "感谢您的反馈，AI将不断学习进步！",
      });
      setIsOpen(false);
      setRating(0);
      setFeedback("");
      queryClient.invalidateQueries({ queryKey: ["/api/ai-feedback"] });
    },
    onError: (error: any) => {
      toast({
        title: "提交失败",
        description: error.message || "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "请选择评分",
        description: "请至少选择1星",
        variant: "destructive",
      });
      return;
    }

    submitFeedbackMutation.mutate({
      type,
      targetId,
      rating,
      feedback: feedback.trim() || undefined,
    });
  };

  const typeLabels = {
    analysis: "AI分析",
    script: "AI话术",
    task: "AI任务",
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size={size} 
          variant={variant} 
          className={className}
          data-testid={`button-rate-${type}`}
        >
          <Star className="h-4 w-4 mr-1" />
          评分
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-ai-rating">
        <DialogHeader>
          <DialogTitle>评价{typeLabels[type]}</DialogTitle>
          <DialogDescription>
            您的反馈将帮助AI不断学习和改进，提供更好的服务
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 星级评分 */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm text-muted-foreground">点击星星评分</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                  data-testid={`star-${star}`}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <span className="text-sm font-medium" data-testid="text-rating-value">
                {rating === 5 && "⭐ 非常满意"}
                {rating === 4 && "👍 满意"}
                {rating === 3 && "😐 一般"}
                {rating === 2 && "👎 不满意"}
                {rating === 1 && "😞 很不满意"}
              </span>
            )}
          </div>

          {/* 文字反馈 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">详细反馈（可选）</label>
            <Textarea
              placeholder="告诉我们您的具体想法，帮助AI改进..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              data-testid="textarea-feedback"
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              data-testid="button-cancel"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || submitFeedbackMutation.isPending}
              data-testid="button-submit-rating"
            >
              {submitFeedbackMutation.isPending ? "提交中..." : "提交评分"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
