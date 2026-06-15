import { useMemo, useState } from 'react';
import { useDataProvider } from '../../data/context';
import type { TwentyQDomain } from '../../data/types';
import { useAsync } from '../../components/useAsync';
import { WidgetFrame } from '../../components/WidgetFrame';
import {
  applyAnswer,
  fullMask,
  maskToString,
  meet,
  popcount,
  yesMask,
  type Answer,
  type Constraint,
} from '../../lib/bitmask';
import { secretOrder } from '../../lib/domain';

export function BitmaskElimination({ domainId = 'animals-toy' }: { domainId?: string }) {
  const provider = useDataProvider();
  const { status, data, error, reload } = useAsync<TwentyQDomain>(
    () => provider.getDomain(domainId),
    [domainId],
  );
  return (
    <WidgetFrame
      title="Elimination by meet (bitwise AND)"
      caption="Each answer is a constraint; the surviving set is the meet of the masks. Survivors shrink monotonically — and the final set is the same in any order."
      status={status}
      error={error}
      onRetry={reload}
    >
      {data && <BitmaskInner domain={data} />}
    </WidgetFrame>
  );
}

function BitmaskInner({ domain }: { domain: TwentyQDomain }) {
  const order = useMemo(() => secretOrder(domain), [domain]);
  const n = order.length;
  const qMasks = useMemo(
    () => new Map(domain.questions.map((q) => [q.id, yesMask(order, q.yesIds)])),
    [domain.questions, order],
  );

  // answers: which questions are answered and how. appliedOrder: order imposed.
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [appliedOrder, setAppliedOrder] = useState<string[]>([]);

  const setAnswer = (qid: string, answer: Answer) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      if (next.get(qid) === answer) {
        next.delete(qid); // toggling the same answer clears it
      } else {
        next.set(qid, answer);
      }
      return next;
    });
    setAppliedOrder((prev) => {
      const wasSet = answers.get(qid) === answer; // about to be cleared
      if (wasSet) return prev.filter((id) => id !== qid);
      return prev.includes(qid) ? prev : [...prev, qid];
    });
  };

  const reset = () => {
    setAnswers(new Map());
    setAppliedOrder([]);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setAppliedOrder((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j]!, next[idx]!];
      return next;
    });
  };

  const constraints: Constraint[] = useMemo(
    () =>
      appliedOrder.flatMap((qid) => {
        const answer = answers.get(qid);
        const qMask = qMasks.get(qid);
        return answer && qMask !== undefined ? [{ qMask, answer }] : [];
      }),
    [appliedOrder, answers, qMasks],
  );

  // Stepwise meet in the chosen order — shows monotone shrink.
  const steps = useMemo(() => {
    let m = fullMask(n);
    const out = [{ qid: null as string | null, mask: m, count: popcount(m) }];
    appliedOrder.forEach((qid) => {
      const answer = answers.get(qid)!;
      m = applyAnswer(m, qMasks.get(qid)!, answer, n);
      out.push({ qid, mask: m, count: popcount(m) });
    });
    return out;
  }, [appliedOrder, answers, qMasks, n]);

  const finalMask = steps[steps.length - 1]!.mask;

  // Order-invariance check: the meet of the reversed and a rotated order must
  // equal the chosen-order result. AND is commutative, so this always holds —
  // we compute it live and display the equality (acceptance §8.3).
  const invariance = useMemo(() => {
    if (constraints.length < 2) return { checked: false, equal: true };
    const reversed = meet([...constraints].reverse(), n);
    const rotated = meet([...constraints.slice(1), constraints[0]!], n);
    return { checked: true, equal: reversed === finalMask && rotated === finalMask };
  }, [constraints, finalMask, n]);

  const survivorCount = popcount(finalMask);
  const survivorEntropy = survivorCount > 0 ? Math.log2(survivorCount) : 0;

  return (
    <div className="space-y-6">
      {/* Secrets grid */}
      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {domain.secrets.map((s, i) => {
            const alive = (finalMask & (1 << i)) !== 0;
            return (
              <div
                key={s.id}
                className={
                  'rounded-lg border px-3 py-2 text-sm transition ' +
                  (alive
                    ? 'border-survivor/40 bg-survivor/10 text-ink'
                    : 'border-ink/10 bg-ink/[0.02] text-ink/30 line-through')
                }
              >
                {s.label}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm tabular-nums">
          <span>
            <span className="text-ink/60">survivors:</span>{' '}
            <span className="font-semibold text-survivor">{survivorCount}</span> / {n}
          </span>
          <span>
            <span className="text-ink/60">entropy:</span>{' '}
            <span className="font-semibold">{survivorEntropy.toFixed(3)}</span> bits
          </span>
          <span className="font-mono text-xs">
            <span className="text-ink/60">mask:</span> {maskToString(finalMask, n)}
          </span>
        </div>
      </div>

      {/* Question controls */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/50">
          Answer questions
        </p>
        <ul className="space-y-1.5">
          {domain.questions.map((q) => {
            const a = answers.get(q.id);
            return (
              <li key={q.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm">{q.text}</span>
                {(['yes', 'no'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={a === opt}
                    onClick={() => setAnswer(q.id, opt)}
                    className={
                      'w-12 rounded border px-2 py-1 text-xs font-medium uppercase transition ' +
                      (a === opt
                        ? opt === 'yes'
                          ? 'border-survivor bg-survivor text-white'
                          : 'border-ink/60 bg-ink text-white'
                        : 'border-ink/20 text-ink/60 hover:border-ink/40')
                    }
                  >
                    {opt}
                  </button>
                ))}
              </li>
            );
          })}
        </ul>
        {appliedOrder.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-xs font-medium text-accent hover:underline"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Applied-constraint order + invariance proof */}
      {appliedOrder.length > 0 && (
        <div className="rounded-lg bg-ink/[0.03] p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/50">
            Order constraints were applied (reorder to test invariance)
          </p>
          <ol className="space-y-1.5">
            {steps.slice(1).map((step, idx) => {
              const q = domain.questions.find((qq) => qq.id === step.qid)!;
              return (
                <li
                  key={step.qid}
                  className="flex items-center gap-2 rounded border border-ink/10 bg-white px-2 py-1.5 text-sm"
                >
                  <span className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move earlier"
                      className="rounded px-1 text-ink/40 enabled:hover:text-ink disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      disabled={idx === appliedOrder.length - 1}
                      aria-label="Move later"
                      className="rounded px-1 text-ink/40 enabled:hover:text-ink disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </span>
                  <span className="flex-1">
                    {q.text}{' '}
                    <span
                      className={
                        'font-semibold ' +
                        (answers.get(step.qid!) === 'yes' ? 'text-survivor' : 'text-ink')
                      }
                    >
                      → {answers.get(step.qid!)}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-ink/50">
                    {maskToString(step.mask, n)} ({step.count})
                  </span>
                </li>
              );
            })}
          </ol>
          {invariance.checked && (
            <p
              className={
                'mt-3 rounded px-3 py-2 text-xs ' +
                (invariance.equal
                  ? 'bg-survivor/10 text-survivor'
                  : 'bg-flag/10 text-flag')
              }
            >
              {invariance.equal
                ? '✓ Same result, any order — reversing or rotating the constraints gives a byte-identical survivor set. The meet is commutative.'
                : '✗ Order-invariance violated — this should never happen.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
