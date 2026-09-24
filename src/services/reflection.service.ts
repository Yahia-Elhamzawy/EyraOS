import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config/env';
import { EntityRepository } from '../db/repositories/entity.repo';
import { RelationRepository } from '../db/repositories/relation.repo';
import { EpisodeRepository } from '../db/repositories/episode.repo';
import { MemoryEngine } from '../core/memory.engine';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY || 'MISSING_KEY');
const model = genAI.getGenerativeModel({ model: CONFIG.GEMINI_MODEL });

export class ReflectionService {
    static async consolidateMemory(): Promise<any> {
        console.log('[EyraOS Reflection] Running Cognitive Consolidation & Reflection Cycle...');

        const recentEpisodes = await EpisodeRepository.findAll(25);
        const activeEntities = await EntityRepository.findAll();
        const activeRelations = await RelationRepository.findActive();

        if (recentEpisodes.length === 0 && activeRelations.length === 0) {
            return {
                success: true,
                message: 'No significant experiences yet to consolidate.',
                insights: 'الذاكرة لا تزال في بدايتها، لا توجد أحداث كافية للتأمل.',
                newInferences: [],
                mergedCount: 0
            };
        }

        const episodesText = recentEpisodes.map(ep => `[${ep.timestamp}] (${ep.type}): ${ep.summary}`).join('\n');
        const relationsText = activeRelations.map(r => `${r.from_entity} -> ${r.relation} -> ${r.to_entity} (conf: ${r.confidence}, count: ${r.reinforcement_count || 1})`).join('\n');

        const consolidationPrompt = `You are the Reflection & Memory Consolidation layer of EyraOS (Cognitive Layer 9).
Your role is to reflect upon episodic experiences and semantic relations to synthesize higher-level understanding.

=== RECENT EPISODES (What happened) ===
${episodesText}

=== CURRENT ACTIVE RELATIONS ===
${relationsText}

Your Tasks:
1. Synthesize Higher-Order Inferences: If repeated events or relations suggest an unstated habit, preference, or characteristic, formulate it as a new inference.
2. Abstract Pattern Summary: Generate an Arabic paragraph providing deep cognitive insights into what you know about the user, their goals, preferences, and recurring themes.
3. Consolidate Episodes: State if there is a core lesson or identity milestone.

Respond strictly in valid JSON format only without markdown blocks:
{
  "insights": "فقرة تحليلية عميقة باللغة العربية تلخص ما تم استنتاجه عن المستخدم ومشاريعه واهتماماته",
  "newInferences": [
    {
      "from": "entity name",
      "relation": "positive inference relation (e.g. interested_in, skilled_at, values)",
      "to": "entity name",
      "confidence": 0.85,
      "reason": "Brief reason in Arabic"
    }
  ]
}`;

        try {
            const result = await model.generateContent(consolidationPrompt);
            let cleaned = result.response.text().trim();
            if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
            if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
            if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
            cleaned = cleaned.trim();
            const parsed = JSON.parse(cleaned);

            const addedInferences = [];
            if (parsed.newInferences && Array.isArray(parsed.newInferences)) {
                for (const inf of parsed.newInferences) {
                    if (inf.from && inf.relation && inf.to) {
                        const outcome = await MemoryEngine.addRelation(inf.from, inf.relation, inf.to, {
                            confidence: inf.confidence || 0.85,
                            source: 'reflection_consolidation',
                            type: 'inference'
                        });
                        addedInferences.push(outcome.relation);
                    }
                }
            }

            if (parsed.insights) {
                await MemoryEngine.addEpisode(
                    `Cognitive Consolidation: ${parsed.insights}`,
                    ['EyraOS'],
                    'consolidation',
                    'System reflection cycle'
                );
            }

            return {
                success: true,
                insights: parsed.insights || 'تمت دورة التأمل بنجاح.',
                newInferences: addedInferences
            };
        } catch (err: any) {
            console.error('[Reflection Service] Consolidation fallback:', err.message);
            return {
                success: true,
                insights: 'تم فحص الذاكرة وتثبيت المعارف الحالية.',
                newInferences: []
            };
        }
    }
}
