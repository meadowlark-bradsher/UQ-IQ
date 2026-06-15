import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDataProvider } from '../../data/context';
import type { TwentyQDomain } from '../../data/types';
import { useAsync } from '../../components/useAsync';
import { WidgetFrame } from '../../components/WidgetFrame';
import { eig } from '../../lib/entropy';
import { priorVector, yesVector } from '../../lib/domain';

const fmt = (x: number, d = 3) => x.toFixed(d);

export function EigCalculator({ domainId = 'animals-toy' }: { domainId?: string }) {
  const provider = useDataProvider();
  const { status, data, error, reload } = useAsync<TwentyQDomain>(
    () => provider.getDomain(domainId),
    [domainId],
  );

  return (
    <WidgetFrame
      title="Expected information gain"
      caption="Why some 20-questions questions are better than others. Pick a preset question, or toggle which secrets answer “yes” to build your own."
      status={status}
      error={error}
      onRetry={reload}
    >
      {data && <EigInner domain={data} />}
    </WidgetFrame>
  );
}

function EigInner({ domain }: { domain: TwentyQDomain }) {
  const prior = useMemo(() => priorVector(domain), [domain]);
  const priorTotal = useMemo(() => prior.reduce((a, b) => a + b, 0), [prior]);

  const [yesSet, setYesSet] = useState<Set<string>>(
    () => new Set(domain.questions[0]?.yesIds ?? []),
  );
  const [activePreset, setActivePreset] = useState<string | null>(
    domain.questions[0]?.id ?? null,
  );

  const currentYes = useMemo(
    () => domain.secrets.map((s) => yesSet.has(s.id)),
    [domain.secrets, yesSet],
  );
  const result = useMemo(() => eig(prior, currentYes), [prior, currentYes]);
  const degenerate = result.pYes === 0 || result.pYes === 1;

  // Rank presets by EIG; identify the greedy (max-EIG) question.
  const ranking = useMemo(() => {
    const rows = domain.questions.map((q) => ({
      q,
      value: eig(prior, yesVector(domain, q.yesIds)).eig,
    }));
    rows.sort((a, b) => b.value - a.value);
    return rows;
  }, [domain, prior]);
  const greedyId = ranking[0]?.q.id;

  const selectPreset = (id: string, yesIds: string[]) => {
    setYesSet(new Set(yesIds));
    setActivePreset(id);
  };
  const toggleSecret = (id: string) => {
    setYesSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setActivePreset(null); // editing makes it a custom question
  };

  const barData = domain.secrets.map((s, i) => ({
    label: s.label,
    p: priorTotal > 0 ? prior[i]! / priorTotal : 0,
    yes: currentYes[i]!,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: secrets / prior, and custom-question toggles */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink/50">
          Secrets &amp; prior {domain.prior ? '' : '(uniform)'}
        </p>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-30} dy={8} height={48} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
              <Tooltip formatter={(v: number) => fmt(v)} labelStyle={{ fontSize: 12 }} />
              <Bar dataKey="p" radius={[3, 3, 0, 0]}>
                {barData.map((d, i) => (
                  <Cell key={i} fill={d.yes ? '#3b5bdb' : '#adb5bd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-ink/50">
          <span className="text-accent">Blue</span> = answers “yes” to the current question;
          gray = “no”. Click a secret to toggle it.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {domain.secrets.map((s) => {
            const on = yesSet.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSecret(s.id)}
                className={
                  'rounded-full border px-2.5 py-1 text-xs transition ' +
                  (on
                    ? 'border-accent bg-accent text-white'
                    : 'border-ink/20 bg-white text-ink/70 hover:border-ink/40')
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: metrics + preset ranking */}
      <div>
        <div className="rounded-lg bg-ink/[0.03] p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
                Expected information gain
              </p>
              <p className="text-3xl font-semibold tabular-nums text-accent">
                {fmt(result.eig)} <span className="text-base font-normal text-ink/50">bits</span>
              </p>
            </div>
            {activePreset == null && (
              <span className="rounded bg-ink/10 px-2 py-0.5 text-xs text-ink/60">
                custom question
              </span>
            )}
          </div>
          {/* EIG gauge: max possible one-step gain is H(prior). */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: `${result.hPrior > 0 ? (100 * result.eig) / result.hPrior : 0}%`,
              }}
            />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums">
            <dt className="text-ink/60">p(yes)</dt>
            <dd className="text-right">{fmt(result.pYes)}</dd>
            <dt className="text-ink/60">H(prior)</dt>
            <dd className="text-right">{fmt(result.hPrior)} bits</dd>
            <dt className="text-ink/60">H(posterior | yes)</dt>
            <dd className="text-right">{fmt(result.hYes)} bits</dd>
            <dt className="text-ink/60">H(posterior | no)</dt>
            <dd className="text-right">{fmt(result.hNo)} bits</dd>
            <dt className="text-ink/60">Expected posterior H</dt>
            <dd className="text-right">{fmt(result.expectedPosteriorEntropy)} bits</dd>
          </dl>
          {degenerate && (
            <p className="mt-3 rounded border border-flag/30 bg-flag/5 px-3 py-2 text-xs text-flag">
              This question sends every secret to one side — it tells you nothing (EIG = 0).
            </p>
          )}
        </div>

        <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-ink/50">
          Preset questions, ranked by EIG
        </p>
        <ul className="space-y-1.5">
          {ranking.map(({ q, value }) => {
            const isGreedy = q.id === greedyId;
            const isActive = q.id === activePreset;
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => selectPreset(q.id, q.yesIds)}
                  aria-pressed={isActive}
                  className={
                    'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ' +
                    (isActive ? 'border-accent ring-1 ring-accent ' : 'border-ink/10 ') +
                    (isGreedy ? 'bg-survivor/5' : 'hover:bg-ink/[0.03]')
                  }
                >
                  <span className="flex-1">{q.text}</span>
                  {isGreedy && (
                    <span className="rounded bg-survivor/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-survivor">
                      greedy
                    </span>
                  )}
                  <span className="w-28 shrink-0">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{
                            width: `${result.hPrior > 0 ? (100 * value) / result.hPrior : 0}%`,
                          }}
                        />
                      </span>
                      <span className="w-10 text-right tabular-nums text-xs text-ink/70">
                        {fmt(value, 2)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
