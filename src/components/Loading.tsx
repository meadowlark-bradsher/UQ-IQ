export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-3 py-10 text-ink/60"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-accent"
        aria-hidden
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
