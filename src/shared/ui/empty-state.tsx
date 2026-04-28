import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  description?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  message,
  description,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
        <Icon className="h-6 w-6 text-gray-300 dark:text-gray-500" />
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
      {description && (
        <p className="text-xs text-gray-300 dark:text-gray-600">
          {description}
        </p>
      )}
    </div>
  );
}
