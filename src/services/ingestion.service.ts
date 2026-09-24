// EyraOS Chunked Knowledge Ingestion Pipeline
// Breaks massive texts into semantic chunks, extracts all facts without token clipping,
// and writes entities, relations, and procedures directly to PostgreSQL.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config/env';
import { MemoryEngine } from '../core/memory.engine';
import { EntityRepository } from '../db/repositories/entity.repo';
import { RelationRepository } from '../db/repositories/relation.repo';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY || 'MISSING_KEY');
const extractionModel = genAI.getGenerativeModel({
    model: CONFIG.GEMINI_MODEL,
    generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192
    }
});

export interface ChunkExtractionResult {
    entities: Array<{ name: string; type?: string; attributes?: Record<string, any> }>;
    relations: Array<{ from: string; relation: string; to: string; confidence?: number }>;
    procedures: Array<{
        name: string;
        triggerKeywords: string[];
        description: string;
        category?: string;
        steps: Array<{ stepNumber: number; title: string; instruction: string; expectedOutcome: string }>;
    }>;
}

export interface IngestionReport {
    chunksProcessed: number;
    totalEntitiesAdded: number;
    totalRelationsAdded: number;
    totalProceduresAdded: number;
    summary: string;
}

export class IngestionService {
    /**
     * Splits text into logical chunks by paragraph and sentence boundaries with slight overlap.
     */
    static chunkText(text: string, chunkSize: number = 2500, overlap: number = 200): string[] {
        if (!text || text.length <= chunkSize) {
            return [text];
        }

        const chunks: string[] = [];
        let startIndex = 0;

        while (startIndex < text.length) {
            let endIndex = startIndex + chunkSize;

            if (endIndex >= text.length) {
                chunks.push(text.substring(startIndex).trim());
                break;
            }

            // Look for a clean breakpoint: double newline, period, or comma
            const nextBreak = text.substring(endIndex - 100, endIndex + 100);
            const paragraphBreak = nextBreak.lastIndexOf('\n\n');
            const sentenceBreak = nextBreak.lastIndexOf('.\n') !== -1 ? nextBreak.lastIndexOf('.\n') : nextBreak.lastIndexOf('. ');
            const arabicSentenceBreak = nextBreak.lastIndexOf('۔ ') !== -1 ? nextBreak.lastIndexOf('۔ ') : nextBreak.lastIndexOf('، ');

            let chosenOffset = -1;
            if (paragraphBreak !== -1) chosenOffset = paragraphBreak + 2;
            else if (sentenceBreak !== -1) chosenOffset = sentenceBreak + 2;
            else if (arabicSentenceBreak !== -1) chosenOffset = arabicSentenceBreak + 2;

            if (chosenOffset !== -1) {
                endIndex = (endIndex - 100) + chosenOffset;
            }

            const chunk = text.substring(startIndex, endIndex).trim();
            if (chunk) chunks.push(chunk);

            startIndex = Math.max(endIndex - overlap, startIndex + 1);
        }

        return chunks;
    }

    /**
     * Extracts structured knowledge from an individual chunk.
     */
    static async extractFromChunk(chunk: string, chunkIndex: number, totalChunks: number): Promise<ChunkExtractionResult> {
        const prompt = `You are the Deep Knowledge Extraction Engine of EyraOS.
Your objective is to ingest the following text chunk (${chunkIndex + 1} of ${totalChunks}) and extract ALL significant entities, relationships, and sequential procedures into a structured knowledge graph format.

TEXT CHUNK:
"""
${chunk}
"""

Rules:
1. Extract ALL important entities (people, places, concepts, technologies, components, organizations, definitions).
2. Extract ALL clear directional relationships between entities with positive descriptive verbs (e.g. is_part_of, created_by, operates_at, consists_of, connected_to, requires).
3. If this chunk contains sequential instructions or how-to protocols, extract them into "procedures".
4. Output strictly valid JSON matching this schema:

{
  "entities": [
    { "name": "clean entity name", "type": "person|place|concept|technology|object|organization|other", "attributes": {} }
  ],
  "relations": [
    { "from": "entity name", "relation": "short_verb_relation", "to": "entity name", "confidence": 0.95 }
  ],
  "procedures": [
    {
      "name": "اسم الإجراء",
      "triggerKeywords": ["كلمة1", "كلمة2"],
      "description": "وصف",
      "category": "workflow|hardware_diagnostic|navigation_power|safety|general",
      "steps": [
        { "stepNumber": 1, "title": "عنوان", "instruction": "تعليمات", "expectedOutcome": "نتيجة" }
      ]
    }
  ]
}`;

        try {
            const res = await extractionModel.generateContent(prompt);
            let cleaned = res.response.text().trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
            cleaned = cleaned.trim();
            const parsed = JSON.parse(cleaned);

            return {
                entities: Array.isArray(parsed.entities) ? parsed.entities : [],
                relations: Array.isArray(parsed.relations) ? parsed.relations : [],
                procedures: Array.isArray(parsed.procedures) ? parsed.procedures : []
            };
        } catch (err: any) {
            console.error(`[Ingestion Service] Error in chunk ${chunkIndex + 1}:`, err.message);
            return { entities: [], relations: [], procedures: [] };
        }
    }

    /**
     * Executes the full chunked ingestion pipeline on large texts.
     */
    static async ingestDocument(fullText: string, onProgress?: (current: number, total: number) => void): Promise<IngestionReport> {
        console.log(`[Ingestion Pipeline] Starting ingestion for document of length ${fullText.length} characters...`);
        const chunks = this.chunkText(fullText);
        console.log(`[Ingestion Pipeline] Document partitioned into ${chunks.length} semantic chunks.`);

        let totalEntitiesAdded = 0;
        let totalRelationsAdded = 0;
        let totalProceduresAdded = 0;

        for (let i = 0; i < chunks.length; i++) {
            if (onProgress) onProgress(i + 1, chunks.length);
            console.log(`[Ingestion Pipeline] Processing chunk ${i + 1}/${chunks.length}...`);

            const extracted = await this.extractFromChunk(chunks[i], i, chunks.length);

            // 1. Commit entities
            for (const ent of extracted.entities) {
                if (ent.name && ent.name.trim()) {
                    await MemoryEngine.ensureEntity(ent.name, ent.type, ent.attributes);
                    totalEntitiesAdded++;
                }
            }

            // 2. Commit relations
            for (const rel of extracted.relations) {
                if (rel.from && rel.relation && rel.to) {
                    await MemoryEngine.addRelation(rel.from, rel.relation, rel.to, {
                        confidence: rel.confidence || 0.95,
                        source: 'document_ingestion',
                        type: 'fact'
                    });
                    totalRelationsAdded++;
                }
            }

            // 3. Commit procedures
            for (const proc of extracted.procedures) {
                if (proc.name && proc.steps && proc.steps.length > 0) {
                    await MemoryEngine.registerProcedure({
                        name: proc.name,
                        trigger_keywords: proc.triggerKeywords || [],
                        description: proc.description || '',
                        category: (proc.category as any) || 'workflow',
                        steps: proc.steps
                    });
                    totalProceduresAdded++;
                }
            }
        }

        // Add an episode recording this major milestone
        const summary = `تم استيعاب وتغذية مستند معرفي ضخم (${fullText.length} حرف، ${chunks.length} مقاطع)، وتسجيل ${totalEntitiesAdded} كيان و ${totalRelationsAdded} علاقة و ${totalProceduresAdded} إجراءات في الذاكرة المعرفية.`;
        await MemoryEngine.addEpisode(
            summary,
            ['User', 'EyraOS'],
            'consolidation',
            `Bulk ingestion of ${chunks.length} chunks`
        );

        return {
            chunksProcessed: chunks.length,
            totalEntitiesAdded,
            totalRelationsAdded,
            totalProceduresAdded,
            summary
        };
    }
}
