export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-lg border border-flag/30 bg-flag/5 px-4 py-5 text-sm" role="alert">
      <p className="font-medium text-flag">Something went wrong loading this widget.</p>
      <p className="mt-1 break-words font-mono text-xs text-ink/70">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded border border-flag/40 px-3 py-1 text-xs font-medium text-flag hover:bg-flag/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}
