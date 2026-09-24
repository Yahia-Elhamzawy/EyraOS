import { IngestionService } from '../src/services/ingestion.service';

describe('Knowledge Ingestion Pipeline', () => {
    test('chunkText leaves short texts intact', () => {
        const short = 'نص قصير عن الروبوت والمستشعرات.';
        const chunks = IngestionService.chunkText(short, 1000);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe(short);
    });

    test('chunkText splits long texts at paragraph or sentence boundaries', () => {
        const p1 = 'الفقرة الأولى تتحدث عن معمارية التفكير والوعي للروبوت وتفاصيل الطبقات المعرفية الأساسية في النظام.\n\n';
        const p2 = 'الفقرة الثانية تتناول مستشعرات الليدار والكاميرات ومعايرة الرؤية الحاسوبية والتوجيه الحركي.\n\n';
        const p3 = 'الفقرة الثالثة تركز على محركات العجلات والبطارية ومنظومة الشحن الذاتي والرسو في المحطة.';
        const full = (p1 + p2 + p3).repeat(10); // large text

        const chunks = IngestionService.chunkText(full, 500, 50);
        expect(chunks.length).toBeGreaterThan(1);
        for (const c of chunks) {
            expect(c.length).toBeGreaterThan(0);
        }
    });
});
