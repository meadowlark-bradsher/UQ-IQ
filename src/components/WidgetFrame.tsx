import type { ReactNode } from 'react';
import { Loading } from './Loading';
import { ErrorState } from './ErrorState';

export type WidgetStatus = 'loading' | 'error' | 'ready' | 'empty';

// Shared shell every widget renders through (spec §4.3): loading / error / empty
// / ready. No widget should ever render a raw crash or an empty white box.
export function WidgetFrame({
  title,
  caption,
  status,
  error,
  onRetry,
  emptyLabel = 'No data to display.',
  children,
}: {
  title?: string;
  caption?: ReactNode;
  status: WidgetStatus;
  error?: unknown;
  onRetry?: () => void;
  emptyLabel?: string;
  children?: ReactNode;
}) {
  return (
    <section className="my-8 rounded-xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      {title && <h3 className="text-base font-semibold tracking-tight">{title}</h3>}
      {caption && <p className="mt-1 text-sm text-ink/60">{caption}</p>}
      <div className={title || caption ? 'mt-4' : ''}>
        {status === 'loading' && <Loading />}
        {status === 'error' && <ErrorState error={error} onRetry={onRetry} />}
        {status === 'empty' && <p className="py-8 text-sm text-ink/50">{emptyLabel}</p>}
        {status === 'ready' && children}
      </div>
    </section>
  );
}
