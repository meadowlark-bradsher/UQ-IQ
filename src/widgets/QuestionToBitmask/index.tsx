import { useMemo, useState } from 'react';
import { useDataProvider } from '../../data/context';
import type { TwentyQDomain } from '../../data/types';
import { useAsync } from '../../components/useAsync';
import { WidgetFrame } from '../../components/WidgetFrame';
import { yesVector } from '../../lib/domain';

// Shows how a single question becomes a bitmask: the oracle's yes/no answer for
// every secret, read left-to-right as bits. Display convention: secret index 0 is
// the most-significant bit (leftmost), so the binary string IS the integer shown.
// (BitmaskElimination uses the standard MSB-last convention; the two are
// reconciled at the bitwise-AND iteration — see the project note.)
export function QuestionToBitmask({ domainId = 'animals-toy' }: { domainId?: string }) {
  const provider = useDataProvider();
  const { status, data, error, reload } = useAsync<TwentyQDomain>(
    () => provider.getDomain(domainId),
    [domainId],
  );
  return (
    <WidgetFrame
      title="From a question to a bitmask"
      caption="Pick a question. The oracle answers yes or no for every secret; read those answers as bits and the whole question collapses to one number — the bitmask of secrets it keeps."
      status={status}
      error={error}
      onRetry={reload}
    >
      {data && <Inner domain={data} />}
    </WidgetFrame>
  );
}

function Inner({ domain }: { domain: TwentyQDomain }) {
  const [selected, setSelected] = useState(0);
  const question = domain.questions[selected] ?? domain.questions[0]!;
  const n = domain.secrets.length;

  const bits = useMemo(
    () => yesVector(domain, question.yesIds).map((b): number => (b ? 1 : 0)),
    [domain, question],
  );
  const binary = bits.join('');
  const integer = parseInt(binary, 2);
  const yesCount = bits.reduce((a, b) => a + b, 0);

  const cellOn = 'border-accent/40 bg-accent/10 text-accent';
  const cellOff = 'border-ink/10 bg-ink/[0.03] text-ink/40';

  return (
    <div>
      {/* Question selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {domain.questions.map((q, i) => {
          const isSel = i === selected;
          return (
            <button
              key={q.id}
              type="button"
              aria-pressed={isSel}
              onClick={() => setSelected(i)}
              className={
                'rounded-lg border px-3 py-1.5 text-sm transition ' +
                (isSel
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-ink/15 text-ink/60 hover:border-ink/30')
              }
            >
              {q.text}
            </button>
          );
        })}
      </div>

      {/* Per-secret answer → bit grid (scrolls horizontally on very small screens) */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div
          className="grid min-w-[24rem] gap-1.5"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {domain.secrets.map((s, i) => {
            const on = bits[i] === 1;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1.5">
                <div className="flex min-h-[2.6em] items-end text-center text-xs leading-tight text-ink/60">
                  {s.label}
                </div>
                <div
                  className={
                    'w-full rounded-md border py-1 text-center text-xs ' +
                    (on ? cellOn : cellOff)
                  }
                >
                  {on ? 'yes' : 'no'}
                </div>
                <div
                  className={
                    'w-full rounded-md border py-1 text-center font-mono text-lg ' +
                    (on ? cellOn : cellOff)
                  }
                >
                  {on ? '1' : '0'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Readout */}
      <div className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-3 rounded-lg border border-ink/10 bg-ink/[0.02] px-4 py-3">
        <div>
          <div className="text-xs text-ink/50">bitmask</div>
          <div className="font-mono text-xl font-medium tracking-[0.15em]">{binary}</div>
        </div>
        <div>
          <div className="text-xs text-ink/50">as integer</div>
          <div className="text-xl font-medium tabular-nums">{integer}</div>
        </div>
        <div>
          <div className="text-xs text-ink/50">yes-group size</div>
          <div className="text-xl font-medium tabular-nums">
            {yesCount} / {n}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink/50">
        <span className="inline-flex items-center gap-2">
          <span className={'inline-block h-3.5 w-3.5 rounded-sm border ' + cellOn} />
          oracle says yes · bit = 1
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={'inline-block h-3.5 w-3.5 rounded-sm border ' + cellOff} />
          oracle says no · bit = 0
        </span>
      </div>
    </div>
  );
}
