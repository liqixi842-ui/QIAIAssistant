import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, Calendar, BarChart3, Table2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

type GroupByDimension = 'channel' | 'agent' | 'team' | 'day' | 'week' | 'month' | 'country';
type ViewMode = 'table' | 'chart';

interface MetricsResult {
  total: number;
  readNoReply: number;
  noReadNoReply: number;
  joinedGroup: number;
  answeredCall: number;
  investor: number;
  beginner: number;
  followStock: number;
  hotChat: number;
  repliedToday: number;
  stockTracking: number;
  sincere: number;
  openedAccount: number;
  firstDeposit: number;
  addedFunds: number;
}

interface GroupedResult {
  dimension: string;
  dimensionLabel: string;
  metrics: MetricsResult;
}

interface AnalysisResult {
  meta: {
    groupBy: GroupByDimension;
    totalRecords: number;
  };
  results: GroupedResult[];
  totals: MetricsResult;
}

interface ReportBuilderProps {
  filters?: {
    channel?: string;
    createdBy?: string;
    team?: string;
    dateStart?: string;
    dateEnd?: string;
  };
}

// 预设分析模式
const PRESET_MODES = [
  { id: 'channel_today', label: '今日渠道表现', icon: TrendingUp, groupBy: 'channel' as GroupByDimension, description: '查看今天各个渠道的数据对比' },
  { id: 'channel_trend', label: '渠道趋势分析', icon: BarChart3, groupBy: 'day' as GroupByDimension, description: '查看各渠道过去一段时间的趋势' },
  { id: 'agent_performance', label: '业务员业绩', icon: Users, groupBy: 'agent' as GroupByDimension, description: '对比不同业务员的表现' },
] as const;

export default function ReportBuilder({ filters = {} }: ReportBuilderProps) {
  const [selectedMode, setSelectedMode] = useState<string>('channel_today');
  const [groupBy, setGroupBy] = useState<GroupByDimension>('channel');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // 获取分析数据
  const { data: analysisData, isLoading } = useQuery<{ success: boolean; data: AnalysisResult }>({
    queryKey: ['/api/reports/analysis', groupBy, filters],
    queryFn: async () => {
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('groupBy', groupBy);
      
      // 添加筛选条件
      if (filters.channel) params.append('channel', filters.channel);
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.team) params.append('team', filters.team);
      if (filters.dateStart) params.append('dateStart', filters.dateStart);
      if (filters.dateEnd) params.append('dateEnd', filters.dateEnd);
      
      const url = `/api/reports/analysis?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('获取分析数据失败');
      return response.json();
    },
    enabled: !!groupBy,
  });

  const analysis = analysisData?.data;

  // 处理预设模式选择
  const handleModeSelect = (modeId: string) => {
    setSelectedMode(modeId);
    const mode = PRESET_MODES.find(m => m.id === modeId);
    if (mode) {
      setGroupBy(mode.groupBy);
    }
  };

  // 获取指标的中文标签
  const getMetricLabel = (key: keyof MetricsResult): string => {
    const labels: Record<keyof MetricsResult, string> = {
      total: '进线',
      readNoReply: '已读不回',
      noReadNoReply: '不读不回',
      joinedGroup: '进群',
      answeredCall: '接电话',
      investor: '股民',
      beginner: '小白',
      followStock: '跟票',
      hotChat: '热聊',
      repliedToday: '当日回复',
      stockTracking: '持股跟踪',
      sincere: '走心',
      openedAccount: '开户',
      firstDeposit: '首冲',
      addedFunds: '加金',
    };
    return labels[key];
  };

  // 渲染表格视图
  const renderTableView = () => {
    if (!analysis?.results || analysis.results.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          暂无数据
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" data-testid="analysis-table">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left font-medium" data-testid="header-dimension">
                {groupBy === 'channel' ? '渠道' : groupBy === 'agent' ? '业务员' : groupBy === 'day' ? '日期' : '维度'}
              </th>
              <th className="px-4 py-3 text-right font-medium" data-testid="header-total">进线</th>
              <th className="px-4 py-3 text-right font-medium">已读不回</th>
              <th className="px-4 py-3 text-right font-medium">进群</th>
              <th className="px-4 py-3 text-right font-medium">接电话</th>
              <th className="px-4 py-3 text-right font-medium">股民</th>
              <th className="px-4 py-3 text-right font-medium">热聊</th>
              <th className="px-4 py-3 text-right font-medium">开户</th>
              <th className="px-4 py-3 text-right font-medium">首冲</th>
              <th className="px-4 py-3 text-right font-medium">加金</th>
            </tr>
          </thead>
          <tbody>
            {analysis.results.map((result, index) => (
              <tr key={result.dimension} className="border-b hover-elevate" data-testid={`row-${index}`}>
                <td className="px-4 py-3 font-medium" data-testid={`cell-dimension-${index}`}>
                  {result.dimensionLabel}
                </td>
                <td className="px-4 py-3 text-right" data-testid={`cell-total-${index}`}>{result.metrics.total}</td>
                <td className="px-4 py-3 text-right">{result.metrics.readNoReply}</td>
                <td className="px-4 py-3 text-right">{result.metrics.joinedGroup}</td>
                <td className="px-4 py-3 text-right">{result.metrics.answeredCall}</td>
                <td className="px-4 py-3 text-right">{result.metrics.investor}</td>
                <td className="px-4 py-3 text-right">{result.metrics.hotChat}</td>
                <td className="px-4 py-3 text-right">{result.metrics.openedAccount}</td>
                <td className="px-4 py-3 text-right">{result.metrics.firstDeposit}</td>
                <td className="px-4 py-3 text-right">{result.metrics.addedFunds}</td>
              </tr>
            ))}
            <tr className="bg-muted/50 font-semibold">
              <td className="px-4 py-3" data-testid="row-totals-label">总计</td>
              <td className="px-4 py-3 text-right" data-testid="row-totals-total">{analysis.totals.total}</td>
              <td className="px-4 py-3 text-right">{analysis.totals.readNoReply}</td>
              <td className="px-4 py-3 text-right">{analysis.totals.joinedGroup}</td>
              <td className="px-4 py-3 text-right">{analysis.totals.answeredCall}</td>
              <td className="px-4 py-3 text-right">{analysis.totals.investor}</td>
              <td className="px-4 py-3 text-right">{analysis.totals.hotChat}</td>
              <td className="px-4 py-3 text-right">{analysis.totals.openedAccount}</td>
              <td className="px-4 py-3 text-right">{analysis.totals.firstDeposit}</td>
              <td className="px-4 py-3 text-right">{analysis.totals.addedFunds}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // 渲染图表视图
  const renderChartView = () => {
    if (!analysis?.results || analysis.results.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          暂无数据
        </div>
      );
    }

    // 准备图表数据
    const chartData = analysis.results.map(result => ({
      name: result.dimensionLabel,
      进线: result.metrics.total,
      进群: result.metrics.joinedGroup,
      接电话: result.metrics.answeredCall,
      热聊: result.metrics.hotChat,
      开户: result.metrics.openedAccount,
      首冲: result.metrics.firstDeposit,
    }));

    // 根据分组维度选择图表类型
    const isTimeDimension = groupBy === 'day' || groupBy === 'week' || groupBy === 'month';

    return (
      <div className="space-y-6" data-testid="chart-view">
        {/* 主要指标图表 */}
        <div>
          <h3 className="text-sm font-medium mb-4">关键指标对比</h3>
          <ResponsiveContainer width="100%" height={400}>
            {isTimeDimension ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="进线" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="进群" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                <Line type="monotone" dataKey="热聊" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                <Line type="monotone" dataKey="开户" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                <Line type="monotone" dataKey="首冲" stroke="hsl(var(--chart-4))" strokeWidth={2} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="进线" fill="hsl(var(--primary))" />
                <Bar dataKey="进群" fill="hsl(var(--chart-1))" />
                <Bar dataKey="热聊" fill="hsl(var(--chart-2))" />
                <Bar dataKey="开户" fill="hsl(var(--chart-3))" />
                <Bar dataKey="首冲" fill="hsl(var(--chart-4))" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 预设模式选择 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PRESET_MODES.map(mode => (
          <Card
            key={mode.id}
            className={`p-4 cursor-pointer hover-elevate active-elevate-2 ${selectedMode === mode.id ? 'border-primary' : ''}`}
            onClick={() => handleModeSelect(mode.id)}
            data-testid={`preset-mode-${mode.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <mode.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">{mode.label}</h3>
                <p className="text-xs text-muted-foreground">{mode.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 自定义选项 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">分组维度</label>
            <Select value={groupBy} onValueChange={(value) => {
              setGroupBy(value as GroupByDimension);
              setSelectedMode('');
            }}>
              <SelectTrigger data-testid="select-groupby">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="channel" data-testid="option-channel">按渠道</SelectItem>
                <SelectItem value="agent" data-testid="option-agent">按业务员</SelectItem>
                <SelectItem value="team" data-testid="option-team">按团队</SelectItem>
                <SelectItem value="day" data-testid="option-day">按天</SelectItem>
                <SelectItem value="week" data-testid="option-week">按周</SelectItem>
                <SelectItem value="month" data-testid="option-month">按月</SelectItem>
                <SelectItem value="country" data-testid="option-country">按国家</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">显示方式</label>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="table" data-testid="view-table">
                  <Table2 className="w-4 h-4 mr-2" />
                  表格
                </TabsTrigger>
                <TabsTrigger value="chart" data-testid="view-chart">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  图表
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </Card>

      {/* 数据展示区 */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            加载中...
          </div>
        ) : viewMode === 'table' ? (
          renderTableView()
        ) : (
          renderChartView()
        )}
      </Card>
    </div>
  );
}
