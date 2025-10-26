import AIRecommendation from '../AIRecommendation';

export default function AIRecommendationExample() {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-2xl">
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Empty State</h3>
        <AIRecommendation hasRecommendation={false} />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">With Recommendation</h3>
        <AIRecommendation hasRecommendation={true} />
      </div>
    </div>
  );
}
