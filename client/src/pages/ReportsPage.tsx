import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

type GroupByDimension = 'channel' | 'date' | 'team' | 'agent';

export default function ReportsPage() {
  // 分组维度
  const [groupBy, setGroupBy] = useState<GroupByDimension>('channel');
  
  // 筛选状态
  const [dateStart, setDateStart] = useState<Date | undefined>();
  const [dateEnd, setDateEnd] = useState<Date | undefined>();

  // 构建查询参数
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    // 日期范围处理
    if (dateStart) {
      params.append('dateStart', format(dateStart, 'yyyy-MM-dd'));
    }
    if (dateEnd) {
      params.append('dateEnd', format(dateEnd, 'yyyy-MM-dd'));
    }
    
    return params.toString();
  };

  // 获取汇总报表数据
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['/api/reports/summary-tables', dateStart, dateEnd],
    queryFn: async () => {
      const params = buildQueryParams();
      const url = `/api/reports/summary-tables${params ? `?${params}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('获取报表数据失败');
      return response.json();
    }
  });

  const data = summaryData?.data || {};
  const { dateChannelMatrix = [], channelSummary = [], agentSummary = [], dateSummary = [], teamSummary = [], meta = { channels: [], dates: [], teams: [] } } = data;

  // 重置所有筛选条件
  const resetFilters = () => {
    setDateStart(undefined);
    setDateEnd(undefined);
  };

  // 是否有激活的筛选
  const hasActiveFilters = dateStart || dateEnd;

  // 格式化日期显示
  const formatDateRange = () => {
    if (!dateStart && !dateEnd) return '选择日期';
    if (dateStart && !dateEnd) return format(dateStart, 'yyyy年M月d日');
    if (!dateStart && dateEnd) return format(dateEnd, 'yyyy年M月d日');
    if (dateStart && dateEnd) {
      if (format(dateStart, 'yyyy-MM-dd') === format(dateEnd, 'yyyy-MM-dd')) {
        return format(dateStart, 'yyyy年M月d日');
      }
      return `${format(dateStart, 'M月d日')} - ${format(dateEnd, 'M月d日')}`;
    }
    return '选择日期';
  };

  // 获取当前维度的表格标题
  const getDimensionLabel = () => {
    switch (groupBy) {
      case 'channel': return '渠道';
      case 'date': return '日期';
      case 'team': return '团队';
      case 'agent': return '业务员';
      default: return '维度';
    }
  };

  // 根据维度获取数据
  const getTableData = () => {
    switch (groupBy) {
      case 'channel':
        return channelSummary.map((row: any) => ({
          dimension: row.channel,
          ...row
        }));
      case 'date':
        return dateSummary.map((row: any) => ({
          dimension: row.date,
          ...row
        }));
      case 'team':
        return teamSummary.map((row: any) => ({
          dimension: row.team,
          ...row
        }));
      case 'agent':
        return agentSummary.map((row: any) => ({
          dimension: `${row.agentName}${row.agentNickname ? `(${row.agentNickname})` : ''}`,
          ...row
        }));
      default:
        return [];
    }
  };

  const tableData = getTableData();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="heading-reports">数据报表</h1>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            data-testid="button-reset-filters"
          >
            <X className="h-4 w-4 mr-2" />
            清除筛选
          </Button>
        )}
      </div>

      {/* 筛选器区域 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">筛选条件</span>
        </div>
        <div className="flex flex-wrap gap-4">
          {/* 分组维度选择 */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">分组:</span>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByDimension)}>
              <SelectTrigger className="w-[140px]" data-testid="select-groupby">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="channel" data-testid="option-channel">按渠道</SelectItem>
                <SelectItem value="date" data-testid="option-date">按日期</SelectItem>
                <SelectItem value="team" data-testid="option-team">按团队</SelectItem>
                <SelectItem value="agent" data-testid="option-agent">按业务员</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 日期选择器 */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">日期:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-date-filter">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b">
                  <div className="text-sm font-medium mb-2">开始日期</div>
                  <Calendar
                    mode="single"
                    selected={dateStart}
                    onSelect={setDateStart}
                    data-testid="calendar-start"
                  />
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium mb-2">结束日期</div>
                  <Calendar
                    mode="single"
                    selected={dateEnd}
                    onSelect={setDateEnd}
                    data-testid="calendar-end"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      {/* 加载状态 */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          加载中...
        </div>
      )}

      {!isLoading && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4" data-testid="heading-table">
            按{getDimensionLabel()}查看数据
          </h2>
          <div className="overflow-x-auto">
            <Table data-testid="table-multidim">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold min-w-[120px]">{getDimensionLabel()}</TableHead>
                  <TableHead className="text-center min-w-[80px]">进线</TableHead>
                  <TableHead className="text-center min-w-[90px]">已读不回</TableHead>
                  <TableHead className="text-center min-w-[90px]">不读不回</TableHead>
                  <TableHead className="text-center min-w-[80px]">进群</TableHead>
                  <TableHead className="text-center min-w-[80px]">接电话</TableHead>
                  <TableHead className="text-center min-w-[80px]">股民</TableHead>
                  <TableHead className="text-center min-w-[80px]">小白</TableHead>
                  <TableHead className="text-center min-w-[80px]">跟票</TableHead>
                  <TableHead className="text-center min-w-[80px]">热聊</TableHead>
                  <TableHead className="text-center min-w-[80px]">走心</TableHead>
                  <TableHead className="text-center min-w-[80px]">开户</TableHead>
                  <TableHead className="text-center min-w-[80px]">首冲</TableHead>
                  <TableHead className="text-center min-w-[80px]">加金</TableHead>
                  <TableHead className="text-center min-w-[90px]">当日回复</TableHead>
                  <TableHead className="text-center min-w-[90px]">持股跟踪</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((row: any, idx: number) => (
                    <TableRow key={idx} data-testid={`row-${idx}`}>
                      <TableCell className="font-medium">{row.dimension}</TableCell>
                      <TableCell className="text-center">{row.total || 0}</TableCell>
                      <TableCell className="text-center">{row.readNoReply || 0}</TableCell>
                      <TableCell className="text-center">{row.noReadNoReply || 0}</TableCell>
                      <TableCell className="text-center">{row.joinedGroup || 0}</TableCell>
                      <TableCell className="text-center">{row.answeredCall || 0}</TableCell>
                      <TableCell className="text-center">{row.investor || 0}</TableCell>
                      <TableCell className="text-center">{row.beginner || 0}</TableCell>
                      <TableCell className="text-center">{row.followStock || 0}</TableCell>
                      <TableCell className="text-center">{row.hotChat || 0}</TableCell>
                      <TableCell className="text-center">{row.sincere || 0}</TableCell>
                      <TableCell className="text-center">{row.openedAccount || 0}</TableCell>
                      <TableCell className="text-center">{row.firstDeposit || 0}</TableCell>
                      <TableCell className="text-center">{row.addedFunds || 0}</TableCell>
                      <TableCell className="text-center">{row.repliedToday || 0}</TableCell>
                      <TableCell className="text-center">{row.stockTracking || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
