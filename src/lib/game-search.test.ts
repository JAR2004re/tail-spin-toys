import { describe, expect, it } from 'vitest';
import { matchesGameTitle } from './game-search';

describe('matchesGameTitle', () => {
    it('matches titles without regard to case', () => {
        expect(matchesGameTitle('Code Quest', 'CODE')).toBe(true);
    });

    it('ignores surrounding search whitespace', () => {
        expect(matchesGameTitle('Code Quest', '  quest  ')).toBe(true);
    });

    it('matches every title for an empty search term', () => {
        expect(matchesGameTitle('Code Quest', '  ')).toBe(true);
    });

    it('returns false when the title does not contain the search term', () => {
        expect(matchesGameTitle('Code Quest', 'puzzle')).toBe(false);
    });
});
