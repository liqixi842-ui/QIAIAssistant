import { type Customer, type User } from "@shared/schema";
import { format, parseISO, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

export type GroupByDimension = 'channel' | 'agent' | 'team' | 'day' | 'week' | 'month' | 'country';
export type MetricKey = 'total' | 'readNoReply' | 'noReadNoReply' | 'joinedGroup' | 'answeredCall' | 
  'investor' | 'beginner' | 'followStock' | 'hotChat' | 'repliedToday' | 
  'stockTracking' | 'sincere' | 'openedAccount' | 'firstDeposit' | 'addedFunds';

export interface MetricsResult {
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

export interface GroupedResult {
  dimension: string; // 维度值，如渠道名、日期等
  dimensionLabel: string; // 维度显示标签
  metrics: MetricsResult;
}

export interface AnalysisResult {
  meta: {
    groupBy: GroupByDimension;
    totalRecords: number;
    dateRange?: { start?: string; end?: string };
  };
  results: GroupedResult[];
  totals: MetricsResult;
}

/**
 * 计算单个客户的指标贡献
 */
function calculateCustomerMetrics(customer: Customer): Partial<MetricsResult> {
  const tags = customer.tags || [];
  const tagLabels = tags.map(t => t.label);
  const metrics: Partial<MetricsResult> = {
    total: 1,
  };

  // 根据tags统计各项指标
  if (tagLabels.includes('已读不回')) metrics.readNoReply = 1;
  if (tagLabels.includes('不读不回')) metrics.noReadNoReply = 1;
  if (tagLabels.includes('进群')) metrics.joinedGroup = 1;
  if (tagLabels.includes('接电话')) metrics.answeredCall = 1;
  if (tagLabels.includes('股民')) metrics.investor = 1;
  if (tagLabels.includes('小白')) metrics.beginner = 1;
  if (tagLabels.includes('跟票')) metrics.followStock = 1;
  if (tagLabels.includes('热聊')) metrics.hotChat = 1;
  if (tagLabels.includes('当日回复')) metrics.repliedToday = 1;
  if (tagLabels.includes('持股跟踪')) metrics.stockTracking = 1;
  if (tagLabels.includes('走心')) metrics.sincere = 1;
  
  // 开户：需要有"开户"标签
  if (tagLabels.includes('开户')) metrics.openedAccount = 1;
  
  // 首冲：需要同时有"开户"和"入金"标签
  if (tagLabels.includes('开户') && tagLabels.includes('入金')) metrics.firstDeposit = 1;
  
  // 加金：只需要有"入金"标签（不要求开户）
  if (tagLabels.includes('入金')) metrics.addedFunds = 1;

  return metrics;
}

/**
 * 合并多个指标结果
 */
function mergeMetrics(metrics: Partial<MetricsResult>[]): MetricsResult {
  const result: MetricsResult = {
    total: 0,
    readNoReply: 0,
    noReadNoReply: 0,
    joinedGroup: 0,
    answeredCall: 0,
    investor: 0,
    beginner: 0,
    followStock: 0,
    hotChat: 0,
    repliedToday: 0,
    stockTracking: 0,
    sincere: 0,
    openedAccount: 0,
    firstDeposit: 0,
    addedFunds: 0,
  };

  for (const metric of metrics) {
    result.total += metric.total || 0;
    result.readNoReply += metric.readNoReply || 0;
    result.noReadNoReply += metric.noReadNoReply || 0;
    result.joinedGroup += metric.joinedGroup || 0;
    result.answeredCall += metric.answeredCall || 0;
    result.investor += metric.investor || 0;
    result.beginner += metric.beginner || 0;
    result.followStock += metric.followStock || 0;
    result.hotChat += metric.hotChat || 0;
    result.repliedToday += metric.repliedToday || 0;
    result.stockTracking += metric.stockTracking || 0;
    result.sincere += metric.sincere || 0;
    result.openedAccount += metric.openedAccount || 0;
    result.firstDeposit += metric.firstDeposit || 0;
    result.addedFunds += metric.addedFunds || 0;
  }

  return result;
}

/**
 * 获取分组的键值
 * 注意：对于agent维度，即使createdBy为空，也返回一个特殊的键来保证标签一致性
 */
function getGroupKey(customer: Customer, groupBy: GroupByDimension, users?: Map<string, User>): string {
  switch (groupBy) {
    case 'channel':
      return customer.channel || '未知渠道';
    case 'agent':
      // 始终返回userId或特殊键，确保与getGroupLabel一致
      return customer.createdBy || '__unknown_agent__';
    case 'team':
      if (users && customer.createdBy) {
        const user = users.get(customer.createdBy);
        return user?.team || '未知团队';
      }
      return '未知团队';
    case 'country':
      return customer.country || '未知国家';
    case 'day':
      return customer.date ? format(parseISO(customer.date), 'yyyy-MM-dd') : '未知日期';
    case 'week':
      return customer.date ? format(startOfWeek(parseISO(customer.date), { weekStartsOn: 1 }), 'yyyy-MM-dd') : '未知周';
    case 'month':
      return customer.date ? format(startOfMonth(parseISO(customer.date)), 'yyyy-MM') : '未知月';
    default:
      return '未知';
  }
}

/**
 * 获取分组标签（用于显示）
 */
function getGroupLabel(key: string, groupBy: GroupByDimension, users?: Map<string, User>): string {
  switch (groupBy) {
    case 'agent':
      // 处理特殊的未知业务键
      if (key === '__unknown_agent__') {
        return '未知业务';
      }
      if (users) {
        const user = users.get(key);
        return user ? `${user.name}${user.nickname ? `(${user.nickname})` : ''}` : key;
      }
      return key;
    case 'day':
      // 防止对fallback字符串调用parseISO
      if (key.startsWith('未知')) return key;
      try {
        return format(parseISO(key), 'M月d日');
      } catch {
        return key;
      }
    case 'week':
      // 防止对fallback字符串调用parseISO
      if (key.startsWith('未知')) return key;
      try {
        return `${format(parseISO(key), 'M月d日')}周`;
      } catch {
        return key;
      }
    case 'month':
      // 防止对fallback字符串调用parseISO
      if (key.startsWith('未知')) return key;
      try {
        return format(parseISO(key), 'yyyy年M月');
      } catch {
        return key;
      }
    default:
      return key;
  }
}

/**
 * 按维度分组统计数据
 */
export function aggregateByDimension(
  customers: Customer[],
  groupBy: GroupByDimension,
  users?: User[]
): AnalysisResult {
  const usersMap = users ? new Map(users.map(u => [u.id, u])) : undefined;
  
  // 按分组键聚合
  const groupedData = new Map<string, Partial<MetricsResult>[]>();
  
  for (const customer of customers) {
    const groupKey = getGroupKey(customer, groupBy, usersMap);
    if (!groupedData.has(groupKey)) {
      groupedData.set(groupKey, []);
    }
    groupedData.get(groupKey)!.push(calculateCustomerMetrics(customer));
  }

  // 计算每个组的汇总指标
  const results: GroupedResult[] = [];
  const entries = Array.from(groupedData.entries());
  for (const [key, metrics] of entries) {
    results.push({
      dimension: key,
      dimensionLabel: getGroupLabel(key, groupBy, usersMap),
      metrics: mergeMetrics(metrics),
    });
  }

  // 按维度值排序
  results.sort((a, b) => {
    // 时间维度按日期排序
    if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
      return a.dimension.localeCompare(b.dimension);
    }
    // 其他维度按总数降序
    return b.metrics.total - a.metrics.total;
  });

  // 计算总计
  const totals = mergeMetrics(customers.map(calculateCustomerMetrics));

  return {
    meta: {
      groupBy,
      totalRecords: customers.length,
    },
    results,
    totals,
  };
}
