import MetricCard from '../MetricCard';

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-8">
      <MetricCard title="今日发送" value={128} change={12.5} />
      <MetricCard title="回应率" value={68} change={5.2} suffix="%" />
      <MetricCard title="转化率" value={23} change={-3.1} suffix="%" />
      <MetricCard title="活跃客户" value={456} change={8.7} />
    </div>
  );
}
