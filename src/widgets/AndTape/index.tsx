import { useMemo, useRef, useState } from 'react';
import { useDataProvider } from '../../data/context';
import type { TwentyQDomain, Question } from '../../data/types';
import { useAsync } from '../../components/useAsync';
import { WidgetFrame } from '../../components/WidgetFrame';
import { yesVector } from '../../lib/domain';

// The question whose complement seeds the starting belief ("warm-blooded" =
// not cold-blooded). Data-driven: the baseline is derived from domain data, not
// hardcoded animal ids. If absent, the belief starts as the full set.
const BASELINE_SOURCE_ID = 'q_cold';
const BASELINE_LABEL = 'warm-blooded';

export function AndTape({
  domainId = 'animals-toy',
  maxAdds = 2,
}: {
  domainId?: string;
  maxAdds?: number;
}) {
  const provider = useDataProvider();
  const { status, data, error, reload } = useAsync<TwentyQDomain>(
    () => provider.getDomain(domainId),
    [domainId],
  );
  return (
    <WidgetFrame
      title="Folding answers with AND"
      caption="A belief is a set of still-possible secrets — a bitmask. Each answer is another mask; combining them is a bitwise AND. Add questions and watch the belief shrink, one fold at a time."
      status={status}
      error={error}
      onRetry={reload}
    >
      {data && <Inner domain={data} maxAdds={maxAdds} />}
    </WidgetFrame>
  );
}

type RowKind = 'belief' | 'op' | 'result';
interface TapeRow {
  id: number;
  kind: RowKind;
  label: string;
  bits: number[];
  prevBits?: number[];
  settled?: boolean;
  isNew?: boolean;
}

const bitsOf = (domain: TwentyQDomain, yesIds: string[]): number[] =>
  yesVector(domain, yesIds).map((b): number => (b ? 1 : 0));
const count = (bits: number[]): number => bits.reduce((a, b) => a + b, 0);

function Inner({ domain, maxAdds }: { domain: TwentyQDomain; maxAdds: number }) {
  const { secrets } = domain;
  const n = secrets.length;
  const cols = `9rem repeat(${n}, minmax(2rem, 1fr))`;

  // Starting belief = complement of the baseline-source question (warm-blooded),
  // derived from the domain. Falls back to the full set.
  const baseline = useMemo(() => {
    const src = domain.questions.find((q) => q.id === BASELINE_SOURCE_ID);
    if (!src) return { label: 'all animals', bits: secrets.map((): number => 1) };
    const inSource = yesVector(domain, src.yesIds);
    return { label: BASELINE_LABEL, bits: inSource.map((b): number => (b ? 0 : 1)) };
  }, [domain, secrets]);

  // The questions the reader can AND in (everything except the baseline source).
  const pool: Question[] = useMemo(
    () => domain.questions.filter((q) => q.id !== BASELINE_SOURCE_ID),
    [domain.questions],
  );

  const baseRow = (): TapeRow => ({
    id: 0,
    kind: 'belief',
    label: `${baseline.label} · ${count(baseline.bits)}`,
    bits: baseline.bits,
  });

  const [rows, setRows] = useState<TapeRow[]>(() => [baseRow()]);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [adds, setAdds] = useState(0);
  const busy = useRef(false);
  const acc = useRef<number[]>(baseline.bits.slice());
  const nextId = useRef(1);

  function addQuestion(q: Question) {
    if (busy.current || adds >= maxAdds || used.has(q.id)) return;
    busy.current = true;
    const qbits = bitsOf(domain, q.yesIds);

    const opRow: TapeRow = {
      id: nextId.current++,
      kind: 'op',
      label: `∧ ${q.text}`,
      bits: qbits,
      isNew: true,
    };
    setRows((r) => [...r, opRow]);
    setUsed((u) => new Set(u).add(q.id));
    setAdds((a) => a + 1);

    window.setTimeout(() => {
      const prev = acc.current.slice();
      const nb = prev.map((b, k) => b & qbits[k]!);
      acc.current = nb;
      const resId = nextId.current++;
      const resRow: TapeRow = {
        id: resId,
        kind: 'result',
        label: `= belief · ${count(nb)}`,
        bits: nb,
        prevBits: prev,
        settled: false,
        isNew: true,
      };
      setRows((r) => [...r, resRow]);
      window.setTimeout(() => {
        setRows((r) => r.map((row) => (row.id === resId ? { ...row, settled: true } : row)));
        busy.current = false;
      }, 420);
    }, 280);
  }

  function reset() {
    if (busy.current) return;
    acc.current = baseline.bits.slice();
    nextId.current = 1;
    setRows([baseRow()]);
    setUsed(new Set());
    setAdds(0);
  }

  const cellBase =
    'rounded-md py-1.5 text-center font-mono text-base transition-colors duration-300';
  const lit = 'bg-accent/10 text-accent font-medium';
  const dim = 'bg-ink/[0.04] text-ink/40';

  function cellClass(row: TapeRow, j: number): string {
    const b = row.bits[j];
    if (row.kind === 'op') return `${cellBase} ${b ? 'text-ink' : 'text-eliminated'}`;
    if (row.kind === 'belief') return `${cellBase} ${b ? lit : dim}`;
    // result row
    const prev = row.prevBits ?? row.bits;
    const dying = prev[j] === 1 && b === 0;
    if (!row.settled && dying) return `${cellBase} bg-flag/15 font-medium text-flag`;
    return `${cellBase} ${b ? lit : dim}`;
  }
  function cellText(row: TapeRow, j: number): string {
    if (row.kind === 'result' && !row.settled) {
      const prev = row.prevBits ?? row.bits;
      if (prev[j] === 1 && row.bits[j] === 0) return '1'; // show the bit just before it dies
    }
    return String(row.bits[j]);
  }

  const labelCls = 'truncate pr-2 text-right text-sm text-ink/50';

  return (
    <div>
      {/* Question picker */}
      <div className="mb-2 text-sm text-ink/50">add a question (pick {maxAdds})</div>
      <div className="mb-5 flex flex-wrap gap-2">
        {pool.map((q) => {
          const disabled = used.has(q.id) || adds >= maxAdds;
          return (
            <button
              key={q.id}
              type="button"
              disabled={disabled}
              onClick={() => addQuestion(q)}
              className={
                'rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-ink/80 transition ' +
                (disabled ? 'cursor-default opacity-40' : 'hover:border-ink/30')
              }
            >
              {q.text}
            </button>
          );
        })}
      </div>

      {/* Tape (scrolls horizontally on narrow screens) */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="min-w-[34rem]">
          {/* Secret header */}
          <div
            className="mb-2 grid items-center gap-1"
            style={{ gridTemplateColumns: cols }}
          >
            <div className="pr-2 text-right text-xs text-ink/40">secret</div>
            {secrets.map((s) => (
              <div key={s.id} className="text-center text-[11px] leading-tight text-ink/40">
                {s.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row) => (
            <div key={row.id}>
              {row.kind === 'result' && (
                <div
                  className="my-1 grid items-center gap-1"
                  style={{ gridTemplateColumns: '9rem 1fr' }}
                >
                  <div className="pr-2 text-right text-xs text-ink/40">AND</div>
                  <div className="border-t border-ink/15" />
                </div>
              )}
              <div
                className={'mb-1.5 grid items-center gap-1 ' + (row.isNew ? 'animate-tape-enter' : '')}
                style={{ gridTemplateColumns: cols }}
              >
                <div className={labelCls}>{row.label}</div>
                {secrets.map((s, j) => (
                  <div key={s.id} className={cellClass(row, j)}>
                    {cellText(row, j)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-ink/80 transition hover:border-ink/30"
      >
        reset
      </button>
    </div>
  );
}
