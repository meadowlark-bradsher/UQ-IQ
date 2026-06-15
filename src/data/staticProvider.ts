import { assetUrl } from '../config';
import type { DataProvider } from './provider';
import type { TwentyQDomain, TranscriptPermutation, SecretResult } from './types';

// The only DataProvider implementation in the MVP. Fetches the precomputed JSON
// shipped under public/data and serves from it, with light in-memory caching and
// an index for getCommittedSecret. See spec §6.
export class StaticJsonProvider implements DataProvider {
  private domains = new Map<string, Promise<TwentyQDomain>>();
  private permutations = new Map<string, Promise<TranscriptPermutation[]>>();

  private async fetchJson<T>(file: string): Promise<T> {
    const url = assetUrl(`data/${file}`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  getDomain(domainId: string): Promise<TwentyQDomain> {
    // The MVP ships a single domain file; domainId selects which file once more
    // than one exists. For now map the known id to its file.
    const cached = this.domains.get(domainId);
    if (cached) return cached;
    const p = this.fetchJson<TwentyQDomain>('twentyq-domain.json');
    this.domains.set(domainId, p);
    return p;
  }

  getPermutations(experimentId: string): Promise<TranscriptPermutation[]> {
    const cached = this.permutations.get(experimentId);
    if (cached) return cached;
    const p = this.fetchJson<TranscriptPermutation[]>('transcript-permutations.json');
    this.permutations.set(experimentId, p);
    return p;
  }

  async getCommittedSecret(experimentId: string, orderingId: string): Promise<SecretResult> {
    const perms = await this.getPermutations(experimentId);
    const match = perms.find((p) => p.orderingId === orderingId);
    if (!match) {
      throw new Error(
        `No curated permutation "${orderingId}" for experiment "${experimentId}".`,
      );
    }
    return match.result;
  }
}
