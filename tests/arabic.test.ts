import { normalizeArabic, stripArabicPrefix, isArabicMatch, extractKeywords } from '../src/core/arabic';

describe('Arabic Natural Language Processing Core', () => {
    describe('normalizeArabic', () => {
        test('removes tashkeel / diacritics', () => {
            const withTashkeel = 'يَحْيَى المُطَوِّرُ';
            expect(normalizeArabic(withTashkeel)).toBe('يحيي المطور');
        });

        test('normalizes alef variants (أ, إ, آ -> ا)', () => {
            expect(normalizeArabic('أحمد')).toBe('احمد');
            expect(normalizeArabic('إبراهيم')).toBe('ابراهيم');
            expect(normalizeArabic('آدم')).toBe('ادم');
        });

        test('normalizes teh marbuta and alef maksura', () => {
            expect(normalizeArabic('القاهرة')).toBe('القاهره');
            expect(normalizeArabic('مصطفى')).toBe('مصطفي');
        });

        test('removes tatweel / kashida', () => {
            expect(normalizeArabic('روبـــــوت')).toBe('روبوت');
        });
    });

    describe('stripArabicPrefix', () => {
        test('strips definite article ال from longer words', () => {
            expect(stripArabicPrefix('المنيا')).toBe('منيا');
            expect(stripArabicPrefix('الجيزة')).toBe('جيزه');
            expect(stripArabicPrefix('القاهرة')).toBe('قاهره');
        });

        test('preserves short root words', () => {
            expect(stripArabicPrefix('الى')).toBe('الي');
        });
    });

    describe('isArabicMatch', () => {
        test('matches normalized variants', () => {
            expect(isArabicMatch('يحيى', 'يحيي')).toBe(true);
            expect(isArabicMatch('الإسكندرية', 'الاسكندريه')).toBe(true);
        });

        test('matches words with or without definite article', () => {
            expect(isArabicMatch('المنيا', 'منيا')).toBe(true);
            expect(isArabicMatch('القاهرة', 'قاهرة')).toBe(true);
        });

        test('returns false for completely different entities', () => {
            expect(isArabicMatch('القاهرة', 'الإسكندرية')).toBe(false);
            expect(isArabicMatch('يحيى', 'عبدالرحمن')).toBe(false);
        });
    });

    describe('extractKeywords', () => {
        test('filters common Arabic stop words and punctuation', () => {
            const text = 'أنا أعيش في الجيزة وأدرس في جامعة القاهرة';
            const keywords = extractKeywords(text);
            expect(keywords).toContain('اعيش');
            expect(keywords).toContain('الجيزه');
            expect(keywords).toContain('وادرس');
            expect(keywords).toContain('جامعه');
            expect(keywords).toContain('القاهره');
            expect(keywords).not.toContain('في');
            expect(keywords).not.toContain('انا');
        });
    });
});
