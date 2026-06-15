import { describe, it, expect } from 'vitest';
import {
  fullMask,
  yesMask,
  complement,
  applyAnswer,
  meet,
  popcount,
  survivorIndices,
  maskToString,
  type Constraint,
} from './bitmask';

// animals-toy secret order (8 secrets)
const order = ['eagle', 'penguin', 'shark', 'dolphin', 'snake', 'frog', 'bat', 'spider'];
const n = order.length;

const mFly = yesMask(order, ['eagle', 'bat']);
const mWater = yesMask(order, ['penguin', 'shark', 'dolphin', 'frog']);
const mMammal = yesMask(order, ['dolphin', 'bat']);

describe('bitmask basics', () => {
  it('fullMask / complement / maskToString agree', () => {
    expect(popcount(fullMask(n))).toBe(8);
    expect(complement(mFly, n)).toBe(fullMask(n) & ~mFly);
    // Secret-order string (secret 0 leftmost): eagle(0)=1 … bat(6)=1
    expect(maskToString(mFly, n)).toBe('10000010');
  });

  it('boolean survivor view always agrees with the bitmask string', () => {
    const idxs = survivorIndices(mWater, n);
    // maskToString is already secret-order, so index === position (no reverse).
    const fromString = maskToString(mWater, n)
      .split('')
      .flatMap((b, i) => (b === '1' ? [i] : []));
    expect(idxs).toEqual(fromString);
  });
});

describe('meet / order invariance (acceptance §8.3)', () => {
  const constraints: Constraint[] = [
    { qMask: mWater, answer: 'yes' },
    { qMask: mMammal, answer: 'yes' },
    { qMask: mFly, answer: 'no' },
  ];

  it('applying constraints monotonically shrinks the survivor set', () => {
    let m = fullMask(n);
    let prev = popcount(m);
    for (const c of constraints) {
      m = applyAnswer(m, c.qMask, c.answer, n);
      const now = popcount(m);
      expect(now).toBeLessThanOrEqual(prev);
      prev = now;
    }
    // water∧mammal∧¬fly → dolphin only
    expect(survivorIndices(m, n)).toEqual([order.indexOf('dolphin')]);
  });

  it('reordering the applied constraints yields a byte-identical survivor set', () => {
    const perms: Constraint[][] = [
      [constraints[0]!, constraints[1]!, constraints[2]!],
      [constraints[2]!, constraints[1]!, constraints[0]!],
      [constraints[1]!, constraints[2]!, constraints[0]!],
    ];
    const results = perms.map((p) => meet(p, n));
    expect(new Set(results).size).toBe(1);
  });
});
