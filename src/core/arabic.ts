// EyraOS Arabic Natural Language Processing & Normalization Utilities

/**
 * Normalizes Arabic text by removing diacritics, unifying character variants,
 * and stripping non-essential formatting (tatweel, spaces).
 */
export function normalizeArabic(text?: string | null): string {
    if (!text) return '';
    let s = text.trim();
    // Remove diacritics / tashkeel
    s = s.replace(/[\u064B-\u065F\u0670]/g, '');
    // Normalize alef variants (أ, إ, آ, ٱ -> ا)
    s = s.replace(/[أإآٱ]/g, 'ا');
    // Normalize teh marbuta (ة -> ه)
    s = s.replace(/ة/g, 'ه');
    // Normalize alef maksura (ى -> ي)
    s = s.replace(/ى/g, 'ي');
    // Remove tatweel / kashida
    s = s.replace(/ـ/g, '');
    return s.toLowerCase();
}

/**
 * Strips common Arabic definite article ("ال") from word prefix
 * while preserving short root words.
 */
export function stripArabicPrefix(word?: string | null): string {
    const w = normalizeArabic(word);
    if (w.startsWith('ال') && w.length > 3) {
        return w.substring(2);
    }
    return w;
}

/**
 * Matches two Arabic names or entity identifiers allowing for
 * normalization variants, prefix differences, and trailing plurals.
 */
export function isArabicMatch(name1?: string | null, name2?: string | null): boolean {
    if (!name1 || !name2) return false;
    const n1 = normalizeArabic(name1);
    const n2 = normalizeArabic(name2);
    if (n1 === n2) return true;

    // Check with stripped 'ال' prefix
    const s1 = stripArabicPrefix(name1);
    const s2 = stripArabicPrefix(name2);
    if (s1 === s2) return true;

    return false;
}

/**
 * Extracts searchable keywords from an Arabic query or sentence.
 */
export function extractKeywords(text?: string | null): string[] {
    if (!text) return [];
    const normalized = normalizeArabic(text);
    const stopWords = new Set([
        'من', 'في', 'على', 'عن', 'الى', 'إلى', 'مع', 'هذا', 'هذه', 'تم', 'كان',
        'ان', 'أن', 'هل', 'ما', 'ماذا', 'هو', 'هي', 'هم', 'نحن', 'انا', 'أنا',
        'يا', 'كل', 'بعد', 'قبل', 'عند', 'حتى', 'اذا', 'إذا', 'ثم', 'او', 'أو'
    ]);

    const words = normalized
        .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1 && !stopWords.has(w));

    return Array.from(new Set(words));
}
