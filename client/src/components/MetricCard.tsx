import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  suffix?: string;
  testId?: string;
}

export default function MetricCard({ title, value, change, suffix = '', testId }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <Card className="p-6 hover-elevate transition-all" data-testid={testId}>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">
            {value}{suffix}
          </span>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-chart-2' : 'text-chart-3'}`}>
              {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
