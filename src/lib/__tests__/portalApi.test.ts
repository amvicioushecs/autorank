import { describe, it, expect } from 'vitest';
import { inviteMailto, portalUrl } from '@/lib/portalApi';

describe('portalApi helpers', () => {
  it('builds portal urls and a mailto with the link encoded', () => {
    const url = portalUrl('abc', 'https://app.example.com');
    expect(url).toBe('https://app.example.com/portal/abc');
    const m = inviteMailto('a@b.co', 'x.com', url);
    expect(m.startsWith('mailto:a%40b.co?subject=')).toBe(true);
    expect(decodeURIComponent(m)).toContain(url);
  });
});
