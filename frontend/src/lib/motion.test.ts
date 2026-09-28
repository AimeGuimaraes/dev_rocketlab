import { afterEach, describe, expect, it, vi } from 'vitest';

import { prefersReducedMotion } from './motion';

function mockMatchMedia(matches: boolean) {
  const matchMedia = vi.fn((query: string) => ({ matches, media: query }) as MediaQueryList);
  vi.stubGlobal('matchMedia', matchMedia);
  return matchMedia;
}

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('segue a media query prefers-reduced-motion', () => {
    const matchMedia = mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');

    mockMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('assume movimento normal quando matchMedia não existe', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});
