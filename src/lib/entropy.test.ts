import { describe, it, expect } from 'vitest';
import { entropy, eig } from './entropy';

const uniform8 = Array(8).fill(1);

// Fixture yes-groups (animals-toy, secret order:
// eagle, penguin, shark, dolphin, snake, frog, bat, spider)
const order = ['eagle', 'penguin', 'shark', 'dolphin', 'snake', 'frog', 'bat', 'spider'];
const yesVec = (yesIds: string[]) => order.map((id) => yesIds.includes(id));

describe('entropy', () => {
  it('is log2(n) for a uniform distribution', () => {
    expect(entropy(uniform8)).toBeCloseTo(3, 10);
    expect(entropy([1, 1, 1, 1])).toBeCloseTo(2, 10);
  });
  it('is 0 for a point mass and for empty/all-zero sets', () => {
    expect(entropy([1])).toBe(0);
    expect(entropy([0, 5, 0])).toBe(0);
    expect(entropy([])).toBe(0);
    expect(entropy([0, 0])).toBe(0);
  });
});

describe('eig (acceptance §8.1, uniform prior over animals-toy)', () => {
  // q_fly: yes={eagle,bat} (2 of 8). EIG = 3 − [0.25·1 + 0.75·log2(6)].
  it('q_fly ≈ 0.8113 bits', () => {
    const r = eig(uniform8, yesVec(['eagle', 'bat']));
    expect(r.pYes).toBeCloseTo(0.25, 12);
    expect(r.hYes).toBeCloseTo(1, 12);
    expect(r.hNo).toBeCloseTo(Math.log2(6), 12);
    expect(r.eig).toBeCloseTo(3 - (0.25 * 1 + 0.75 * Math.log2(6)), 12);
    expect(r.eig).toBeCloseTo(0.811278, 5);
  });

  // q_water: yes={penguin,shark,dolphin,frog} (4 of 8) → perfect 50/50 split.
  it('q_water = exactly 1 bit (50/50 split maximizes one-step gain)', () => {
    const r = eig(uniform8, yesVec(['penguin', 'shark', 'dolphin', 'frog']));
    expect(r.pYes).toBeCloseTo(0.5, 12);
    expect(r.eig).toBeCloseTo(1, 12);
  });

  it('degenerate question (all-yes or all-no) reports exactly 0', () => {
    expect(eig(uniform8, Array(8).fill(true)).eig).toBe(0);
    expect(eig(uniform8, Array(8).fill(false)).eig).toBe(0);
  });
});
