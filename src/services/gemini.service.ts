import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config/env';
import { TieredRetrievalResult } from '../types/memory.types';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY || 'MISSING_KEY');
// Using gemini-2.5-flash or gemini-1.5-flash
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export interface ExtractedFactPayload {
    reply: string;
    entities?: Array<{ name: string; type?: string; attributes?: Record<string, any> }>;
    relations?: Array<{ from: string; relation: string; to: string; confidence?: number; source?: string }>;
    revokedRelations?: Array<{ from: string; relation: string; to: string }>;
    learnedProcedure?: {
        name: string;
        triggerKeywords: string[];
        description: string;
        category?: string;
        steps: Array<{ stepNumber: number; title: string; instruction: string; expectedOutcome: string }>;
    } | null;
    proceduralExecution?: {
        procedureId?: string;
        procedureName: string;
        status: string;
        executedSteps: Array<{ stepNumber: number; title: string; status: string }>;
    } | null;
    episode?: {
        summary: string;
        type: string;
    };
}

export class GeminiService {
    private static SYSTEM_PROMPT = `You are Eyra, an intelligent cognitive robot assistant powered by EyraOS.
You operate on a Multi-Layer Cognitive Architecture:
1. Online Fast-Stream (Immediate Declarative Facts):
   Extract ONLY clear, explicit, declarative facts directly stated by the user (such as name, city of residence, profession, declared likes/dislikes, or explicit objects).
   Do NOT extract casual chatter, temporary greetings, or transient conversational filler into 'entities' or 'relations'.
2. Active Working Memory (Current Session):
   Maintain the natural context, references, and pronouns of the ongoing conversation.
3. If the user states they NO LONGER live somewhere, NO LONGER like something, or negates a previously held fact:
   Put this in "revokedRelations": [
     {
       "from": "entity name",
       "relation": "positive relation being revoked (e.g. lives_in, likes, works_at)",
       "to": "entity name"
     }
   ]
   IMPORTANT: Do NOT create negative relations (such as does_not_live_in or not_in) in "relations". Only record them in "revokedRelations".
4. Procedural Memory (Layer 5: How-To Skills & Action Sequences):
   - If the user is teaching you a workflow, how-to procedure, or sequential protocol:
     Extract it in "learnedProcedure":
     {
       "name": "اسم الإجراء أو المهارة بالعربية",
       "triggerKeywords": ["كلمات", "مفتاحية"],
       "description": "وصف مقتضب للهدف من الإجراء",
       "category": "workflow|diagnostic|navigation|safety|general",
       "steps": [
         { "stepNumber": 1, "title": "عنوان الخطوة", "instruction": "ماذا تفعل بالضبط", "expectedOutcome": "النتيجة المتوقعة" }
       ]
     }
   - If the user asks you to RUN, EXECUTE, SIMULATE, or EXPLAIN a procedure:
     Respond explaining what will be done and include "proceduralExecution".
5. Classify each interaction as an episode.

IMPORTANT: Respond strictly in valid JSON format only without markdown code blocks.

JSON Structure:
{
  "reply": "Your natural conversational reply to the user",
  "entities": [
    { "name": "clean entity name", "type": "person|place|food|object|concept|organization|technology|other", "attributes": {} }
  ],
  "relations": [
    { "from": "entity name", "relation": "short positive verb relation", "to": "entity name", "confidence": 0.9, "source": "direct_statement" }
  ],
  "revokedRelations": [
    { "from": "entity name", "relation": "lives_in|likes|works_at", "to": "entity name" }
  ],
  "learnedProcedure": null,
  "proceduralExecution": null,
  "episode": { "summary": "Brief summary of interaction", "type": "fact|inference|event|question" }
}`;

    static async generateResponse(
        userMessage: string,
        retrieval: TieredRetrievalResult,
        dialogHistory: Array<{ role: string; content: string }>
    ): Promise<ExtractedFactPayload> {
        if (!CONFIG.GEMINI_API_KEY) {
            return {
                reply: 'نظام الذاكرة المعرفية متصل بقاعدة بيانات بوستجريس بنجاح، يرجى تزويد مفتاح Gemini API في .env لتوليد الحوار المتقدم.',
                episode: { summary: userMessage, type: 'event' }
            };
        }

        const subgraphEntitiesText = retrieval.subgraph.entities
            .map(e => `- ${e.name} (${e.type}): ${JSON.stringify(e.attributes)}`)
            .join('\n');

        const subgraphRelationsText = retrieval.subgraph.relations
            .map(r => `- ${r.from_entity} --[${r.relation}]--> ${r.to_entity} (${r.status})`)
            .join('\n');

        const episodesText = retrieval.relevantEpisodes
            .map(ep => `- [${ep.type}] ${ep.summary}`)
            .join('\n');

        const proceduresText = retrieval.triggeredProcedures
            .map(p => `- [${p.category}] ${p.name}: ${p.description} (${p.steps.length} steps)`)
            .join('\n');

        const contextText = `=== RETRIEVED SEMANTIC SUBGRAPH ===
Entities:
${subgraphEntitiesText || 'No direct entities matched.'}

Active Relations:
${subgraphRelationsText || 'No direct relations matched.'}

=== RECENT EPISODES ===
${episodesText || 'No recent episodes found.'}

=== MATCHED PROCEDURES ===
${proceduresText || 'No procedures triggered.'}`;

        const recentHistory = dialogHistory.slice(-8).map(msg =>
            `${msg.role}: ${msg.content}`
        ).join('\n');

        const fullPrompt = `${this.SYSTEM_PROMPT}

${contextText}

=== WORKING MEMORY (Active Session Dialog) ===
${recentHistory || 'No previous conversation in current session working memory.'}

=== USER MESSAGE ===
${userMessage}

Respond with valid JSON only:`;

        try {
            const result = await model.generateContent(fullPrompt);
            const rawText = result.response.text();
            let cleaned = rawText.trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
            cleaned = cleaned.trim();
            return JSON.parse(cleaned);
        } catch (err: any) {
            console.error('[Gemini Service] Error or parse failure:', err.message);
            return {
                reply: `عذراً، حدث خطأ أثناء معالجة الاستجابة المعرفية: ${err.message}`,
                episode: { summary: userMessage, type: 'event' }
            };
        }
    }
}
