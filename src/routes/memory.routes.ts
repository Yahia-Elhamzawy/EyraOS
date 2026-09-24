import { Router, Request, Response } from 'express';
import { EntityRepository } from '../db/repositories/entity.repo';
import { RelationRepository } from '../db/repositories/relation.repo';
import { EpisodeRepository } from '../db/repositories/episode.repo';
import { ProcedureRepository } from '../db/repositories/procedure.repo';
import { MemoryEngine } from '../core/memory.engine';
import { ReflectionService } from '../services/reflection.service';
import { query } from '../db/connection';
import { IngestionService } from '../services/ingestion.service';

export const memoryRouter = Router();

// Full graph for visual representation
memoryRouter.get('/memory', async (req: Request, res: Response) => {
    try {
        const entities = await EntityRepository.findAll();
        const relations = await RelationRepository.findAll();
        res.json({ entities, relations });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Memory statistics
memoryRouter.get('/memory/stats', async (req: Request, res: Response) => {
    try {
        const entities = await EntityRepository.findAll();
        const relations = await RelationRepository.findAll();
        const episodes = await EpisodeRepository.findAll(100);
        const procedures = await ProcedureRepository.findAll();

        const activeEntities = entities.filter(e => e.status === 'active');
        const activeRelations = relations.filter(r => r.status === 'active');
        const supersededRelations = relations.filter(r => r.status === 'superseded');

        res.json({
            totalEntities: entities.length,
            activeEntities: activeEntities.length,
            totalRelations: relations.length,
            activeRelations: activeRelations.length,
            supersededRelations: supersededRelations.length,
            totalEpisodes: episodes.length,
            totalProcedures: procedures.length,
            entityTypes: [...new Set(entities.map(e => e.type))],
            lastUpdated: new Date().toISOString()
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Clear all memory
memoryRouter.delete('/memory', async (req: Request, res: Response) => {
    try {
        await query('TRUNCATE entities, relations, episodes, procedures, sessions CASCADE;');
        res.json({ success: true, message: 'Memory cleared in PostgreSQL' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete specific entity and its relations
memoryRouter.delete('/memory/entity/:name', async (req: Request, res: Response) => {
    try {
        const rawName = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
        const entityName = decodeURIComponent(rawName || '');
        const entity = await EntityRepository.findByName(entityName);
        if (entity) {
            await EntityRepository.delete(entity.id);
            await query('DELETE FROM relations WHERE LOWER(TRIM(from_entity)) = LOWER(TRIM($1)) OR LOWER(TRIM(to_entity)) = LOWER(TRIM($1))', [entityName]);
        }
        const entities = await EntityRepository.findAll();
        const relations = await RelationRepository.findAll();
        res.json({ success: true, entityName, graph: { entities, relations } });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete specific relation
memoryRouter.delete('/memory/relation/:id', async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        await RelationRepository.delete(id);
        const entities = await EntityRepository.findAll();
        const relations = await RelationRepository.findAll();
        res.json({ success: true, relationId: id, graph: { entities, relations } });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Procedures (Layer 5)
memoryRouter.get('/memory/procedures', async (req: Request, res: Response) => {
    try {
        const procedures = await ProcedureRepository.findAll();
        res.json(procedures);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

memoryRouter.post('/memory/procedure', async (req: Request, res: Response) => {
    try {
        const proc = await MemoryEngine.registerProcedure(req.body);
        res.json({ success: true, procedure: proc });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

memoryRouter.delete('/memory/procedure/:id', async (req: Request, res: Response) => {
    try {
        await query('DELETE FROM procedures WHERE id = $1', [String(req.params.id)]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

memoryRouter.post('/memory/procedure/:id/execute', async (req: Request, res: Response) => {
    try {
        const proc = await ProcedureRepository.incrementExecution(String(req.params.id));
        if (proc) {
            await MemoryEngine.addEpisode(
                `تنفيذ إجرائي: تم تشغيل بروتوكول "${proc.name}" بنجاح (${proc.steps.length} خطوات)`,
                ['EyraOS'],
                'procedure_execution',
                `Execution of ${proc.id}`
            );
        }
        res.json({ success: true, procedure: proc });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Reflection & Consolidation
memoryRouter.post('/memory/consolidate', async (req: Request, res: Response) => {
    try {
        const result = await ReflectionService.consolidateMemory();
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk Document / Knowledge Ingestion
memoryRouter.post('/memory/ingest', async (req: Request, res: Response) => {
    try {
        const { text, content } = req.body;
        const targetText = text || content;
        if (!targetText || !targetText.trim()) {
            return res.status(400).json({ error: 'Text or content is required for knowledge ingestion' });
        }

        const report = await IngestionService.ingestDocument(targetText);
        const entities = await EntityRepository.findAll();
        const relations = await RelationRepository.findAll();

        res.json({
            success: true,
            report,
            graph: { entities, relations }
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
