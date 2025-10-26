import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface CustomerTagProps {
  label: string;
  type: 'status' | 'learning' | 'conversion';
  onRemove?: () => void;
  selected?: boolean;
}

const typeStyles = {
  status: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600',
  learning: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700',
  conversion: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700'
};

export default function CustomerTag({ label, type, onRemove, selected = false }: CustomerTagProps) {
  return (
    <Badge 
      variant="outline"
      className={`${typeStyles[type]} ${selected ? 'ring-2 ring-primary ring-offset-1' : ''} gap-1 font-medium`}
      data-testid={`tag-${label}`}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover-elevate rounded-full"
          data-testid={`button-remove-tag-${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
