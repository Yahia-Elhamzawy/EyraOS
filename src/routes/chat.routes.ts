import { Router, Request, Response } from 'express';
import { RetrievalEngine } from '../core/retrieval';
import { GeminiService } from '../services/gemini.service';
import { MemoryEngine } from '../core/memory.engine';
import { SessionManager } from '../core/session.manager';
import { EntityRepository } from '../db/repositories/entity.repo';
import { RelationRepository } from '../db/repositories/relation.repo';
import { ProcedureRepository } from '../db/repositories/procedure.repo';
import { IngestionService } from '../services/ingestion.service';

export const chatRouter = Router();

chatRouter.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const session = await SessionManager.getActiveSession();
        const history = (session.turns || []).map(t => ({ role: t.role, content: t.content }));

        // Check if message is a massive document / knowledge dump (> 2000 chars)
        if (message.length > 2000) {
            console.log(`[Chat Route] Massive knowledge input detected (${message.length} chars). Invoking Bulk Ingestion Pipeline...`);
            const report = await IngestionService.ingestDocument(message);
            const reply = `تم تفعيل **محرك الاستيعاب المعرفي المتدفق (Bulk Ingestion Engine)** بنجاح!

تم تقسيم الوثيقة المعرفية إلى **${report.chunksProcessed} مقاطع دلالية**، وتم استخراج وتسجيل:
• **${report.totalEntitiesAdded}** كيان معرفي في قاعدة البيانات.
• **${report.totalRelationsAdded}** علاقة وشبكة عصبية مترابطة.
• **${report.totalProceduresAdded}** إجراء وبروتوكول تنفيذي.

أصبحت كافة هذه المعارف راسخة الآن في الـ Knowledge Graph ويمكنك استعراضها مباشرة على الشاشة أو سؤالي عن أي تفصيل فيها!`;

            await SessionManager.addExchange(message.slice(0, 150) + '... [وثيقة معرفية ضخمة]', reply);

            const allEntities = await EntityRepository.findAll();
            const allRelations = await RelationRepository.findAll();

            return res.json({
                reply,
                telemetry: {
                    retrievedEntitiesCount: allEntities.length,
                    totalEntities: allEntities.length,
                    retrievedRelationsCount: allRelations.length,
                    totalRelations: allRelations.length,
                    retrievalPercentage: 100,
                    retrievedEntitiesList: allEntities.slice(0, 15).map(e => e.name),
                    supersededCount: 0
                },
                graph: {
                    entities: allEntities,
                    relations: allRelations
                },
                memoryAdded: {
                    entities: allEntities.slice(-report.totalEntitiesAdded),
                    relations: allRelations.slice(-report.totalRelationsAdded),
                    learnedProcedure: null
                }
            });
        }

        // 1. Multi-Tier Selective Retrieval
        const retrieval = await RetrievalEngine.retrieve(message, session.working_memory || {});

        // 2. AI Inference & Fact Extraction
        const extracted = await GeminiService.generateResponse(message, retrieval, history);

        // 3. Commit Extracted Entities
        const addedEntities = [];
        if (extracted.entities && Array.isArray(extracted.entities)) {
            for (const ent of extracted.entities) {
                if (ent.name) {
                    const e = await MemoryEngine.ensureEntity(ent.name, ent.type, ent.attributes);
                    addedEntities.push(e);
                }
            }
        }

        // 4. Commit Extracted Relations & Resolve Conflicts
        const addedRelations = [];
        let supersededRelationsCount = 0;
        if (extracted.relations && Array.isArray(extracted.relations)) {
            for (const rel of extracted.relations) {
                if (rel.from && rel.relation && rel.to) {
                    const outcome = await MemoryEngine.addRelation(rel.from, rel.relation, rel.to, {
                        confidence: rel.confidence || 0.9,
                        source: rel.source || 'direct_statement',
                        type: 'fact'
                    });
                    addedRelations.push(outcome.relation);
                    supersededRelationsCount += outcome.supersededCount;
                }
            }
        }

        // 5. Commit Revoked Relations
        if (extracted.revokedRelations && Array.isArray(extracted.revokedRelations)) {
            const allActive = await RelationRepository.findActive();
            for (const rev of extracted.revokedRelations) {
                for (const r of allActive) {
                    if (
                        r.from_entity.toLowerCase().includes(rev.from.toLowerCase()) &&
                        r.relation.toLowerCase().includes(rev.relation.toLowerCase()) &&
                        r.to_entity.toLowerCase().includes(rev.to.toLowerCase())
                    ) {
                        await RelationRepository.supersede(r.id, 'Revoked by user statement');
                        supersededRelationsCount++;
                    }
                }
            }
        }

        // 6. Commit Learned Procedures
        let learnedProc = null;
        if (extracted.learnedProcedure && extracted.learnedProcedure.name) {
            learnedProc = await MemoryEngine.registerProcedure({
                name: extracted.learnedProcedure.name,
                trigger_keywords: extracted.learnedProcedure.triggerKeywords || [],
                description: extracted.learnedProcedure.description || '',
                category: (extracted.learnedProcedure.category as any) || 'workflow',
                steps: extracted.learnedProcedure.steps || []
            });
        }

        // 7. Commit Episode
        const episodeSummary = extracted.episode ? extracted.episode.summary : message;
        await MemoryEngine.addEpisode(
            episodeSummary,
            addedEntities.map(e => e.name),
            (extracted.episode?.type as any) || 'event',
            message
        );

        // 8. Update Session Working Memory
        await SessionManager.addExchange(message, extracted.reply);

        // 9. Full graph and telemetry for visual feedback
        const allEntities = await EntityRepository.findAll();
        const allRelations = await RelationRepository.findAll();

        const telemetry = {
            retrievedEntitiesCount: retrieval.subgraph.entities.length,
            totalEntities: allEntities.length,
            retrievedRelationsCount: retrieval.subgraph.relations.length,
            totalRelations: allRelations.length,
            retrievalPercentage: Math.round((retrieval.subgraph.entities.length / (allEntities.length || 1)) * 100),
            retrievedEntitiesList: retrieval.subgraph.entities.map(e => e.name),
            supersededCount: supersededRelationsCount
        };

        res.json({
            reply: extracted.reply,
            telemetry,
            graph: {
                entities: allEntities,
                relations: allRelations
            },
            memoryAdded: {
                entities: addedEntities,
                relations: addedRelations,
                learnedProcedure: learnedProc
            }
        });
    } catch (err: any) {
        console.error('[Chat Route Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
});

chatRouter.get('/session', async (req: Request, res: Response) => {
    try {
        const session = await SessionManager.getActiveSession();
        const turnsCount = (session.turns || []).length;
        const SESSION_TIMEOUT_SEC = 15 * 60; // 15 minutes

        let remainingSeconds = SESSION_TIMEOUT_SEC;
        if (turnsCount > 0) {
            const elapsedMs = Date.now() - new Date(session.last_activity).getTime();
            remainingSeconds = Math.max(0, SESSION_TIMEOUT_SEC - Math.floor(elapsedMs / 1000));
        }

        res.json({
            sessionId: session.id,
            status: session.status,
            startedAt: session.started_at,
            lastActivity: session.last_activity,
            workingMemoryCount: turnsCount,
            remainingSeconds
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

chatRouter.post('/session/timeout', async (req: Request, res: Response) => {
    try {
        const result = await SessionManager.flushSession('manual_simulation');
        const newSession = await SessionManager.getActiveSession();
        res.json({
            consolidated: true,
            flushedSessionId: result.sessionId,
            turnsCount: result.turnsCount,
            newSessionId: newSession.id
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
