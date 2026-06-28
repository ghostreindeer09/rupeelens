// src/client/components/EmptyState.tsx
import type { FC } from "react";
import type { IconProps } from "@tabler/icons-react";

interface EmptyStateProps {
  icon: FC<IconProps>;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ icon: Icon, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center">
        <Icon size={24} stroke={1.5} className="text-ink-tertiary" />
      </div>
      <p className="text-sm text-ink-secondary">{description}</p>
      <button
        onClick={onAction}
        className="text-sm font-medium px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  );
}
