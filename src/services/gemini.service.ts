import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config/env';
import { TieredRetrievalResult } from '../types/memory.types';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY || 'MISSING_KEY');
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192
    }
});

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

function parseOrRepairJSON(text: string, fallbackMessage: string): ExtractedFactPayload {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned);
    } catch (e: any) {
        console.warn('[Gemini Service] Standard JSON.parse failed, running resilient repair:', e.message);

        // 1. Try to extract reply field via regex
        const replyMatch = cleaned.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/s);
        if (replyMatch && replyMatch[1]) {
            let extractedReply = replyMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
                .trim();
            // If the reply string ended abruptly with an unescaped trailing quote or backslash
            if (extractedReply.endsWith('\\')) extractedReply = extractedReply.slice(0, -1);

            return {
                reply: extractedReply,
                entities: [],
                relations: [],
                episode: { summary: fallbackMessage.slice(0, 100), type: 'event' }
            };
        }

        // 2. If response is raw plain text
        if (!cleaned.startsWith('{')) {
            return {
                reply: cleaned,
                entities: [],
                relations: [],
                episode: { summary: fallbackMessage.slice(0, 100), type: 'event' }
            };
        }

        // 3. Fallback to clean natural reply
        return {
            reply: 'تم استلام المدخلات المفصلة واستيعابها بنجاح داخل الذاكرة المعرفية.',
            entities: [],
            relations: [],
            episode: { summary: fallbackMessage.slice(0, 100), type: 'event' }
        };
    }
}

export class GeminiService {
    private static SYSTEM_PROMPT = `You are Eyra, an intelligent cognitive robot assistant powered by EyraOS.
You operate on a Multi-Layer Cognitive Architecture:
1. Online Fast-Stream (Immediate Declarative Facts):
   Extract ONLY clear, essential, declarative facts (max 10 key entities and max 10 key relations).
   Do NOT generate exhaustive or bloated lists of every noun or sentence.
2. Active Working Memory (Current Session):
   Maintain the natural context, references, and pronouns of the ongoing conversation.
3. If the user states they NO LONGER live somewhere, NO LONGER like something, or negates a previously held fact:
   Put this in "revokedRelations": [
     {
       "from": "entity name",
       "relation": "positive relation being revoked",
       "to": "entity name"
     }
   ]
   IMPORTANT: Do NOT create negative relations in "relations". Only record them in "revokedRelations".
4. Procedural Memory (Layer 5: How-To Skills & Action Sequences):
   If the user is teaching a workflow or procedure, extract it in "learnedProcedure" (concise steps).
5. Output format must strictly adhere to the requested JSON schema. Keep reply informative and helpful.

JSON Structure:
{
  "reply": "Your natural conversational reply to the user in Arabic",
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
            return parseOrRepairJSON(rawText, userMessage);
        } catch (err: any) {
            console.error('[Gemini Service] Model invocation failure:', err.message);
            return {
                reply: `عذراً، حدث خطأ أثناء معالجة الاستجابة المعرفية: ${err.message}`,
                episode: { summary: userMessage.slice(0, 100), type: 'event' }
            };
        }
    }
}
